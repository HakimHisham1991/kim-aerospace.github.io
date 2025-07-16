import { displayContent, updateFileStats, setDisplayContent } from './fileHandler.js';
import { simulateToolpath } from './main.js';
import { setBounds, calculateFitBounds, clearCanvas, currentBounds } from './canvasRenderer.js';
import { parseGcode } from './gcodeParser.js';

export let contentHistory = [];
export let currentScale = 1;
export let showArrows = false;
export let drawBound = false;
export let drawRange = false;

export function saveToHistory(content) {
  contentHistory.push(content);
  document.getElementById('undoBtn').disabled = contentHistory.length <= 1;
}

export function setupEventListeners(handleFileContent, resetFileInput, saveFile, clearCanvas) {
  document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) {
      resetFileInput(clearCanvas);
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        handleFileContent(e.target.result, simulateToolpath);
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing file. See console for details.');
        resetFileInput(clearCanvas);
      }
    };
    reader.onerror = function(error) {
      console.error('FileReader error:', error);
      alert('Error reading file. See console for details.');
      resetFileInput(clearCanvas);
    };
    reader.readAsArrayBuffer(file);
  });

  document.getElementById('simulateBtn').addEventListener('click', function() {
    clearCanvas();
    simulateToolpath();
  });

  document.getElementById('undoBtn').addEventListener('click', function() {
    if (contentHistory.length > 1) {
      contentHistory.pop();
      const newContent = contentHistory[contentHistory.length - 1];
      setDisplayContent(newContent);
      document.getElementById('contentTextarea').value = newContent;
      updateFileStats(newContent);
      document.getElementById('undoBtn').disabled = contentHistory.length <= 1;
      clearCanvas();
      document.getElementById('warningsDiv').textContent = '';
      simulateToolpath();
    }
  });

  document.getElementById('saveFileBtn').addEventListener('click', function() {
    saveFile();
  });

  document.getElementById('clearFileBtn').addEventListener('click', function() {
    resetFileInput(clearCanvas);
  });

  document.getElementById('arrowToggle').addEventListener('change', function(e) {
    showArrows = e.target.checked;
    clearCanvas();
    simulateToolpath();
  });

  document.getElementById('drawRangeToggle').addEventListener('change', function(e) {
    drawRange = e.target.checked;
    clearCanvas();
    simulateToolpath();
  });

  document.getElementById('drawBoundToggle').addEventListener('change', function(e) {
    drawBound = e.target.checked;
    clearCanvas();
    simulateToolpath();
  });

  document.getElementById('zoomInBtn').addEventListener('click', function() {
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
    clearCanvas();
    simulateToolpath();
  });

  document.getElementById('zoomOutBtn').addEventListener('click', function() {
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
    clearCanvas();
    simulateToolpath();
  });

  document.getElementById('homeBtn').addEventListener('click', function() {
    if (!displayContent) {
      alert('Please load a file first');
      return;
    }
    currentScale = 1;
    setBounds({
      minX: -100,
      maxX: 100,
      minY: -100,
      maxY: 100
    });
    clearCanvas();
    simulateToolpath();
  });

  document.getElementById('panUpBtn').addEventListener('click', function() {
  const yRange = currentBounds.maxY - currentBounds.minY;
  let panDistance = yRange * 0.1;
  panDistance = Math.max(0.001, panDistance); // Remove upper limit of 100
  console.debug(`Pan Up: yRange=${yRange}, panDistance=${panDistance}`);
  setBounds({
    minX: currentBounds.minX,
    maxX: currentBounds.maxX,
    minY: currentBounds.minY + panDistance, // Move view up (increase Y)
    maxY: currentBounds.maxY + panDistance
  });
  clearCanvas();
  simulateToolpath();
});

document.getElementById('panDownBtn').addEventListener('click', function() {
  const yRange = currentBounds.maxY - currentBounds.minY;
  let panDistance = yRange * 0.1;
  panDistance = Math.max(0.001, panDistance); // Remove upper limit of 100
  console.debug(`Pan Down: yRange=${yRange}, panDistance=${panDistance}`);
  setBounds({
    minX: currentBounds.minX,
    maxX: currentBounds.maxX,
    minY: currentBounds.minY - panDistance, // Move view down (decrease Y)
    maxY: currentBounds.maxY - panDistance
  });
  clearCanvas();
  simulateToolpath();
});

document.getElementById('panLeftBtn').addEventListener('click', function() {
  const xRange = currentBounds.maxX - currentBounds.minX;
  let panDistance = xRange * 0.1;
  panDistance = Math.max(0.001, panDistance); // Remove upper limit of 100
  console.debug(`Pan Left: xRange=${xRange}, panDistance=${panDistance}`);
  setBounds({
    minX: currentBounds.minX - panDistance,
    maxX: currentBounds.maxX - panDistance,
    minY: currentBounds.minY,
    maxY: currentBounds.maxY
  });
  clearCanvas();
  simulateToolpath();
});

document.getElementById('panRightBtn').addEventListener('click', function() {
  const xRange = currentBounds.maxX - currentBounds.minX;
  let panDistance = xRange * 0.1;
  panDistance = Math.max(0.001, panDistance); // Remove upper limit of 100
  console.debug(`Pan Right: xRange=${xRange}, panDistance=${panDistance}`);
  setBounds({
    minX: currentBounds.minX + panDistance,
    maxX: currentBounds.maxX + panDistance,
    minY: currentBounds.minY,
    maxY: currentBounds.maxY
  });
  clearCanvas();
  simulateToolpath();
});





  document.getElementById('fitBtn').addEventListener('click', function() {
    if (!displayContent) {
      alert('Please load a file first');
      return;
    }
    const { minX, maxX, minY, maxY } = parseGcode(displayContent);
    currentScale = 1;
    const canvas = document.getElementById('toolpathCanvas');
    const aspectRatio = canvas.width / canvas.height;
    const bounds = calculateFitBounds(minX, maxX, minY, maxY, aspectRatio);
    setBounds(bounds);
    clearCanvas();
    simulateToolpath();
  });
}