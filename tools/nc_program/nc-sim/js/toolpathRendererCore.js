console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { CANVAS_CONFIG } from './canvasConfig.js';
import { configureCanvas } from './canvasUtils.js';
import { updateCodeTables } from './codeTableUpdater.js';
import { highlightLine } from './lineHighlighter.js';
import { updateAxisTable } from './axisTableUpdater.js';
import { currentBounds, calculateFitBounds } from './boundsManager.js';
import { animationState } from './animationController.js';
import { updateButtonStates } from './uiControls.js';
import { drawStaticElements } from './toolpathStaticRenderer.js';
import { drawPath } from './toolpathDynamicRenderer.js';
import { animateToolpath } from './toolpathAnimation.js';

/**
 * Manages toolpath rendering and animation on the canvas
 * @module toolpathRendererCore
 */

let previousDisplayContent = null;
let previousPaths = null;

/**
 * Renders the toolpath on the canvas
 * @param {string} displayContent - G-code content
 * @param {Array} paths - Parsed G-code paths
 * @param {number} minX - Minimum X coordinate
 * @param {number} maxX - Maximum X coordinate
 * @param {number} minY - Minimum Y coordinate
 * @param {number} maxY - Maximum Y coordinate
 * @param {number} currentScale - Current zoom scale
 * @param {boolean} showArrows - Whether to show arrows
 * @param {boolean} drawBound - Whether to draw bounds
 * @param {boolean} drawRange - Whether to draw ranges
 * @param {boolean} forceAnimation - Whether to force animation
 * @param {Function} onComplete - Callback on animation completion
 */
