// uiEventHandlers.js
console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { displayContent, handleFileContent, setOriginalFileName, resetFileInput, saveFile } from './fileHandler.js';
import { simulateToolpath, resetToolpath, clearCanvas } from './main.js';
import { parseGcode } from './gcodeParserCore.js';
import { renderToolpath } from './toolpathRendererCore.js';
import { resetAnimation, pauseAnimation, seekToEnd, animationState } from './animationController.js';
import { updateCodeTables } from './codeTableUpdater.js';
import { calculateFitBounds, setBounds, currentBounds } from './boundsManager.js';
import { CANVAS_CONFIG } from './canvasConfig.js';
import { updateButtonStates, setContentEdited } from './uiButtonStateManager.js';
import { logState } from './uiDebugManager.js';
import { handleUndo } from './uiHistoryManager.js';
import { stepForward, stepBackward } from './uiAnimationControls.js';
import { reloadContent } from './uiContentManager.js';
import { clearDebug } from './uiDebugManager.js';
import { UI_CONFIG } from './uiConfig.js';
import { currentScale, showArrows, drawBound, drawRange, setShowArrows, setDrawBound, setDrawRange, setCurrentScale } from './uiControls.js';

/**
 * Sets up UI event listeners
 * @param {Function} clearCanvasCallback - Clear canvas handler
 */
