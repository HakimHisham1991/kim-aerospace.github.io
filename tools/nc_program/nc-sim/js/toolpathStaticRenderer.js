console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { CANVAS_CONFIG } from './canvasConfig.js';

/**
 * Renders static elements on the canvas, such as axes, ticks, labels, and bounds
 * @module toolpathStaticRenderer
 */

/**
 * Draws static canvas elements including axes, ticks, labels, and optional range/bound rectangles
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {number} canvasSize - The canvas size (width/height)
 * @param {boolean} isMobile - Whether the device is mobile
 * @param {Object} currentBounds - Current bounds {minX, maxX, minY, maxY}
 * @param {number} scale - Current zoom scale
 * @param {number} offsetX - X offset for canvas transformation
 * @param {number} offsetY - Y offset for canvas transformation
 * @param {number} minX - Minimum X coordinate of toolpath
 * @param {number} maxX - Maximum X coordinate of toolpath
 * @param {number} minY - Minimum Y coordinate of toolpath
 * @param {number} maxY - Maximum Y coordinate of toolpath
 * @param {boolean} drawRange - Whether to draw range rectangle
 * @param {boolean} drawBound - Whether to draw bound rectangle
 * @param {HTMLElement} rangesDiv - DOM element for range information
 */
export function drawStaticElements(
  ctx,
  canvasSize,
  isMobile,
  currentBounds,
  scale,
  offsetX,
  offsetY,
  minX,
  maxX,
  minY,
  maxY,
  drawRange,
  drawBound,
  rangesDiv
) {
  const xRange = currentBounds.maxX - currentBounds.minX;
  const yRange = currentBounds.maxY - currentBounds.minY;
  const padding = isMobile ? CANVAS_CONFIG.PADDING.mobile : CANVAS_CONFIG.PADDING.desktop;
  const canvasWidth = canvasSize - 2 * padding;
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

  if (rangesDiv) {
    rangesDiv.textContent =
      `Axis Ranges: X = (${minX.toFixed(2)}, ${maxX.toFixed(2)}), Y = (${minY.toFixed(2)}, ${maxY.toFixed(2)})\n` +
      `Axis Bounds: X = (${currentBounds.minX.toFixed(2)}, ${currentBounds.maxX.toFixed(2)}), Y = (${currentBounds.minY.toFixed(2)}, ${currentBounds.maxY.toFixed(2)})\n` +
      `Tick Ranges: X = (${tickMinX.toFixed(decimalPlaces)}, ${tickMaxX.toFixed(decimalPlaces)}), Y = (${tickMinY.toFixed(decimalPlaces)}, ${tickMaxY.toFixed(decimalPlaces)})\n` +
      `Zoom Level: ${zoomLevel}`;
  }

  ctx.strokeStyle = CANVAS_CONFIG.COLORS.AXIS;
  ctx.lineWidth = isMobile ? CANVAS_CONFIG.LINE_WIDTH.mobile : CANVAS_CONFIG.LINE_WIDTH.desktop;
  ctx.setLineDash([]);

  const xAxisValue = 0 >= currentBounds.minX && 0 <= currentBounds.maxX ? 0 : (0 < currentBounds.minX ? currentBounds.minX : currentBounds.maxX);
  const yAxisValue = 0 >= currentBounds.minY && 0 <= currentBounds.maxY ? 0 : (0 < currentBounds.minY ? currentBounds.minY : currentBounds.maxY);
  const zeroX = (xAxisValue * scale) + offsetX;
  const zeroY = -((yAxisValue * scale) + offsetY) + canvasSize;

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
}