export function renderToolpath(displayContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, forceAnimation = false, onComplete = null) {
  const contentChanged = displayContent !== previousDisplayContent || JSON.stringify(paths) !== JSON.stringify(previousPaths);
  if (contentChanged) {
    animationState.currentPathIndex = 0;
    animationState.progress = 0;
    animationState.startTime = null;
    animationState.hasInvalidPath = false;
    previousDisplayContent = displayContent;
    previousPaths = paths;
    console.debug('Content changed, resetting animation state');
  }

  // Debug paths to check for gcodeFeedMode
  console.debug('Paths received:', paths.map(p => ({
    lineNumber: p.lineNumber,
    mode: p.mode,
    mCode: p.mCode,
    gcodeFeedMode: p.gCodes?.feedMode,
    gcodeRetractPlane: p.gCodes?.retractPlane,
    isValid: p.isValid
  })));

  const canvas = document.getElementById('toolpathCanvas');
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const isMobile = window.matchMedia("(max-width: 480px)").matches;
  const canvasSize = isMobile ? CANVAS_CONFIG.MOBILE_SIZE : CANVAS_CONFIG.DESKTOP_SIZE;
  const ctx = configureCanvas(canvas, canvasSize);

  const warningsDiv = document.getElementById('warningsDiv');
  const rangesDiv = document.getElementById('rangesDiv');
  if (warningsDiv) warningsDiv.textContent = '';
  if (rangesDiv) rangesDiv.textContent = '';

  if (paths.length === 0 && displayContent.trim()) {
    console.debug('No paths to render');
    alert('No valid toolpath found in the G-code.');
    updateCodeTables([], -1, 'G94', null, null, null, null, 'G98');
    return;
  }

  const xRange = currentBounds.maxX - currentBounds.minX;
  const yRange = currentBounds.maxY - currentBounds.minY;
  const padding = isMobile ? CANVAS_CONFIG.PADDING.mobile : CANVAS_CONFIG.PADDING.desktop;
  const canvasWidth = canvasSize - 2 * padding;
  const canvasHeight = canvasSize - 2 * padding;

  const scaleX = canvasWidth / xRange;
  const scaleY = canvasHeight / yRange;
  const scale = Math.min(scaleX, scaleY) * currentScale;
  const centerX = (currentBounds.maxX + currentBounds.minX) / 2;
  const centerY = (currentBounds.maxY + currentBounds.minY) / 2;
  const offsetX = (canvasSize / 2) - (centerX * scale);
  const offsetY = (canvasSize / 2) - (centerY * scale);

  const targetTickCount = isMobile ? CANVAS_CONFIG.TICK_COUNT.mobile : CANVAS_CONFIG.TICK_COUNT.desktop;
  const targetTickSpacingPx = canvasWidth / targetTickCount;
  const xStep = targetTickSpacingPx / scale;
  const yStep = targetTickSpacingPx / scale;
  const decimalPlaces = Math.max(0, Math.ceil(-Math.log10(Math.min(xStep, yStep)) + 1));

  const tickMinX = Math.floor(currentBounds.minX / xStep) * xStep;
  const tickMaxX = Math.ceil(currentBounds.maxX / xStep) * xStep;
  const tickMinY = Math.floor(currentBounds.minY / yStep) * yStep;
  const tickMaxY = Math.ceil(currentBounds.maxY / yStep) * yStep;

  const defaultXRange = CANVAS_CONFIG.DEFAULT_BOUNDS.maxX - CANVAS_CONFIG.DEFAULT_BOUNDS.minX;
  const zoomLevel = (defaultXRange / xRange).toFixed(3);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStaticElements(ctx, canvasSize, isMobile, currentBounds, scale, offsetX, offsetY, minX, maxX, minY, maxY, drawRange, drawBound, rangesDiv);

  ctx.lineWidth = isMobile ? CANVAS_CONFIG.LINE_WIDTH.mobile : CANVAS_CONFIG.LINE_WIDTH.desktop;

  const invalidArcs = [];
  const warningLines = new Set();

  if (forceAnimation) {
    console.debug(`Starting animation: currentPathIndex=${animationState.currentPathIndex}, progress=${animationState.progress}`);
    animationState.isAnimating = true;
    animationState.animationFrameId = requestAnimationFrame((timestamp) => animateToolpath(timestamp, {
      paths, ctx, canvasSize, isMobile, currentBounds, scale, offsetX, offsetY,
      minX, maxX, minY, maxY, showArrows, drawRange, drawBound, warningsDiv,
      rangesDiv, warningLines, invalidArcs, onComplete
    }));
  } else {
    for (let i = 0; i <= animationState.currentPathIndex && i < paths.length; i++) {
      if (!paths[i].isValid || paths[i].mCode || (paths[i].mode !== 'G00' && paths[i].mode !== 'G01' && paths[i].mode !== 'G02' && paths[i].mode !== 'G03')) {
        console.debug(`Skipping path in non-animation loop: line ${paths[i].lineNumber + 1}, mode=${paths[i].mode}, mCode=${paths[i].mCode || 'none'}, gcodeFeedMode=${paths[i].gCodes?.feedMode || 'none'}, gcodeRetractPlane=${paths[i].gCodes?.retractPlane || 'none'}, isValid=${paths[i].isValid}`);
        continue;
      }
      const progress = i === animationState.currentPathIndex ? animationState.progress : 1;
      const result = drawPath(ctx, paths[i], scale, offsetX, offsetY, canvasSize, isMobile, showArrows, warningsDiv, warningLines, progress);
      if (result.isInvalid && !warningLines.has(paths[i].lineNumber)) {
        invalidArcs.push(result);
        warningLines.add(paths[i].lineNumber);
        animationState.hasInvalidPath = true;
      }
    }

    if (animationState.currentPathIndex < paths.length) {
      highlightLine(paths[animationState.currentPathIndex].lineNumber);
      console.debug(`Non-animation: highlighted line ${paths[animationState.currentPathIndex].lineNumber + 1}, hasInvalidPath=${animationState.hasInvalidPath}, gcodeFeedMode=${paths[animationState.currentPathIndex].gCodes?.feedMode || 'none'}, gcodeRetractPlane=${paths[animationState.currentPathIndex].gCodes?.retractPlane || 'none'}`);
      updateCodeTables(paths, animationState.currentPathIndex, paths[animationState.currentPathIndex].gCodes?.feedMode || 'G94', null, null, null, null, paths[animationState.currentPathIndex].gCodes?.retractPlane || 'G98');
    } else {
      updateCodeTables(paths, paths.length - 1, paths.length > 0 ? paths[paths.length - 1].gCodes?.feedMode : 'G94', null, null, null, null, paths.length > 0 ? paths[paths.length - 1].gCodes?.retractPlane : 'G98');
    }

    if (invalidArcs.length > 0 && warningsDiv) {
      invalidArcs.forEach(arc => {
        if (!warningLines.has(arc.lineNumber)) {
          warningsDiv.textContent += `Error: Invalid arc at line ${arc.lineNumber + 1}: Zero radius arc from (${arc.startX.toFixed(2)}, ${arc.startY.toFixed(2)}) to (${arc.endX.toFixed(2)}, ${arc.endY.toFixed(2)}). Skipping.\n`;
          warningLines.add(arc.lineNumber);
        }
      });
      warningsDiv.classList.add('error');
    }

    if (paths.length > 0 && animationState.currentPathIndex < paths.length) {
      const currentPath = paths[animationState.currentPathIndex];
      updateAxisTable(
        currentPath.endX,
        currentPath.endY,
        currentPath.endZ
      );
    } else {
      updateAxisTable(0, 0, 0);
    }
  }
}