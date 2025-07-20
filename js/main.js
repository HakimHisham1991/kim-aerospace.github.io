console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { handleFileContent, updateFileStats, resetFileInput, saveFile, displayContent, setDisplayContent } from './fileHandler.js';
import { parseGcode } from './gcodeParser.js';
import { renderToolpath } from './canvasRenderer.js';
import { clearCanvas } from './canvasUtils.js';
import { setupEventListeners, contentHistory, currentScale, showArrows, drawBound, drawRange, saveToHistory } from './uiControls.js';

/**
 * Main application logic
 * @module main
 */

/**
 * Simulates the toolpath
 */
export function simulateToolpath() {
  if (!displayContent) {
    alert('Please load a file first');
    return;
  }
  const currentContent = document.getElementById('contentTextarea').value;
  if (currentContent !== displayContent) {
    saveToHistory(displayContent);
    setDisplayContent(currentContent);
    updateFileStats(currentContent);
  }
  const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
  const canvas = document.getElementById('toolpathCanvas');
  clearCanvas(canvas);
  renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange);
}

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('toolpathCanvas');
  setupEventListeners(handleFileContent, resetFileInput, saveFile, () => clearCanvas(canvas));
  updateFileStats('');
});
