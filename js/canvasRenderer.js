console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { calculateArcCenter } from './gcodeParser.js';
import { CANVAS_CONFIG } from './canvasConfig.js';
import { configureCanvas, drawArrow } from './canvasUtils.js';

/**
 * Handles canvas bounds and rendering
 * @module canvasRenderer
 */

export let currentBounds = { ...CANVAS_CONFIG.DEFAULT_BOUNDS };

/**
 * Sets new canvas bounds
 * @param {Object} newBounds - New bounds {minX, maxX, minY, maxY}
 */
export function setBounds(newBounds) {
  currentBounds = { ...newBounds };
  console.debug(`New bounds set: ${JSON.stringify(currentBounds)}`);
}

/**
 * Calculates bounds to fit the toolpath
 * @param {number} minX - Minimum X coordinate
 * @param {number} maxX - Maximum X coordinate
 * @param {number} minY - Minimum Y coordinate
 * @param {number} maxY - Maximum Y coordinate
 * @param {number} aspectRatio - Canvas aspect ratio
 * @returns {Object} Calculated bounds
 */
export function calculateFitBounds(minX, maxX, minY, maxY, aspectRatio) {
  const xRange = maxX - minX;
  const yRange = maxY - minY;
  const minRange = 0.01;
  const paddingFactor = 0.1;
  const xPadding = Math.max(xRange * paddingFactor, minRange);
  const yPadding = Math.max(yRange * paddingFactor, minRange);

  const centerX = (maxX + minX) / 2;
  const centerY = (maxY + minY) / 2;
  let bounds = {
    minX: centerX - (xRange / 2 + xPadding),
    maxX: centerX + (xRange / 2 + xPadding),
    minY: centerY - (yRange / 2 + yPadding),
    maxY: centerY + (yRange / 2 + yPadding)
  };

  const boundsAspect = (bounds.maxX - bounds.minX) / (bounds.maxY - bounds.minY);
  if (boundsAspect > aspectRatio) {
    const newYRange = (bounds.maxX - bounds.minX) / aspectRatio;
    bounds.minY = centerY - newYRange / 2;
    bounds.maxY = centerY + newYRange / 2;
  } else {
    const newXRange = (bounds.maxY - bounds.minY) * aspectRatio;
    bounds.minX = centerX - newXRange / 2;
    bounds.maxX = centerX + newXRange / 2;
  }

  return bounds;
}

/**
 * Renders the toolpath on the canvas
 * @param {string} displayContent - G-code content
 * @param {Array} paths - Parsed G-code paths
 * @param {number} minX - Minimum X coordinate
 * @param {number} maxX - Maximum X coordinate
 * @param {number} minY - Minimum Y coordinate
 * @param {number} maxY - Maximum Y coordinate
 * @param {number} currentScale - Current zoom scale
 * @param {boolean} showArrows - Whether to show arrows
 * @param {boolean} drawBound - Whether to draw bounds
 * @param {boolean} drawRange - Whether to draw range
 */