export function setupEventListeners(clearCanvasCallback) {
  const canvas = document.getElementById(UI_CONFIG.ELEMENT_IDS.TOOLPATH_CANVAS);

  // File Input
  document.getElementById(UI_CONFIG.ELEMENT_IDS.FILE_INPUT)?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) {
      console.debug('No file selected');
      resetFileInput(clearCanvasCallback);
      updateButtonStates();
      updateCodeTables([], -1);
      return;
    }
    setOriginalFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        console.debug('File loaded successfully:', file.name);
        handleFileContent(e.target.result, () => {
          const fileNameDisplay = document.getElementById(UI_CONFIG.ELEMENT_IDS.FILE_NAME_DISPLAY);
          if (fileNameDisplay) fileNameDisplay.textContent = file.name;
          setContentEdited(false);
          const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
          setBounds(CANVAS_CONFIG.DEFAULT_BOUNDS);
          resetAnimation();
          updateCodeTables(paths, -1);
          renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
          logState('File loaded → ready to play');
          updateButtonStates();
        });
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing file: ' + error.message);
        resetFileInput(clearCanvasCallback);
        updateCodeTables([], -1);
        updateButtonStates();
      }
    };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      alert('Error reading file: ' + error.message);
      resetFileInput(clearCanvasCallback);
      updateCodeTables([], -1);
      updateButtonStates();
    };
    reader.readAsArrayBuffer(file);
  });

  // Content Editing
  document.getElementById(UI_CONFIG.ELEMENT_IDS.CONTENT_DIV)?.addEventListener('input', () => {
    setContentEdited(document.getElementById(UI_CONFIG.ELEMENT_IDS.CONTENT_DIV)?.textContent !== displayContent);
  });

  // Animation Controls
  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.PLAY)?.addEventListener('click', () => {
    if (!displayContent) {
      alert('Please load a file first');
      return;
    }
    const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
    if (!animationState.isAnimating && (animationState.currentPathIndex >= paths.length - 1 && animationState.progress >= 1)) {
      animationState.currentPathIndex = 0;
      animationState.progress = 0;
      animationState.startTime = null;
      animationState.currentLineIndex = -1;
      animationState.hasInvalidPath = paths.length > 0 ? !paths[0].isValid : false;
    }
    animationState.isAnimating = true;
    logState(`Play pressed → isAnimating=${animationState.isAnimating}, currentPathIndex=${animationState.currentPathIndex}, progress=${animationState.progress}`);
    renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, true, () => {
      logState(`Animation completed → all toolpaths plotted, currentPathIndex=${animationState.currentPathIndex}, progress=${animationState.progress}`);
      updateButtonStates();
    });
    updateButtonStates();
  });

  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.PAUSE)?.addEventListener('click', () => {
    if (!animationState.isAnimating) {
      const pauseBtn = document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.PAUSE);
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

  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.RESET)?.addEventListener('click', () => {
    if (!displayContent) {
      alert('Please load a file first');
      return;
    }
    resetAnimation();
    const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
    updateCodeTables(paths, -1);
    renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
    logState(`Reset pressed → isAnimating=${animationState.isAnimating}, currentPathIndex=${animationState.currentPathIndex}, progress=${animationState.progress}`);
    updateButtonStates();
  });

  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.SEEK_END)?.addEventListener('click', () => {
    seekToEnd(displayContent, parseGcode(displayContent).paths, parseGcode(displayContent).minX, parseGcode(displayContent).maxX, parseGcode(displayContent).minY, parseGcode(displayContent).maxY, currentScale, showArrows, drawBound, drawRange);
    logState(`Seek to end pressed → isAnimating=${animationState.isAnimating}, currentPathIndex=${animationState.currentPathIndex}, progress=${animationState.progress}`);
    updateButtonStates();
  });

  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.STEP_FORWARD)?.addEventListener('click', stepForward);
  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.STEP_BACKWARD)?.addEventListener('click', stepBackward);
  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.UNDO)?.addEventListener('click', handleUndo);
  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.SAVE_FILE)?.addEventListener('click', saveFile);
  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.CLEAR_FILE)?.addEventListener('click', () => {
    resetFileInput(clearCanvasCallback);
    setContentEdited(false);
    updateCodeTables([], -1);
    updateButtonStates();
  });
  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.RELOAD)?.addEventListener('click', reloadContent);
  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.CLEAR_DEBUG)?.addEventListener('click', clearDebug);

  // Visualization Toggles
  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.ARROW_TOGGLE)?.addEventListener('change', (e) => {
    setShowArrows(e.target.checked);
    if (displayContent) {
      const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
      renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
    }
    updateButtonStates();
  });

  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.DRAW_RANGE_TOGGLE)?.addEventListener('change', (e) => {
    setDrawRange(e.target.checked);
    if (displayContent) {
      const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
      renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
    }
    updateButtonStates();
  });

  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.DRAW_BOUND_TOGGLE)?.addEventListener('change', (e) => {
    setDrawBound(e.target.checked);
    if (displayContent) {
      const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
      renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
    }
    updateButtonStates();
  });

  // View Controls
  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.ZOOM_IN)?.addEventListener('click', () => {
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

  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.ZOOM_OUT)?.addEventListener('click', () => {
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

  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.HOME)?.addEventListener('click', () => {
    if (!displayContent) {
      alert('Please load a file first');
      return;
    }
    setCurrentScale(UI_CONFIG.DEFAULT_SCALE);
    setBounds({ minX: -100, maxX: 100, minY: -100, maxY: 100 });
    const { paths, minX, maxX, minY, maxY } = parseGcode(displayContent);
    renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
    updateButtonStates();
  });

  const panButtons = [
    { id: UI_CONFIG.ELEMENT_IDS.BUTTONS.PAN_UP, dx: 0, dy: 0.1 },
    { id: UI_CONFIG.ELEMENT_IDS.BUTTONS.PAN_DOWN, dx: 0, dy: -0.1 },
    { id: UI_CONFIG.ELEMENT_IDS.BUTTONS.PAN_LEFT, dx: -0.1, dy: 0 },
    { id: UI_CONFIG.ELEMENT_IDS.BUTTONS.PAN_RIGHT, dx: 0.1, dy: 0 }
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

  document.getElementById(UI_CONFIG.ELEMENT_IDS.BUTTONS.FIT)?.addEventListener('click', () => {
    if (!displayContent) {
      alert('Please load a file first');
      return;
    }
    const { minX, maxX, minY, maxY } = parseGcode(displayContent);
    setCurrentScale(UI_CONFIG.DEFAULT_SCALE);
    const aspectRatio = canvas?.width / canvas?.height || 1;
    setBounds(calculateFitBounds(minX, maxX, minY, maxY, aspectRatio));
    renderToolpath(displayContent, parseGcode(displayContent).paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
    updateButtonStates();
  });

  // Initialize application
  document.addEventListener('DOMContentLoaded', () => {
    updateCodeTables([], -1);
    renderToolpath('', [], 0, 0, 0, 0, UI_CONFIG.DEFAULT_SCALE, UI_CONFIG.DEFAULT_VISIBILITY.SHOW_ARROWS, UI_CONFIG.DEFAULT_VISIBILITY.DRAW_BOUND, UI_CONFIG.DEFAULT_VISIBILITY.DRAW_RANGE, false);
    updateButtonStates();
  });
}