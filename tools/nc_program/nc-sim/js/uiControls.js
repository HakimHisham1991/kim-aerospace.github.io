console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { displayContent, updateFileStats, setDisplayContent, setOriginalFileName, handleFileContent, resetFileInput, saveFile } from './fileHandler.js';
import { simulateToolpath, resetToolpath, clearCanvas } from './main.js';
import { calculateFitBounds, setBounds, currentBounds } from './boundsManager.js';
import { renderToolpath } from './toolpathRendererCore.js';
import { stopAnimation, resetAnimation, pauseAnimation, seekToEnd, animationState } from './animationController.js';
import { parseGcode } from './gcodeParserCore.js';
import { updateCodeTables } from './codeTableUpdater.js';
import { CANVAS_CONFIG } from './canvasConfig.js';
import { updateAxisTable } from './axisTableUpdater.js';

let debugCounter = 0;
const MAX_DEBUG_MESSAGES = 20; // Limit the number of messages to 20
let contentEdited = false; // Track if content div content has been edited

function logState(msg) {
  const d = document.getElementById('debugDiv');
  if (d) {
    debugCounter++;  // Increment the counter
    const formattedMsg = `[DEBUG] ${debugCounter}: ${msg}\n`;

    // Insert the new message at the beginning
    d.insertAdjacentText('afterbegin', formattedMsg);

    // Limit the number of messages displayed
    const lines = d.innerText.split('\n');
    if (lines.length > MAX_DEBUG_MESSAGES) {
      d.innerText = lines.slice(0, MAX_DEBUG_MESSAGES).join('\n');
    }

    // Scroll to the top to show the latest message
    d.scrollTop = 0;

    // Enable clear debug button when there are debug messages
    const clearDebugBtn = document.getElementById('clearDebugBtn');
    if (clearDebugBtn) clearDebugBtn.disabled = false;
  }
}

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
  const undoBtn = document.getElementById('undoBtn');
  if (undoBtn) undoBtn.disabled = contentHistory.length <= 1;
}

/**
 * Updates button states based on animation and content state
 */
