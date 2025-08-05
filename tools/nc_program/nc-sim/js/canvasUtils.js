console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { CANVAS_CONFIG } from './canvasConfig.js';

/**
 * Utility functions for canvas operations
 * @module canvasUtils
 */

/**
 * Clears the canvas
 * @param {HTMLCanvasElement} canvas - The canvas element to clear
 */
export function clearCanvas(canvas) {
  if (!canvas) {
    console.error('Canvas element is undefined');
    return;
  }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Configures canvas for high-DPI displays
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {number} size - The canvas size
 * @returns {CanvasRenderingContext2D} The configured context
 */
export function configureCanvas(canvas, size) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return ctx;
}

/**
 * Draws an arrow on the canvas
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {number} fromX - Starting X coordinate
 * @param {number} fromY - Starting Y coordinate
 * @param {number} toX - Ending X coordinate
 * @param {number} toY - Ending Y coordinate
 * @param {string} strokeStyle - Arrow color
 */
export function drawArrow(ctx, fromX, fromY, toX, toY, strokeStyle) {
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