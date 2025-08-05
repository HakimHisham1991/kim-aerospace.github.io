console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { CANVAS_CONFIG } from './canvasConfig.js';
import { drawArrow } from './canvasUtils.js';
import { calculateArcCenter } from './arcGeometry.js';

/**
 * Renders individual G-code paths on the canvas
 * @module toolpathDynamicRenderer
 */

/**
 * Draws a single G-code path (line or arc) on the canvas
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {Object} path - The path object containing G-code details
 * @param {number} scale - Current zoom scale
 * @param {number} offsetX - X offset for canvas transformation
 * @param {number} offsetY - Y offset for canvas transformation
 * @param {number} canvasSize - The canvas size (width/height)
 * @param {boolean} isMobile - Whether the device is mobile
 * @param {boolean} showArrows - Whether to show direction arrows
 * @param {HTMLElement} warningsDiv - DOM element for warning messages
 * @param {Set} warningLines - Set of line numbers with warnings
 * @param {number} [progress=1] - Progress of the path animation (0 to 1)
 * @returns {Object} Result object with isInvalid and path coordinates
 */
export function drawPath(ctx, path, scale, offsetX, offsetY, canvasSize, isMobile, showArrows, warningsDiv, warningLines, progress = 1) {
  if (!path.isValid || path.mCode || (path.mode !== 'G00' && path.mode !== 'G01' && path.mode !== 'G02' && path.mode !== 'G03')) {
    console.debug(`Skipping path at line ${path.lineNumber + 1}: mode=${path.mode}, mCode=${path.mCode || 'none'}, gcodeFeedMode=${path.gCodes?.feedMode || 'none'}, isValid=${path.isValid}`);
    if (!path.isValid && warningsDiv && !warningLines.has(path.lineNumber)) {
      warningsDiv.textContent += `Error: Invalid path at line ${path.lineNumber + 1}: Unrecognized or unsupported G-code '${path.mode || 'unknown'}'. Skipping.\n`;
      warningsDiv.classList.add('error');
      warningLines.add(path.lineNumber);
    }
    return { isInvalid: !path.isValid, startX: path.startX, startY: path.startY, endX: path.endX, endY: path.endY, lineNumber: path.lineNumber };
  }

  const startX = path.startX * scale + offsetX;
  const startY = -((path.startY * scale) + offsetY) + canvasSize;
  const endX = path.endX * scale + offsetX;
  const endY = -((path.endY * scale) + offsetY) + canvasSize;

  if (isNaN(startX) || isNaN(startY) || isNaN(endX) || isNaN(endY)) {
    console.debug(`Path at line ${path.lineNumber + 1}: Skipping due to invalid canvas coordinates: start=(${startX}, ${startY}), end=(${endX}, ${endY})`);
    if (warningsDiv && !warningLines.has(path.lineNumber)) {
      warningsDiv.textContent += `Error: Invalid coordinates at line ${path.lineNumber + 1}: start=(${path.startX.toFixed(2)}, ${path.startY.toFixed(2)}), end=(${path.endX.toFixed(2)}, ${path.endY.toFixed(2)}). Skipping.\n`;
      warningsDiv.classList.add('error');
      warningLines.add(path.lineNumber);
    }
    return { isInvalid: true, startX: path.startX, startY: path.startY, endX: path.endX, endY: path.endY, lineNumber: path.lineNumber };
  }

  ctx.beginPath();
  ctx.setLineDash([]);

  if (path.mode === 'G00' || path.mode === 'G01') {
    const currentEndX = startX + (endX - startX) * progress;
    const currentEndY = startY + (endY - startY) * progress;

    ctx.moveTo(startX, startY);
    ctx.lineTo(currentEndX, currentEndY);
    ctx.strokeStyle = path.mode === 'G00' ? CANVAS_CONFIG.COLORS.RAPID : CANVAS_CONFIG.COLORS.LINEAR;
    ctx.setLineDash(path.mode === 'G00' ? [5, 5] : []);
    ctx.stroke();

    if (showArrows) {
      const dxCanvas = endX - startX;
      const dyCanvas = endY - startY;
      const canvasLength = Math.hypot(dxCanvas, dyCanvas);
      const arrowSpacingPx = isMobile ? CANVAS_CONFIG.ARROW_SPACING_PX.mobile : CANVAS_CONFIG.ARROW_SPACING_PX.desktop;
      const numArrows = Math.max(1, Math.min(10, Math.floor(canvasLength / arrowSpacingPx)));
      const tipLenPx = isMobile ? CANVAS_CONFIG.ARROW_LENGTH.mobile : CANVAS_CONFIG.ARROW_LENGTH.desktop;

      const ux = canvasLength > 0 ? dxCanvas / canvasLength : 0;
      const uy = canvasLength > 0 ? dyCanvas / canvasLength : 0;

      for (let j = 0; j < numArrows; j++) {
        const t = numArrows > 1 ? j / (numArrows - 1) : 0.5;
        if (t <= progress || progress >= 1) {
          const arrowX = startX + t * dxCanvas;
          const arrowY = startY + t * dyCanvas;
          drawArrow(
            ctx,
            arrowX,
            arrowY,
            arrowX + ux * tipLenPx,
            arrowY + uy * tipLenPx,
            path.mode === 'G00' ? CANVAS_CONFIG.COLORS.RAPID : CANVAS_CONFIG.COLORS.LINEAR
          );
        }
      }
    }
    return { isInvalid: false };
  } else if (path.mode === 'G02' || path.mode === 'G03') {
    let centerX, centerY, radius;
    let isFullCircle = Math.abs(path.startX - path.endX) < 0.001 && Math.abs(path.startY - path.endY) < 0.001;

    if (path.r !== null) {
      radius = Math.abs(path.r);
      if (radius < 0.001) {
        console.debug(`Path at line ${path.lineNumber + 1}: Zero radius arc detected (R)`);
        if (warningsDiv && !warningLines.has(path.lineNumber)) {
          warningsDiv.textContent += `Error: Zero radius arc at line ${path.lineNumber + 1}: R=${path.r}. Skipping.\n`;
          warningsDiv.classList.add('error');
          warningLines.add(path.lineNumber);
        }
        return { isInvalid: true, startX: path.startX, startY: path.startY, endX: path.endX, endY: path.endY, lineNumber: path.lineNumber };
      }
      const center = calculateArcCenter(path.startX, path.startY, path.endX, path.endY, path.r, path.mode);
      if (!center) {
        console.debug(`Path at line ${path.lineNumber + 1}: Invalid arc center`);
        if (warningsDiv && !warningLines.has(path.lineNumber)) {
          warningsDiv.textContent += `Error: Invalid arc center at line ${path.lineNumber + 1}: Cannot compute center for arc. Skipping.\n`;
          warningsDiv.classList.add('error');
          warningLines.add(path.lineNumber);
        }
        return { isInvalid: true, startX: path.startX, startY: path.startY, endX: path.endX, endY: path.endY, lineNumber: path.lineNumber };
      }
      [centerX, centerY] = center;
    } else {
      centerX = path.startX + (path.i || 0);
      centerY = path.startY + (path.j || 0);
      radius = Math.sqrt((path.i || 0) ** 2 + (path.j || 0) ** 2);
      if (radius < 0.001) {
        console.debug(`Path at line ${path.lineNumber + 1}: Zero radius arc detected (I/J)`);
        if (warningsDiv && !warningLines.has(path.lineNumber)) {
          warningsDiv.textContent += `Error: Zero radius arc at line ${path.lineNumber + 1}: I=${path.i || 0}, J=${path.j || 0}. Skipping.\n`;
          warningsDiv.classList.add('error');
          warningLines.add(path.lineNumber);
        }
        return { isInvalid: true, startX: path.startX, startY: path.startY, endX: path.endX, endY: path.endY, lineNumber: path.lineNumber };
      }
    }

    const canvasCenterX = centerX * scale + offsetX;
    const canvasCenterY = -((centerY * scale) + offsetY) + canvasSize;
    let startAngle = Math.atan2(path.startY - centerY, path.startX - centerX);
    startAngle = (startAngle + 2 * Math.PI) % (2 * Math.PI);
    let endAngle = isFullCircle
      ? startAngle + (path.mode === 'G02' ? -2 * Math.PI : 2 * Math.PI)
      : Math.atan2(path.endY - centerY, path.endX - centerX);
    endAngle = (endAngle + 2 * Math.PI) % (2 * Math.PI);

    if (!isFullCircle) {
      if (path.mode === 'G02' && endAngle > startAngle) endAngle -= 2 * Math.PI;
      else if (path.mode === 'G03' && endAngle < startAngle) endAngle += 2 * Math.PI;
    }

    const angleDiff = isFullCircle
      ? (path.mode === 'G02' ? -2 * Math.PI : 2 * Math.PI)
      : endAngle - startAngle;
    const currentEndAngle = startAngle + angleDiff * progress;

    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.arc(
      canvasCenterX,
      canvasCenterY,
      radius * scale,
      -startAngle,
      -currentEndAngle,
      path.mode === 'G03'
    );
    ctx.strokeStyle = CANVAS_CONFIG.COLORS.ARC;
    ctx.stroke();

    if (showArrows) {
      const arrowSpacing = (isMobile ? CANVAS_CONFIG.ARROW_SPACING_PX.mobile : CANVAS_CONFIG.ARROW_SPACING_PX.desktop) / (radius * scale);
      const numArrows = Math.max(1, Math.floor(Math.abs(angleDiff) / arrowSpacing));
      const arrowLength = (isMobile ? CANVAS_CONFIG.ARROW_LENGTH.mobile : CANVAS_CONFIG.ARROW_LENGTH.desktop) / scale;

      for (let j = 0; j < numArrows; j++) {
        const t = numArrows > 1 ? j / (numArrows - 1) : 0.5;
        if (t <= progress || progress >= 1) {
          const currentAngle = startAngle + angleDiff * t;
          const arrowX = centerX + radius * Math.cos(currentAngle);
          const arrowY = centerY + radius * Math.sin(currentAngle);
          let tangentX, tangentY;
          if (path.mode === 'G02') {
            tangentX = Math.sin(currentAngle);
            tangentY = -Math.cos(currentAngle);
          } else {
            tangentX = -Math.sin(currentAngle);
            tangentY = Math.cos(currentAngle);
          }

          const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
          if (tangentLength > 0) {
            tangentX /= tangentLength;
            tangentY /= tangentLength;
          }

          const baseX = arrowX;
          const baseY = arrowY;
          const tipX = arrowX + tangentX * arrowLength;
          const tipY = arrowY + tangentY * arrowLength;

          const canvasBaseX = baseX * scale + offsetX;
          const canvasBaseY = -((baseY * scale) + offsetY) + canvasSize;
          const canvasTipX = tipX * scale + offsetX;
          const canvasTipY = -((tipY * scale) + offsetY) + canvasSize;

          drawArrow(ctx, canvasBaseX, canvasBaseY, canvasTipX, canvasTipY, CANVAS_CONFIG.COLORS.ARC);
        }
      }
    }
    return { isInvalid: false };
  }
  return { isInvalid: false };
}