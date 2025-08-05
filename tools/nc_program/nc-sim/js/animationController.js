console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { highlightLine } from './lineHighlighter.js';
import { updateAxisTable } from './axisTableUpdater.js';
import { renderToolpath } from './toolpathRendererCore.js';
import { updateButtonStates } from './uiControls.js';

/**
 * Manages animation state and control functions
 * @module animationController
 */

export let animationState = {
  isAnimating: false,
  currentPathIndex: 0,
  progress: 0,
  startTime: null,
  animationFrameId: null,
  hasInvalidPath: false,
  nonMotionDelayUntil: null
};
let previousDisplayContent = null;
let previousPaths = null;

/**
 * Stops the animation and resets relevant state
 */
export function stopAnimation() {
  if (animationState.isAnimating) {
    cancelAnimationFrame(animationState.animationFrameId);
    animationState.isAnimating = false;
    animationState.animationFrameId = null;
    animationState.nonMotionDelayUntil = null;
    console.debug(`Stop animation: isAnimating=false, currentPathIndex=${animationState.currentPathIndex}, progress=${animationState.progress}`);
  }
}

/**
 * Resets the animation to its initial state
 */
export function resetAnimation() {
  stopAnimation();
  animationState.currentPathIndex = 0;
  animationState.progress = 0;
  animationState.startTime = null;
  animationState.hasInvalidPath = false;
  previousDisplayContent = null;
  previousPaths = null;
  highlightLine(-1);
  updateAxisTable(0, 0, 0);
  console.debug(`Reset animation: cleared highlight, currentPathIndex=0`);
}

/**
 * Pauses the animation and updates the UI
 */
export function pauseAnimation() {
  stopAnimation();
  animationState.isAnimating = false;
  if (animationState.currentPathIndex < previousPaths?.length) {
    highlightLine(previousPaths[animationState.currentPathIndex].lineNumber);
    const currentPath = previousPaths[animationState.currentPathIndex];
    updateAxisTable(
      currentPath.endX,
      currentPath.endY,
      currentPath.endZ
    );
    console.debug(`Pause animation: retained highlight at line ${previousPaths[animationState.currentPathIndex].lineNumber + 1}, currentPathIndex=${animationState.currentPathIndex}, progress=${animationState.progress}`);
  }
}

/**
 * Seeks to the end of the toolpath and renders it
 * @param {string} displayContent - G-code content
 * @param {Array} paths - Parsed G-code paths
 * @param {number} minX - Minimum X coordinate
 * @param {number} maxX - Maximum X coordinate
 * @param {number} minY - Minimum Y coordinate
 * @param {number} maxY - Maximum Y coordinate
 * @param {number} currentScale - Current zoom scale
 * @param {boolean} showArrows - Whether to show arrows
 * @param {boolean} drawBound - Whether to draw bounds
 * @param {boolean} drawRange - Whether to draw ranges
 */
export function seekToEnd(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange) {
  stopAnimation();
  animationState.currentPathIndex = paths.length - 1;
  animationState.progress = 1;
  animationState.hasInvalidPath = paths.length > 0 ? !paths[paths.length - 1].isValid : false;
  previousDisplayContent = displayContent;
  previousPaths = paths;
  renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange);
}