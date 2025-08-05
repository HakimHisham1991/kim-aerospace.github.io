console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { CANVAS_CONFIG } from './canvasConfig.js';

/**
 * Manages bounds calculations for canvas rendering
 * @module boundsManager
 */

export let currentBounds = { ...CANVAS_CONFIG.DEFAULT_BOUNDS };

/**
 * Updates the current bounds for rendering
 * @param {Object} newBounds - New bounds object
 */
export function setBounds(newBounds) {
  currentBounds = { ...newBounds };
  console.debug(`New bounds set: ${JSON.stringify(currentBounds)}`);
}

/**
 * Calculates bounds with padding and aspect ratio adjustments
 * @param {number} minX - Minimum X coordinate
 * @param {number} maxX - Maximum X coordinate
 * @param {number} minY - Minimum Y coordinate
 * @param {number} maxY - Maximum Y coordinate
 * @param {number} aspectRatio - Canvas aspect ratio
 * @returns {Object} Adjusted bounds {minX, maxX, minY, maxY}
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