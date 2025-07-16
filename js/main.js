import { handleFileContent, updateFileStats, resetFileInput, saveFile, displayContent, setDisplayContent } from './fileHandler.js';
import { parseGcode } from './gcodeParser.js';
import { renderToolpath, clearCanvas } from './canvasRenderer.js';
import { setupEventListeners, contentHistory, currentScale, showArrows, drawBound, drawRange, saveToHistory } from './uiControls.js';

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
  clearCanvas(); // Ensure canvas is cleared before rendering
  renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange);
}

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners(handleFileContent, resetFileInput, saveFile, clearCanvas);
  updateFileStats('');
});
