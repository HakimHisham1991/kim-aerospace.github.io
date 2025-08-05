// uiDebugManager.js
console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { UI_CONFIG } from './uiConfig.js';

let debugCounter = 0;

/**
 * Logs a debug message to the debug div
 * @param {string} msg - Message to log
 */
export function logState(msg) {
  const debugDiv = document.getElementById(UI_CONFIG.ELEMENT_IDS.DEBUG_DIV);
  if (debugDiv) {
    debugCounter++;
    const formattedMsg = `[DEBUG] ${debugCounter}: ${msg}\n`;
    debugDiv.insertAdjacentText('afterbegin', formattedMsg);

    const lines = debugDiv.innerText.split('\n');
    if (lines.length > UI_CONFIG.MAX_DEBUG_MESSAGES) {
      debugDiv.innerText = lines.slice(0, UI_CONFIG.MAX_DEBUG_MESSAGES).join('\n');
    }
    debugDiv.scrollTop = 0;

    const clearDebugBtn = document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.CLEAR_DEBUG);
    if (clearDebugBtn) clearDebugBtn.disabled = false;
  }
}

/**
 * Clears the debug messages
 */
export function clearDebug() {
  const debugDiv = document.getElementById(UI_CONFIG.ELEMENT_IDS.DEBUG_DIV);
  if (debugDiv) {
    debugDiv.innerText = '';
    debugCounter = 0;
    const clearDebugBtn = document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.CLEAR_DEBUG);
    if (clearDebugBtn) clearDebugBtn.disabled = true;
  }
}