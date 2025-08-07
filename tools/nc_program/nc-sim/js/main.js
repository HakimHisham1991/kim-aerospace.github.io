console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { parseGcode } from './gcodeParserCore.js';
import { calculateFitBounds, setBounds } from './boundsManager.js';
import { resetAnimation } from './animationController.js';
import { renderToolpath } from './toolpathRendererCore.js';
import { updateAxisTable } from './axisTableUpdater.js';
import { currentScale, showArrows, drawBound, drawRange } from './uiControls.js';
import { displayContent } from './fileHandler.js';
import { CANVAS_CONFIG } from './canvasConfig.js';
import { configureCanvas } from './canvasUtils.js';

/**
 * Main module to coordinate file handling and toolpath simulation
 * @module main
 */

/**
 * Simulates the toolpath by rendering it on the canvas
 */
export function simulateToolpath() {
  if (!displayContent) {
    console.debug('No content to simulate');
    alert('Please load a file first');
    return;
  }

  const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);

  if (paths.length === 0) {
    console.debug('No valid paths to simulate');
    alert('No valid toolpath found in the G-code.');
    return;
  }

  const canvas = document.getElementById('toolpathCanvas');
  const aspectRatio = canvas.width / canvas.height;
  setBounds(calculateFitBounds(minX, maxX, minY, maxY, aspectRatio));

  // Ensure animation starts or resumes
  renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, true);
}

/**
 * Resets the toolpath simulation
 */
export function resetToolpath() {
  if (!displayContent) {
    clearCanvas();
    updateAxisTable(0, 0, 0);
    return;
  }
  resetAnimation();
  const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
  const canvas = document.getElementById('toolpathCanvas');
  const aspectRatio = canvas.width / canvas.height;
  setBounds(calculateFitBounds(minX, maxX, minY, maxY, aspectRatio));
  
  if (paths.length > 0) {
    const firstPath = paths[0];
    updateAxisTable(
      firstPath.startX,
      firstPath.startY,
      firstPath.startZ
    );
  } else {
    updateAxisTable(0, 0, 0);
  }
  
  renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
}

/**
 * Clears the canvas and resets UI elements
 */
export function clearCanvas() {
  const canvas = document.getElementById('toolpathCanvas');
  const ctx = configureCanvas(canvas, CANVAS_CONFIG.DESKTOP_SIZE);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById('warningsDiv').textContent = '';
  document.getElementById('rangesDiv').textContent = '';
}

/**
 * Initializes the application
 */
function initialize() {
  document.addEventListener('DOMContentLoaded', () => {
    clearCanvas();
    updateAxisTable(0, 0, 0);
  });
}

initialize();