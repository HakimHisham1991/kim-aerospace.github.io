import { calculateArcCenter } from './gcodeParser.js';

export let currentBounds = { minX: -100, maxX: 100, minY: -100, maxY: 100 };

export function setBounds(newBounds) {
  currentBounds = { ...newBounds };
  console.debug(`New bounds set: ${JSON.stringify(currentBounds)}`);
}

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

  console.debug(`Calculated fit bounds: ${JSON.stringify(bounds)}`);
  return bounds;
}

export function clearCanvas() {
  const canvas = document.getElementById('toolpathCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange) {
  const canvas = document.getElementById('toolpathCanvas');
  const ctx = canvas.getContext('2d');
  
  const dpr = window.devicePixelRatio || 1;
  const isMobile = window.matchMedia("(max-width: 480px)").matches;
  const canvasSize = isMobile ? 360 : 800;
  canvas.width = canvasSize * dpr;
  canvas.height = canvasSize * dpr;
  ctx.scale(dpr, dpr);
  
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  document.getElementById('warningsDiv').textContent = '';
  document.getElementById('rangesDiv').textContent = '';

  if (paths.length === 0) {
    console.debug('No paths to render');
    alert('No valid toolpath found in the G-code.');
    return;
  }

  const fixedMinX = currentBounds.minX;
  const fixedMaxX = currentBounds.maxX;
  const fixedMinY = currentBounds.minY;
  const fixedMaxY = currentBounds.maxY;

  const xRange = fixedMaxX - fixedMinX;
  const yRange = fixedMaxY - fixedMinY;
  const padding = isMobile ? 30 : 50;
  const canvasWidth = canvasSize - 2 * padding;
  const canvasHeight = canvasSize - 2 * padding;

  const scaleX = canvasWidth / xRange;
  const scaleY = canvasHeight / yRange;
  const scale = Math.min(scaleX, scaleY) * currentScale;
  const centerX = (fixedMaxX + fixedMinX) / 2;
  const centerY = (fixedMaxY + fixedMinY) / 2;
  const offsetX = (canvasSize / 2) - (centerX * scale);
  const offsetY = (canvasSize / 2) - (centerY * scale);

  const targetTickCount = isMobile ? 10 : 12;
  const targetTickSpacingPx = canvasWidth / targetTickCount;
  const xStep = targetTickSpacingPx / scale;
  const yStep = targetTickSpacingPx / scale;
  const decimalPlaces = Math.max(0, Math.ceil(-Math.log10(Math.min(xStep, yStep)) + 1));

  const tickMinX = Math.floor(fixedMinX / xStep) * xStep;
  const tickMaxX = Math.ceil(fixedMaxX / xStep) * xStep;
  const tickMinY = Math.floor(fixedMinY / yStep) * yStep;
  const tickMaxY = Math.ceil(fixedMaxY / yStep) * yStep;

  // Calculate zoom level based on default bounds (-100, 100)
  const defaultXRange = 200; // 100 - (-100)
  const currentXRange = fixedMaxX - fixedMinX;
  const zoomLevel = (defaultXRange / currentXRange).toFixed(3);

  document.getElementById('rangesDiv').textContent = 
    `Axis Ranges: X = (${minX.toFixed(2)}, ${maxX.toFixed(2)}), Y = (${minY.toFixed(2)}, ${maxY.toFixed(2)})\n` +
    `Axis Bounds: X = (${fixedMinX.toFixed(2)}, ${fixedMaxX.toFixed(2)}), Y = (${fixedMinY.toFixed(2)}, ${fixedMaxY.toFixed(2)})\n` +
    `Tick Ranges: X = (${tickMinX.toFixed(decimalPlaces)}, ${tickMaxX.toFixed(decimalPlaces)}), Y = (${tickMinY.toFixed(decimalPlaces)}, ${tickMaxY.toFixed(decimalPlaces)})\n` +
    `Zoom Level: ${zoomLevel}`;

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);

  // Determine axis positions (stick to bounds if origin is outside)
  const xAxisValue = 0 >= fixedMinX && 0 <= fixedMaxX ? 0 : (0 < fixedMinX ? fixedMinX : fixedMaxX);
  const yAxisValue = 0 >= fixedMinY && 0 <= fixedMaxY ? 0 : (0 < fixedMinY ? fixedMinY : fixedMaxY);
  const zeroX = (xAxisValue * scale) + offsetX;
  const zeroY = -((yAxisValue * scale) + offsetY) + canvasSize;

  // Draw axes at adjusted positions
  ctx.beginPath();
  ctx.moveTo(padding, zeroY);
  ctx.lineTo(canvasSize - padding, zeroY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(zeroX, padding);
  ctx.lineTo(zeroX, canvasSize - padding);
  ctx.stroke();

  ctx.font = isMobile ? '10px Arial' : '12px Arial';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.fillText('X', canvasSize - padding + 10, zeroY + (isMobile ? 5 : 10));
  ctx.fillText('Y', zeroX - (isMobile ? 10 : 15), padding - 5);

  const tickSize = isMobile ? 3 : 5;
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
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = isMobile ? 1 : 2;
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
    ctx.strokeStyle = '#A52A2A';
    ctx.lineWidth = isMobile ? 1 : 2;
    ctx.setLineDash([5, 5]);
    const boundMinX = fixedMinX * scale + offsetX;
    const boundMaxX = fixedMaxX * scale + offsetX;
    const boundMinY = -((fixedMaxY * scale) + offsetY) + canvasSize;
    const boundMaxY = -((fixedMinY * scale) + offsetY) + canvasSize;
    ctx.beginPath();
    ctx.rect(boundMinX, boundMinY, boundMaxX - boundMinX, boundMaxY - boundMinY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.lineWidth = isMobile ? 1 : 2;
  paths.forEach((path, index) => {
    const startCanvasX = path.startX * scale + offsetX;
    const startCanvasY = -((path.startY * scale) + offsetY) + canvasSize;
    const endCanvasX = path.endX * scale + offsetX;
    const endCanvasY = -((path.endY * scale) + offsetY) + canvasSize;
    console.debug(`Path ${index}: mode=${path.mode}, start=(${startCanvasX.toFixed(2)}, ${startCanvasY.toFixed(2)}), end=(${endCanvasX.toFixed(2)}, ${endCanvasY.toFixed(2)})`);

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
          document.getElementById('warningsDiv').style.color = 'red';
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
          document.getElementById('warningsDiv').style.color = 'red';
          return;
        }
        
        const startDistance = Math.sqrt(
          Math.pow(path.startX - centerX, 2) + Math.pow(path.startY - centerY, 2)
        );
        const endDistance = Math.sqrt(
          Math.pow(path.endX - centerX, 2) + Math.pow(path.endY - centerY, 2)
        );
        if (Math.abs(startDistance - endDistance) > 0.1) {
          document.getElementById('warningsDiv').textContent += `Invalid arc: Start and end points not equidistant from center. Start distance: ${startDistance.toFixed(3)}, End distance: ${endDistance.toFixed(3)}. Skipping arc from (${path.startX}, ${path.startY}) to (${path.endX}, ${path.endY})\n`;
          document.getElementById('warningsDiv').style.color = 'red';
          return;
        }
      }

      const isFullCircle = Math.abs(path.startX - path.endX) < 0.001 && Math.abs(path.startY - path.endY) < 0.001;
      const canvasCenterX = centerX * scale + offsetX;
      const canvasCenterY = -((centerY * scale) + offsetY) + canvasSize;
      if (isFullCircle) {
        ctx.arc(canvasCenterX, canvasCenterY, radius * scale, 0, 2 * Math.PI, path.mode === 'G03');
        ctx.strokeStyle = '#00ff00';
        ctx.stroke();
      } else {
        startAngle = Math.atan2(path.startY - centerY, path.startX - centerX);
        endAngle = Math.atan2(path.endY - centerY, path.endX - centerX);

        startAngle = (startAngle + 2 * Math.PI) % (2 * Math.PI);
        endAngle = (endAngle + 2 * Math.PI) % (2 * Math.PI);

        if (path.mode === 'G02') {
          if (endAngle > startAngle) {
            endAngle -= 2 * Math.PI;
          }
        } else if (path.mode === 'G03') {
          if (endAngle < startAngle) {
            endAngle += 2 * Math.PI;
          }
        }

        const canvasStartAngle = -startAngle;
        const canvasEndAngle = -endAngle;
        
        ctx.arc(canvasCenterX, canvasCenterY, radius * scale, canvasStartAngle, canvasEndAngle, path.mode === 'G03');
        ctx.strokeStyle = '#00ff00';
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
          
          const arrowLength = (isMobile ? 5 : 10) / scale;
          const baseX = arrowX;
          const baseY = arrowY;
          const tipX = arrowX + tangentX * arrowLength;
          const tipY = arrowY + tangentY * arrowLength;
          
          const canvasBaseX = baseX * scale + offsetX;
          const canvasBaseY = -((baseY * scale) + offsetY) + canvasSize;
          const canvasTipX = tipX * scale + offsetX;
          const canvasTipY = -((tipY * scale) + offsetY) + canvasSize;
          
          drawArrow(ctx, canvasBaseX, canvasBaseY, canvasTipX, canvasTipY, '#00ff00', scale);
        }
      }
    } else {
      ctx.moveTo(startCanvasX, startCanvasY);
      ctx.lineTo(endCanvasX, endCanvasY);
      if (path.mode === 'G00') {
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#ff0000';
      } else {
        ctx.setLineDash([]);
        ctx.strokeStyle = '#0000ff';
      }
      ctx.stroke();
      
      if (showArrows && path.mode !== 'G02' && path.mode !== 'G03') {
        const dxCanvas = endCanvasX - startCanvasX;
        const dyCanvas = endCanvasY - startCanvasY;
        const canvasLength = Math.hypot(dxCanvas, dyCanvas);
        const arrowSpacingPx = isMobile ? 40 : 60;
        const numArrows = Math.max(1, Math.min(10, Math.floor(canvasLength / arrowSpacingPx)));

        const ux = dxCanvas / canvasLength;
        const uy = dyCanvas / canvasLength;
        const tipLenPx = isMobile ? 5 : 10;

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
            path.mode === 'G00' ? '#ff0000' : '#0000ff',
            tipLenPx
          );
        }
      }
    }
  });
}

export function drawArrow(ctx, fromX, fromY, toX, toY, strokeStyle, scale) {
  const headlen = 10;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return;

  const nx = dx / length;
  const ny = dy / length;

  const endX = toX;
  const endY = toY;
  const arrow1X = endX - headlen * (nx * Math.cos(Math.PI / 6) - ny * Math.sin(Math.PI / 6));
  const arrow1Y = endY - headlen * (ny * Math.cos(Math.PI / 6) + nx * Math.sin(Math.PI / 6));
  const arrow2X = endX - headlen * (nx * Math.cos(Math.PI / 6) + ny * Math.sin(Math.PI / 6));
  const arrow2Y = endY - headlen * (ny * Math.cos(Math.PI / 6) - nx * Math.sin(Math.PI / 6));

  ctx.strokeStyle = strokeStyle;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(endX, endY);
  ctx.moveTo(endX, endY);
  ctx.lineTo(arrow1X, arrow1Y);
  ctx.moveTo(endX, endY);
  ctx.lineTo(arrow2X, arrow2Y);
  ctx.stroke();
}