export function renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange) {
  const canvas = document.getElementById('toolpathCanvas');
  const isMobile = window.matchMedia("(max-width: 480px)").matches;
  const canvasSize = isMobile ? CANVAS_CONFIG.MOBILE_SIZE : CANVAS_CONFIG.DESKTOP_SIZE;
  const ctx = configureCanvas(canvas, canvasSize);

  document.getElementById('warningsDiv').textContent = '';
  document.getElementById('rangesDiv').textContent = '';

  if (paths.length === 0) {
    console.debug('No paths to render');
    alert('No valid toolpath found in the G-code.');
    return;
  }

  const xRange = currentBounds.maxX - currentBounds.minX;
  const yRange = currentBounds.maxY - currentBounds.minY;
  const padding = isMobile ? CANVAS_CONFIG.PADDING.mobile : CANVAS_CONFIG.PADDING.desktop;
  const canvasWidth = canvasSize - 2 * padding;
  const canvasHeight = canvasSize - 2 * padding;

  const scaleX = canvasWidth / xRange;
  const scaleY = canvasHeight / yRange;
  const scale = Math.min(scaleX, scaleY) * currentScale;
  const centerX = (currentBounds.maxX + currentBounds.minX) / 2;
  const centerY = (currentBounds.maxY + currentBounds.minY) / 2;
  const offsetX = (canvasSize / 2) - (centerX * scale);
  const offsetY = (canvasSize / 2) - (centerY * scale);

  const targetTickCount = isMobile ? CANVAS_CONFIG.TICK_COUNT.mobile : CANVAS_CONFIG.TICK_COUNT.desktop;
  const targetTickSpacingPx = canvasWidth / targetTickCount;
  const xStep = targetTickSpacingPx / scale;
  const yStep = targetTickSpacingPx / scale;
  const decimalPlaces = Math.max(0, Math.ceil(-Math.log10(Math.min(xStep, yStep)) + 1));

  const tickMinX = Math.floor(currentBounds.minX / xStep) * xStep;
  const tickMaxX = Math.ceil(currentBounds.maxX / xStep) * xStep;
  const tickMinY = Math.floor(currentBounds.minY / yStep) * yStep;
  const tickMaxY = Math.ceil(currentBounds.maxY / yStep) * yStep;

  const defaultXRange = CANVAS_CONFIG.DEFAULT_BOUNDS.maxX - CANVAS_CONFIG.DEFAULT_BOUNDS.minX;
  const zoomLevel = (defaultXRange / xRange).toFixed(3);

  document.getElementById('rangesDiv').textContent = 
    `Axis Ranges: X = (${minX.toFixed(2)}, ${maxX.toFixed(2)}), Y = (${minY.toFixed(2)}, ${maxY.toFixed(2)})\n` +
    `Axis Bounds: X = (${currentBounds.minX.toFixed(2)}, ${currentBounds.maxX.toFixed(2)}), Y = (${currentBounds.minY.toFixed(2)}, ${currentBounds.maxY.toFixed(2)})\n` +
    `Tick Ranges: X = (${tickMinX.toFixed(decimalPlaces)}, ${tickMaxX.toFixed(decimalPlaces)}), Y = (${tickMinY.toFixed(decimalPlaces)}, ${tickMaxY.toFixed(decimalPlaces)})\n` +
    `Zoom Level: ${zoomLevel}`;

  ctx.strokeStyle = CANVAS_CONFIG.COLORS.AXIS;
  ctx.lineWidth = isMobile ? CANVAS_CONFIG.LINE_WIDTH.mobile : CANVAS_CONFIG.LINE_WIDTH.desktop;
  ctx.setLineDash([]);

  const xAxisValue = 0 >= currentBounds.minX && 0 <= currentBounds.maxX ? 0 : (0 < currentBounds.minX ? currentBounds.minX : currentBounds.maxX);
  const yAxisValue = 0 >= currentBounds.minY && 0 <= currentBounds.maxY ? 0 : (0 < currentBounds.minY ? currentBounds.minY : currentBounds.maxY);
  const zeroX = (xAxisValue * scale) + offsetX;
  const zeroY = -((yAxisValue * scale) + offsetY) + canvasSize;

  // Draw axes
  ctx.beginPath();
  ctx.moveTo(padding, zeroY);
  ctx.lineTo(canvasSize - padding, zeroY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(zeroX, padding);
  ctx.lineTo(zeroX, canvasSize - padding);
  ctx.stroke();

  ctx.font = `${isMobile ? CANVAS_CONFIG.FONT_SIZE.mobile : CANVAS_CONFIG.FONT_SIZE.desktop}px Arial`;
  ctx.fillStyle = CANVAS_CONFIG.COLORS.AXIS;
  ctx.textAlign = 'center';
  ctx.fillText('X', canvasSize - padding + 10, zeroY + (isMobile ? 5 : 10));
  ctx.fillText('Y', zeroX - (isMobile ? 10 : 15), padding - 5);

  const tickSize = isMobile ? CANVAS_CONFIG.TICK_SIZE.mobile : CANVAS_CONFIG.TICK_SIZE.desktop;
  for (let x = tickMinX; x <= tickMaxX + xStep / 2; x += xStep) {
    const canvasX = (x * scale) + offsetX;
    if (canvasX >= padding && canvasX <= canvasSize - padding) {
      ctx.beginPath();
      ctx.moveTo(canvasX, zeroY - tickSize);
      ctx.lineTo(canvasX, zeroY + tickSize);
      ctx.stroke();
      ctx.fillText(Number(x).toFixed(decimalPlaces), canvasX, zeroY + (isMobile ? 15 : 20));
    }
  }

  for (let y = tickMinY; y <= tickMaxY + yStep / 2; y += yStep) {
    const canvasY = -((y * scale) + offsetY) + canvasSize;
    if (canvasY >= padding && canvasY <= canvasSize - padding) {
      ctx.beginPath();
      ctx.moveTo(zeroX - tickSize, canvasY);
      ctx.lineTo(zeroX + tickSize, canvasY);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(Number(y).toFixed(decimalPlaces), zeroX - (isMobile ? 10 : 15), canvasY + (isMobile ? 3 : 4));
    }
  }
  ctx.textAlign = 'center';

  if (drawRange) {
    ctx.strokeStyle = CANVAS_CONFIG.COLORS.RANGE;
    ctx.lineWidth = isMobile ? CANVAS_CONFIG.LINE_WIDTH.mobile : CANVAS_CONFIG.LINE_WIDTH.desktop;
    ctx.setLineDash([5, 5]);
    const rangeMinX = minX * scale + offsetX;
    const rangeMaxX = maxX * scale + offsetX;
    const rangeMinY = -((maxY * scale) + offsetY) + canvasSize;
    const rangeMaxY = -((minY * scale) + offsetY) + canvasSize;
    ctx.beginPath();
    ctx.rect(rangeMinX, rangeMinY, rangeMaxX - rangeMinX, rangeMaxY - rangeMinY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (drawBound) {
    ctx.strokeStyle = CANVAS_CONFIG.COLORS.BOUND;
    ctx.lineWidth = isMobile ? CANVAS_CONFIG.LINE_WIDTH.mobile : CANVAS_CONFIG.LINE_WIDTH.desktop;
    ctx.setLineDash([5, 5]);
    const boundMinX = currentBounds.minX * scale + offsetX;
    const boundMaxX = currentBounds.maxX * scale + offsetX;
    const boundMinY = -((currentBounds.maxY * scale) + offsetY) + canvasSize;
    const boundMaxY = -((currentBounds.minY * scale) + offsetY) + canvasSize;
    ctx.beginPath();
    ctx.rect(boundMinX, boundMinY, boundMaxX - boundMinX, boundMaxY - boundMinY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.lineWidth = isMobile ? CANVAS_CONFIG.LINE_WIDTH.mobile : CANVAS_CONFIG.LINE_WIDTH.desktop;
  paths.forEach((path, index) => {
    const startCanvasX = path.startX * scale + offsetX;
    const startCanvasY = -((path.startY * scale) + offsetY) + canvasSize;
    const endCanvasX = path.endX * scale + offsetX;
    const endCanvasY = -((path.endY * scale) + offsetY) + canvasSize;

    if (isNaN(startCanvasX) || isNaN(startCanvasY) || isNaN(endCanvasX) || isNaN(endCanvasY)) {
      console.debug(`Path ${index}: Skipping due to invalid canvas coordinates`);
      return;
    }

    ctx.beginPath();
    if (path.mode === 'G02' || path.mode === 'G03') {
      let centerX, centerY, radius, startAngle, endAngle;
      if (path.r !== null) {
        radius = Math.abs(path.r);
        if (radius < 0.001) {
          document.getElementById('warningsDiv').textContent += `Invalid arc: Zero radius arc from (${path.startX}, ${path.startY}) to (${path.endX}, ${path.endY}). Skipping.\n`;
          document.getElementById('warningsDiv').classList.add('error');
          return;
        }
        const center = calculateArcCenter(path.startX, path.startY, path.endX, path.endY, path.r, path.mode);
        if (!center) return;
        centerX = center[0];
        centerY = center[1];
      } else {
        centerX = path.startX + path.i;
        centerY = path.startY + path.j;
        radius = Math.sqrt(path.i * path.i + path.j * path.j);
        if (radius < 0.001) {
          document.getElementById('warningsDiv').textContent += `Invalid arc: Zero radius arc from (${path.startX}, ${path.startY}) to (${path.endX}, ${path.endY}). Skipping.\n`;
          document.getElementById('warningsDiv').classList.add('error');
          return;
        }
      }

      const isFullCircle = Math.abs(path.startX - path.endX) < 0.001 && Math.abs(path.startY - path.endY) < 0.001;
      const canvasCenterX = centerX * scale + offsetX;
      const canvasCenterY = -((centerY * scale) + offsetY) + canvasSize;
      if (isFullCircle) {
        ctx.arc(canvasCenterX, canvasCenterY, radius * scale, 0, 2 * Math.PI, path.mode === 'G03');
        ctx.strokeStyle = CANVAS_CONFIG.COLORS.ARC;
        ctx.stroke();
      } else {
        startAngle = Math.atan2(path.startY - centerY, path.startX - centerX);
        endAngle = Math.atan2(path.endY - centerY, path.endX - centerX);
        startAngle = (startAngle + 2 * Math.PI) % (2 * Math.PI);
        endAngle = (endAngle + 2 * Math.PI) % (2 * Math.PI);

        if (path.mode === 'G02') {
          if (endAngle > startAngle) endAngle -= 2 * Math.PI;
        } else if (path.mode === 'G03') {
          if (endAngle < startAngle) endAngle += 2 * Math.PI;
        }

        ctx.arc(canvasCenterX, canvasCenterY, radius * scale, -startAngle, -endAngle, path.mode === 'G03');
        ctx.strokeStyle = CANVAS_CONFIG.COLORS.ARC;
        ctx.stroke();
      }

      if (showArrows) {
        const arrowSpacing = 0.5;
        let numArrows, angleDiff;
        if (isFullCircle) {
          angleDiff = path.mode === 'G02' ? -2 * Math.PI : 2 * Math.PI;
          numArrows = Math.max(1, Math.floor(Math.abs(angleDiff) / arrowSpacing));
        } else {
          angleDiff = endAngle - startAngle;
          numArrows = Math.max(1, Math.floor(Math.abs(angleDiff) / arrowSpacing));
        }

        for (let i = 0; i < numArrows; i++) {
          const t = numArrows > 1 ? i / (numArrows - 1) : 0.5;
          const currentAngle = isFullCircle ? (t * angleDiff) : (startAngle + t * angleDiff);
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

          const arrowLength = (isMobile ? CANVAS_CONFIG.ARROW_LENGTH.mobile : CANVAS_CONFIG.ARROW_LENGTH.desktop) / scale;
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
    } else {
      ctx.moveTo(startCanvasX, startCanvasY);
      ctx.lineTo(endCanvasX, endCanvasY);
      if (path.mode === 'G00') {
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = CANVAS_CONFIG.COLORS.RAPID;
      } else {
        ctx.setLineDash([]);
        ctx.strokeStyle = CANVAS_CONFIG.COLORS.LINEAR;
      }
      ctx.stroke();

      if (showArrows && path.mode !== 'G02' && path.mode !== 'G03') {
        const dxCanvas = endCanvasX - startCanvasX;
        const dyCanvas = endCanvasY - startCanvasY;
        const canvasLength = Math.hypot(dxCanvas, dyCanvas);
        const arrowSpacingPx = isMobile ? CANVAS_CONFIG.ARROW_SPACING_PX.mobile : CANVAS_CONFIG.ARROW_SPACING_PX.desktop;
        const numArrows = Math.max(1, Math.min(10, Math.floor(canvasLength / arrowSpacingPx)));

        const ux = dxCanvas / canvasLength;
        const uy = dyCanvas / canvasLength;
        const tipLenPx = isMobile ? CANVAS_CONFIG.ARROW_LENGTH.mobile : CANVAS_CONFIG.ARROW_LENGTH.desktop;

        for (let i = 1; i <= numArrows; i++) {
          const t = i / (numArrows + 1);
          const arrowX = startCanvasX + t * dxCanvas;
          const arrowY = startCanvasY + t * dyCanvas;
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
  });
}
