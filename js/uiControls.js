import { displayContent, updateFileStats, setDisplayContent } from './fileHandler.js';
import { simulateToolpath } from './main.js';

export let contentHistory = [];
export let currentScale = 1;
export let showArrows = false;

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
    simulateToolpath();
  });

  document.getElementById('applyScaleBtn').addEventListener('click', function() {
    currentScale = parseFloat(document.getElementById('scaleSelect').value);
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
    simulateToolpath();
  });
}