export function updateButtonStates() {
  const { isAnimating, currentPathIndex, progress } = animationState;
  const parsed = displayContent ? parseGcode(displayContent) : { paths: [] };
  const paths = parsed.paths;
  const currentPathIsInvalid = paths[currentPathIndex] ? !paths[currentPathIndex].isValid : false;

  console.log('updateButtonStates:', {
    displayContent: !!displayContent,
    paths: paths.length,
    isAnimating,
    currentPathIndex,
    progress,
    contentEdited,
    hasInvalidPath: animationState.hasInvalidPath,
    currentPathIsInvalid
  });

  const playDisabled = !displayContent || contentEdited || currentPathIsInvalid || (currentPathIndex >= paths.length - 1 && progress >= 1);
  const pauseDisabled = !isAnimating;
  const resetDisabled = !displayContent || contentEdited;
  const seekEndDisabled = !displayContent || contentEdited || currentPathIsInvalid || (currentPathIndex >= paths.length - 1 && progress >= 1);
  const stepForwardDisabled = !displayContent || isAnimating || contentEdited || currentPathIsInvalid || (currentPathIndex >= paths.length - 1 && progress >= 1);
  const stepBackwardDisabled = !displayContent || isAnimating || contentEdited || (currentPathIndex === 0 && progress === 0);
  const reloadDisabled = !contentEdited;
  const arrowToggleDisabled = contentEdited;
  const drawRangeToggleDisabled = contentEdited;
  const drawBoundToggleDisabled = contentEdited;

  const playBtn = document.getElementById('playBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const seekEndBtn = document.getElementById('seekEndBtn');
  const stepForwardBtn = document.getElementById('stepForwardBtn');
  const stepBackwardBtn = document.getElementById('stepBackwardBtn');
  const reloadBtn = document.getElementById('reloadBtn');
  const arrowToggle = document.getElementById('arrowToggle');
  const drawRangeToggle = document.getElementById('drawRangeToggle');
  const drawBoundToggle = document.getElementById('drawBoundToggle');

  if (playBtn) playBtn.disabled = playDisabled;
  if (pauseBtn) pauseBtn.disabled = pauseDisabled;
  if (resetBtn) resetBtn.disabled = resetDisabled;
  if (seekEndBtn) seekEndBtn.disabled = seekEndDisabled;
  if (stepForwardBtn) stepForwardBtn.disabled = stepForwardDisabled;
  if (stepBackwardBtn) stepBackwardBtn.disabled = stepBackwardDisabled;
  if (reloadBtn) reloadBtn.disabled = reloadDisabled;
  if (arrowToggle) arrowToggle.disabled = arrowToggleDisabled;
  if (drawRangeToggle) drawRangeToggle.disabled = drawRangeToggleDisabled;
  if (drawBoundToggle) drawBoundToggle.disabled = drawBoundToggleDisabled;

  // Update content div contenteditable state
  const contentDiv = document.getElementById('contentDiv');
  if (contentDiv) contentDiv.contentEditable = isAnimating ? 'false' : 'true';
}

/**
 * Steps forward one segment and pauses
 */
function stepForward() {
  if (!displayContent) {
    alert('Please load a file first');
    return;
  }
  const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
  if (animationState.currentPathIndex < paths.length - 1 || animationState.progress < 1) {
    if (animationState.progress >= 1) {
      animationState.currentPathIndex++;
      animationState.progress = 0;
    }
    animationState.progress = 1; // Complete the current segment
    animationState.currentLineIndex = paths[animationState.currentPathIndex].lineIndex;
    animationState.hasInvalidPath = !paths[animationState.currentPathIndex].isValid;
    
    pauseAnimation();
    renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
    logState(`Step forward → currentPathIndex=${animationState.currentPathIndex}, progress=${animationState.progress}, hasInvalidPath=${animationState.hasInvalidPath}`);
    updateButtonStates();
  }
}

/**
 * Steps backward one segment and pauses
 */
function stepBackward() {
  if (!displayContent) {
    alert('Please load a file first');
    return;
  }
  const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
  if (animationState.currentPathIndex > 0 || animationState.progress > 0) {
    if (animationState.progress <= 0) {
      animationState.currentPathIndex--;
      animationState.progress = 1;
    } else {
      animationState.progress = 0;
    }
    animationState.currentLineIndex = paths[animationState.currentPathIndex].lineIndex;
    animationState.hasInvalidPath = !paths[animationState.currentPathIndex].isValid;
    
    if (animationState.currentPathIndex < paths.length) {
      const currentPath = paths[animationState.currentPathIndex];
      updateAxisTable(
        currentPath.endX,
        currentPath.endY,
        currentPath.endZ
      );
    }
    
    pauseAnimation();
    renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
    logState(`Step backward → currentPathIndex=${animationState.currentPathIndex}, progress=${animationState.progress}, hasInvalidPath=${animationState.hasInvalidPath}`);
    updateButtonStates();
  }
}

/**
 * Reloads the content from content div and resets the canvas
 */
function reloadContent() {
  if (!contentEdited) return;
  
  const contentDiv = document.getElementById('contentDiv');
  if (!contentDiv) return;
  
  const lineSpans = contentDiv.querySelectorAll('span.line');
  const newContent = Array.from(lineSpans)
    .map(span => span.textContent.replace(/\n$/, '')) // Remove trailing \n
    .join('\n'); // Join with explicit line breaks
  
  if (!newContent) return;
  
  setDisplayContent(newContent);
  updateFileStats(newContent);
  contentEdited = false;
  
  resetAnimation();
  const { paths, minX, maxX, minY, maxY } = parseGcode(newContent);
  const canvas = document.getElementById('toolpathCanvas');
  const aspectRatio = canvas?.width / canvas?.height || 1;
  setBounds(calculateFitBounds(minX, maxX, minY, maxY, aspectRatio));
  renderToolpath(newContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
  logState(`Reload pressed → content reloaded, canvas reset`);
  updateButtonStates();
}

/**
 * Clears the debug messages
 */
function clearDebug() {
  const debugDiv = document.getElementById('debugDiv');
  if (debugDiv) {
    debugDiv.innerText = '';
    debugCounter = 0;
    const clearDebugBtn = document.getElementById('clearDebugBtn');
    if (clearDebugBtn) clearDebugBtn.disabled = true;
  }
}

/**
 * Sets up UI event listeners
 * @param {Function} clearCanvasCallback - Clear canvas handler
 */
export function setupEventListeners(clearCanvasCallback) {
  const canvas = document.getElementById('toolpathCanvas');
  
  document.getElementById('fileInput')?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) {
      console.debug('No file selected');
      resetFileInput(clearCanvasCallback);
      updateButtonStates();
      updateCodeTables([], -1); // Reset tables to defaults
      return;
    }
    setOriginalFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        console.debug('File loaded successfully:', file.name);
        handleFileContent(e.target.result, () => {
          // Callback to handle rendering after handleFileContent
          const fileNameDisplay = document.getElementById('fileNameDisplay');
          if (fileNameDisplay) fileNameDisplay.textContent = file.name;
          contentEdited = false;
          const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
          setBounds(CANVAS_CONFIG.DEFAULT_BOUNDS);
          resetAnimation();
          updateCodeTables(paths, -1); // Show default codes on load
          renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
          logState('File loaded → ready to play');
          updateButtonStates();
        });
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing file: ' + error.message);
        resetFileInput(clearCanvasCallback);
        updateCodeTables([], -1); // Reset tables to defaults
        updateButtonStates();
      }
    };

    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      alert('Error reading file: ' + error.message);
      resetFileInput(clearCanvasCallback);
      updateCodeTables([], -1); // Reset tables to defaults
      updateButtonStates();
    };
    reader.readAsArrayBuffer(file);
  });

  document.getElementById('contentDiv')?.addEventListener('input', () => {
    contentEdited = document.getElementById('contentDiv')?.textContent !== displayContent;
    updateButtonStates();
  });

  document.getElementById('playBtn')?.addEventListener('click', () => {
    if (!displayContent) {
      alert('Please load a file first');
      return;
    }

    const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);

    // Only reset if animation is not paused or has completed
    if (!animationState.isAnimating && (animationState.currentPathIndex >= paths.length - 1 && animationState.progress >= 1)) {
      animationState.currentPathIndex = 0;
      animationState.progress = 0;
      animationState.startTime = null;
      animationState.currentLineIndex = -1;
      animationState.hasInvalidPath = paths.length > 0 ? !paths[0].isValid : false;
    }
    animationState.isAnimating = true;

    logState(`Play pressed → isAnimating=${animationState.isAnimating}, currentPathIndex=${animationState.currentPathIndex}, progress=${animationState.progress}`);

    renderToolpath(displayContent, paths, minX, maxX, minY, maxY,
                  currentScale, showArrows, drawBound, drawRange, true, () => {
                    logState(`Animation completed → all toolpaths plotted, currentPathIndex=${animationState.currentPathIndex}, progress=${animationState.progress}`);
                    updateButtonStates();
                  });
    updateButtonStates();
  });

  document.getElementById('pauseBtn')?.addEventListener('click', () => {
    if (!animationState.isAnimating) {
      const pauseBtn = document.getElementById('pauseBtn');
      if (pauseBtn) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = 'Animation is already paused';
        tooltip.style.top = `${pauseBtn.offsetTop + pauseBtn.offsetHeight + 5}px`;
        tooltip.style.left = `${pauseBtn.offsetLeft}px`;
        document.body.appendChild(tooltip);
        setTimeout(() => tooltip.remove(), 2000);
      }
    }
    pauseAnimation();
    logState(`Pause pressed → isAnimating=${animationState.isAnimating}`);
    updateButtonStates();
  });

  document.getElementById('resetBtn')?.addEventListener('click', () => {
    if (!displayContent) {
      alert('Please load a file first');
      return;
    }
    resetAnimation();
    const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
    updateCodeTables(paths, -1); // Reset tables to defaults
    renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
    logState(`Reset pressed → isAnimating=${animationState.isAnimating}, currentPathIndex=${animationState.currentPathIndex}, progress=${animationState.progress}`);
    updateButtonStates();
  });

  document.getElementById('seekEndBtn')?.addEventListener('click', () => {
    seekToEnd(displayContent, parseGcode(displayContent).paths, parseGcode(displayContent).minX, parseGcode(displayContent).maxX, parseGcode(displayContent).minY, parseGcode(displayContent).maxY, currentScale, showArrows, drawBound, drawRange);
    logState(`Seek to end pressed → isAnimating=${animationState.isAnimating}, currentPathIndex=${animationState.currentPathIndex}, progress=${animationState.progress}`);
    updateButtonStates();
  });

  document.getElementById('stepForwardBtn')?.addEventListener('click', () => {
    stepForward();
  });

  document.getElementById('stepBackwardBtn')?.addEventListener('click', () => {
    stepBackward();
  });

  document.getElementById('undoBtn')?.addEventListener('click', () => {
    if (contentHistory.length > 1) {
      contentHistory.pop();
      const newContent = contentHistory[contentHistory.length - 1];
      setDisplayContent(newContent);
      updateFileStats(newContent);
      const undoBtn = document.getElementById('undoBtn');
      if (undoBtn) undoBtn.disabled = contentHistory.length <= 1;
      document.getElementById('warningsDiv').textContent = '';
      contentEdited = false;
      simulateToolpath();
      updateButtonStates();
    }
  });

  document.getElementById('saveFileBtn')?.addEventListener('click', saveFile);

  document.getElementById('clearFileBtn')?.addEventListener('click', () => {
    resetFileInput(clearCanvasCallback);
    contentEdited = false;
    updateCodeTables([], -1); // Reset tables to defaults
    updateButtonStates();
  });

  document.getElementById('reloadBtn')?.addEventListener('click', () => {
    reloadContent();
  });

  document.getElementById('clearDebugBtn')?.addEventListener('click', () => {
    clearDebug();
  });

  document.getElementById('arrowToggle')?.addEventListener('change', (e) => {
    showArrows = e.target.checked;
    if (displayContent) {
      const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
      renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
    }
    updateButtonStates();
  });

  document.getElementById('drawRangeToggle')?.addEventListener('change', (e) => {
    drawRange = e.target.checked;
    if (displayContent) {
      const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
      renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
    }
    updateButtonStates();
  });

  document.getElementById('drawBoundToggle')?.addEventListener('change', (e) => {
    drawBound = e.target.checked;
    if (displayContent) {
      const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
      renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
    }
    updateButtonStates();
  });

  document.getElementById('zoomInBtn')?.addEventListener('click', () => {
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
    const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
    renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
    updateButtonStates();
  });

  document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
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
    const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
    renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
    updateButtonStates();
  });

  document.getElementById('homeBtn')?.addEventListener('click', () => {
    if (!displayContent) {
      alert('Please load a file first');
      return;
    }
    currentScale = 1;
    setBounds({ minX: -100, maxX: 100, minY: -100, maxY: 100 });
    const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
    renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
    updateButtonStates();
  });

  const panButtons = [
    { id: 'panUpBtn', dx: 0, dy: 0.1 },
    { id: 'panDownBtn', dx: 0, dy: -0.1 },
    { id: 'panLeftBtn', dx: -0.1, dy: 0 },
    { id: 'panRightBtn', dx: 0.1, dy: 0 }
  ];

  panButtons.forEach(({ id, dx, dy }) => {
    document.getElementById(id)?.addEventListener('click', () => {
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
      const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
      renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
      updateButtonStates();
    });
  });

  document.getElementById('fitBtn')?.addEventListener('click', () => {
    if (!displayContent) {
      alert('Please load a file first');
      return;
    }
    const { minX, maxX, minY, maxY } = parseGcode(displayContent);
    currentScale = 1;
    const canvas = document.getElementById('toolpathCanvas');
    const aspectRatio = canvas?.width / canvas?.height || 1;
    setBounds(calculateFitBounds(minX, maxX, minY, maxY, aspectRatio));
    renderToolpath(displayContent, parseGcode(displayContent).paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
    updateButtonStates();
  });

  // Initialize application after DOM is fully loaded
  document.addEventListener('DOMContentLoaded', () => {
    updateCodeTables([], -1); // Initialize tables with defaults
    renderToolpath('', [], 0, 0, 0, 0, 1, false, false, false, false);
    updateButtonStates();
  });
}