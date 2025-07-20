console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { displayContent, updateFileStats, setDisplayContent, setOriginalFileName } from './fileHandler.js';
import { simulateToolpath } from './main.js';
import { setBounds, calculateFitBounds, currentBounds } from './canvasRenderer.js';
import { parseGcode } from './gcodeParser.js';
import { clearCanvas } from './canvasUtils.js';

/**
 * Manages UI interactions and state
 * @module uiControls
 */

export let contentHistory = [];
export let currentScale = 1;
export let showArrows = false;
export let drawBound = false;
export let drawRange = false;

/**
 * Saves content to history
 * @param {string} content - Content to save
 */
export function saveToHistory(content) {
  contentHistory.push(content);
  document.getElementById('undoBtn').disabled = contentHistory.length <= 1;
}

/**
 * Sets up UI event listeners
 * @param {Function} handleFileContent - File content handler
 * @param {Function} resetFileInput - Reset file input handler
 * @param {Function} saveFile - Save file handler
 * @param {Function} clearCanvasCallback - Clear canvas handler
 */
export function setupEventListeners(handleFileContent, resetFileInput, saveFile, clearCanvasCallback) {
  const canvas = document.getElementById('toolpathCanvas');
  
  document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) {
      resetFileInput(clearCanvasCallback);
      return;
    }
    setOriginalFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        handleFileContent(e.target.result, simulateToolpath);
        document.getElementById('fileNameDisplay').textContent = file.name;
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing file.');
        resetFileInput(clearCanvasCallback);
      }
    };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      alert('Error reading file.');
      resetFileInput(clearCanvasCallback);
    };
    reader.readAsArrayBuffer(file);
  });

  document.getElementById('simulateBtn').addEventListener('click', () => {
    clearCanvasCallback();
    simulateToolpath();
  });

  document.getElementById('undoBtn').addEventListener('click', () => {
    if (contentHistory.length > 1) {
      contentHistory.pop();
      const newContent = contentHistory[contentHistory.length - 1];
      setDisplayContent(newContent);
      document.getElementById('contentTextarea').value = newContent;
      updateFileStats(newContent);
      document.getElementById('undoBtn').disabled = contentHistory.length <= 1;
      clearCanvasCallback();
      document.getElementById('warningsDiv').textContent = '';
      simulateToolpath();
    }
  });

  document.getElementById('saveFileBtn').addEventListener('click', saveFile);
  document.getElementById('clearFileBtn').addEventListener('click', () => resetFileInput(clearCanvasCallback));

  document.getElementById('arrowToggle').addEventListener('change', (e) => {
    showArrows = e.target.checked;
    clearCanvasCallback();
    simulateToolpath();
  });

  document.getElementById('drawRangeToggle').addEventListener('change', (e) => {
    drawRange = e.target.checked;
    clearCanvasCallback();
    simulateToolpath();
  });

  document.getElementById('drawBoundToggle').addEventListener('change', (e) => {
    drawBound = e.target.checked;
    clearCanvasCallback();
    simulateToolpath();
  });

  document.getElementById('zoomInBtn').addEventListener('click', () => {
    if (!displayContent) {
      alert('Please load a file first');
      return;
    }
    const centerX = (currentBounds.minX + currentBounds.maxX) / 2;
    const centerY = (currentBounds.minY + currentBounds.maxY) / 2;
    const currentRangeX = currentBounds.maxX - currentBounds.minX;
    const currentRangeY = currentBounds.maxY - currentBounds.minY;
    const newRangeX = currentRangeX / 2;
    const newRangeY = currentRangeY / 2;
    setBounds({
      minX: centerX - newRangeX / 2,
      maxX: centerX + newRangeX / 2,
      minY: centerY - newRangeY / 2,
      maxY: centerY + newRangeY / 2
    });
    clearCanvasCallback();
    simulateToolpath();
  });

  document.getElementById('zoomOutBtn').addEventListener('click', () => {
    if (!displayContent) {
      alert('Please load a file first');
      return;
    }
    const centerX = (currentBounds.minX + currentBounds.maxX) / 2;
    const centerY = (currentBounds.minY + currentBounds.maxY) / 2;
    const currentRangeX = currentBounds.maxX - currentBounds.minX;
    const currentRangeY = currentBounds.maxY - currentBounds.minY;
    const newRangeX = currentRangeX * 2;
    const newRangeY = currentRangeY * 2;
    setBounds({
      minX: centerX - newRangeX / 2,
      maxX: centerX + newRangeX / 2,
      minY: centerY - newRangeY / 2,
      maxY: centerY + newRangeY / 2
    });
    clearCanvasCallback();
    simulateToolpath();
  });

  document.getElementById('homeBtn').addEventListener('click', () => {
    if (!displayContent) {
      alert('Please load a file first');
      return;
    }
    currentScale = 1;
    setBounds({ minX: -100, maxX: 100, minY: -100, maxY: 100 });
    clearCanvasCallback();
    simulateToolpath();
  });

  const panButtons = [
    { id: 'panUpBtn', dx: 0, dy: 0.1 },
    { id: 'panDownBtn', dx: 0, dy: -0.1 },
    { id: 'panLeftBtn', dx: -0.1, dy: 0 },
    { id: 'panRightBtn', dx: 0.1, dy: 0 }
  ];

  panButtons.forEach(({ id, dx, dy }) => {
    document.getElementById(id).addEventListener('click', () => {
      if (!displayContent) {
        alert('Please load a file first');
        return;
      }
      const xRange = currentBounds.maxX - currentBounds.minX;
      const yRange = currentBounds.maxY - currentBounds.minY;
      const panDistanceX = Math.max(0.001, xRange * Math.abs(dx));
      const panDistanceY = Math.max(0.001, yRange * Math.abs(dy));
      setBounds({
        minX: currentBounds.minX + (dx > 0 ? panDistanceX : dx < 0 ? -panDistanceX : 0),
        maxX: currentBounds.maxX + (dx > 0 ? panDistanceX : dx < 0 ? -panDistanceX : 0),
        minY: currentBounds.minY + (dy > 0 ? panDistanceY : dy < 0 ? -panDistanceY : 0),
        maxY: currentBounds.maxY + (dy > 0 ? panDistanceY : dy < 0 ? -panDistanceY : 0)
      });
      clearCanvasCallback();
      simulateToolpath();
    });
  });

  document.getElementById('fitBtn').addEventListener('click', () => {
    if (!displayContent) {
      alert('Please load a file first');
      return;
    }
    const { minX, maxX, minY, maxY } = parseGcode(displayContent);
    currentScale = 1;
    const canvas = document.getElementById('toolpathCanvas');
    const aspectRatio = canvas.width / canvas.height;
    setBounds(calculateFitBounds(minX, maxX, minY, maxY, aspectRatio));
    clearCanvasCallback();
    simulateToolpath();
  });
        }
