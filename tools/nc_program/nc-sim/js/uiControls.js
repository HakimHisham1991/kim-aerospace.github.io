// uiControls.js
console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { UI_CONFIG } from './uiConfig.js';
import { setupEventListeners } from './uiEventHandlers.js';
import { contentHistory, saveToHistory } from './uiHistoryManager.js';
import { updateButtonStates } from './uiButtonStateManager.js';
import { stepForward, stepBackward } from './uiAnimationControls.js';
import { reloadContent } from './uiContentManager.js';
import { logState, clearDebug } from './uiDebugManager.js';

/**
 * Manages UI interactions and state
 * @module uiControls
 */

let currentScale = UI_CONFIG.DEFAULT_SCALE;
let showArrows = UI_CONFIG.DEFAULT_VISIBILITY.SHOW_ARROWS;
let drawBound = UI_CONFIG.DEFAULT_VISIBILITY.DRAW_BOUND;
let drawRange = UI_CONFIG.DEFAULT_VISIBILITY.DRAW_RANGE;

/**
 * Setters for state variables
 */
export function setCurrentScale(scale) {
  currentScale = scale;
}

export function setShowArrows(value) {
  showArrows = value;
}

export function setDrawBound(value) {
  drawBound = value;
}

export function setDrawRange(value) {
  drawRange = value;
}

/**
 * Exports for external use
 */
export {
  contentHistory,
  saveToHistory,
  updateButtonStates,
  stepForward,
  stepBackward,
  reloadContent,
  logState,
  clearDebug,
  setupEventListeners,
  currentScale,
  showArrows,
  drawBound,
  drawRange
};