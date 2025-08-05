// uiHistoryManager.js
console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { UI_CONFIG } from './uiConfig.js';
import { setDisplayContent, updateFileStats } from './fileHandler.js';
import { simulateToolpath } from './main.js';
import { updateButtonStates } from './uiButtonStateManager.js';

/**
 * Content history for undo functionality
 */
export let contentHistory = [];

/**
 * Saves content to history
 * @param {string} content - Content to save
 */
export function saveToHistory(content) {
  contentHistory.push(content);
  const undoBtn = document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.UNDO);
  if (undoBtn) undoBtn.disabled = contentHistory.length <= 1;
}

/**
 * Handles undo action
 */
export function handleUndo() {
  if (contentHistory.length > 1) {
    contentHistory.pop();
    const newContent = contentHistory[contentHistory.length - 1];
    setDisplayContent(newContent);
    updateFileStats(newContent);
    const undoBtn = document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.UNDO);
    if (undoBtn) undoBtn.disabled = contentHistory.length <= 1;
    document.getElementById(UI_CONFIG.ELEMENT_IDS.WARNINGS_DIV).textContent = '';
    simulateToolpath();
    updateButtonStates();
  }
}