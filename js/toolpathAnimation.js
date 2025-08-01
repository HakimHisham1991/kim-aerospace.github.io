console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { updateCodeTables } from './codeTableUpdater.js';
import { highlightLine } from './lineHighlighter.js';
import { updateAxisTable } from './axisTableUpdater.js';
import { updateButtonStates } from './uiControls.js';
import { drawPath } from './toolpathDynamicRenderer.js';
import { drawStaticElements } from './toolpathStaticRenderer.js';
import { animationState } from './animationController.js';

/**
 * Manages the animation loop for toolpath rendering
 * @module toolpathAnimation
 */

/**
 * Animates the toolpath rendering on the canvas
 * @param {number} timestamp - Current animation frame timestamp
 * @param {Object} params - Animation parameters
 * @param {Array} params.paths - Parsed G-code paths
 * @param {CanvasRenderingContext2D} params.ctx - Canvas context
 * @param {number} params.canvasSize - Canvas size (width/height)
 * @param {boolean} params.isMobile - Whether the device is mobile
 * @param {Object} params.currentBounds - Current bounds of the toolpath
 * @param {number} params.scale - Current zoom scale
 * @param {number} params.offsetX - X offset for canvas transformation
 * @param {number} params.offsetY - Y offset for canvas transformation
 * @param {number} params.minX - Minimum X coordinate
 * @param {number} params.maxX - Maximum X coordinate
 * @param {number} params.minY - Minimum Y coordinate
 * @param {number} params.maxY - Maximum Y coordinate
 * @param {boolean} params.showArrows - Whether to show direction arrows
 * @param {boolean} params.drawRange - Whether to draw ranges
 * @param {boolean} params.drawBound - Whether to draw bounds
 * @param {HTMLElement} params.warningsDiv - DOM element for warning messages
 * @param {HTMLElement} params.rangesDiv - DOM element for range display
 * @param {Set} params.warningLines - Set of line numbers with warnings
 * @param {Array} params.invalidArcs - Array to store invalid arc data
 * @param {Function} [params.onComplete] - Callback on animation completion
 */
export function animateToolpath(timestamp, {
  paths, ctx, canvasSize, isMobile, currentBounds, scale, offsetX, offsetY,
  minX, maxX, minY, maxY, showArrows, drawRange, drawBound, warningsDiv,
  rangesDiv, warningLines, invalidArcs, onComplete
}) {
  const ANIMATION_DURATION = 1000;
  const NON_MOTION_DELAY = 500;

  try {
    if (!animationState.isAnimating) {
      if (paths.length > 0 && animationState.currentPathIndex >= 0 && animationState.currentPathIndex < paths.length) {
        const feedMode = paths[animationState.currentPathIndex]?.gCodes?.feedMode || 'G94';
        const distanceMode = paths[animationState.currentPathIndex]?.gCodes?.distanceMode || 'G90';
        const coordinateSystem = paths[animationState.currentPathIndex]?.gCodes?.coordinateSystem || 'G54';
        const toolOffset = paths[animationState.currentPathIndex]?.gCodes?.toolOffset || 'G40';
        const toolLength = paths[animationState.currentPathIndex]?.gCodes?.toolLength || 'G49';
        updateCodeTables(paths, animationState.currentPathIndex, feedMode, distanceMode, coordinateSystem, toolOffset, toolLength);
        console.debug(`Animation stopped: Updated code tables with feedMode=${feedMode}, distanceMode=${distanceMode}, coordinateSystem=${coordinateSystem}, toolOffset=${toolOffset}, toolLength=${toolLength} at pathIndex=${animationState.currentPathIndex}`);
      } else {
        updateCodeTables(paths, Math.max(0, paths.length - 1));
        console.debug(`Animation stopped: Updated code tables with defaults at pathIndex=${Math.max(0, paths.length - 1)}`);
      }
      if (onComplete) onComplete();
      return;
    }

    if (!animationState.startTime) animationState.startTime = timestamp;

    const elapsed = timestamp - animationState.startTime;
    animationState.progress = Math.min(elapsed / ANIMATION_DURATION, 1);

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    drawStaticElements(ctx, canvasSize, isMobile, currentBounds, scale, offsetX, offsetY, minX, maxX, minY, maxY, drawRange, drawBound, rangesDiv);

    invalidArcs.length = 0;
    warningLines.clear();

    // Draw all completed paths
    for (let i = 0; i < animationState.currentPathIndex && i < paths.length; i++) {
      if (!paths[i].isValid || paths[i].mCode || (paths[i].mode !== 'G00' && paths[i].mode !== 'G01' && paths[i].mode !== 'G02' && paths[i].mode !== 'G03')) {
        console.debug(`Skipping path in completed loop: line ${paths[i].lineNumber + 1}, mode=${paths[i].mode}, mCode=${paths[i].mCode || 'none'}, gcodeFeedMode=${paths[i].gCodes?.feedMode || 'none'}, gcodeDistanceMode=${paths[i].gCodes?.distanceMode || 'none'}, gcodeCoordinateSystem=${paths[i].gCodes?.coordinateSystem || 'none'}, gcodeToolOffset=${paths[i].gCodes?.toolOffset || 'none'}, gcodeToolLength=${paths[i].gCodes?.toolLength || 'none'}, isValid=${paths[i].isValid}`);
        continue;
      }
      const result = drawPath(ctx, paths[i], scale, offsetX, offsetY, canvasSize, isMobile, showArrows, warningsDiv, warningLines, 1);
      if (result.isInvalid && !warningLines.has(paths[i].lineNumber)) {
        invalidArcs.push(result);
        warningLines.add(paths[i].lineNumber);
        animationState.hasInvalidPath = true;
      }
    }

    // Process current path
    while (animationState.currentPathIndex < paths.length) {
      const currentPath = paths[animationState.currentPathIndex];
      highlightLine(currentPath.lineNumber);

      if (!currentPath.isValid) {
        if (warningsDiv && !warningLines.has(currentPath.lineNumber)) {
          warningsDiv.textContent += `Error: Invalid path at line ${currentPath.lineNumber + 1}: Unrecognized or unsupported G-code '${currentPath.mode || 'unknown'}'. Pausing.\n`;
          warningsDiv.classList.add('error');
          warningLines.add(currentPath.lineNumber);
        }
        console.debug(`Pausing at invalid path: line ${currentPath.lineNumber + 1}, index=${animationState.currentPathIndex}, mode=${currentPath.mode}, mCode=${currentPath.mCode || 'none'}, gcodeFeedMode=${currentPath.gCodes?.feedMode || 'none'}, gcodeDistanceMode=${currentPath.gCodes?.distanceMode || 'none'}, gcodeCoordinateSystem=${currentPath.gCodes?.coordinateSystem || 'none'}, gcodeToolOffset=${currentPath.gCodes?.toolOffset || 'none'}, gcodeToolLength=${currentPath.gCodes?.toolLength || 'none'}, isValid=${currentPath.isValid}`);
        animationState.hasInvalidPath = true;
        animationState.isAnimating = false;
        const feedMode = currentPath.gCodes?.feedMode || 'G94';
        const distanceMode = currentPath.gCodes?.distanceMode || 'G90';
        const coordinateSystem = currentPath.gCodes?.coordinateSystem || 'G54';
        const toolOffset = currentPath.gCodes?.toolOffset || 'G40';
        const toolLength = currentPath.gCodes?.toolLength || 'G49';
        updateCodeTables(paths, animationState.currentPathIndex, feedMode, distanceMode, coordinateSystem, toolOffset, toolLength);
        console.debug(`Invalid path: Updated code tables with feedMode=${feedMode}, distanceMode=${distanceMode}, coordinateSystem=${coordinateSystem}, toolOffset=${toolOffset}, toolLength=${toolLength} at pathIndex=${animationState.currentPathIndex}`);
        updateButtonStates();
        if (onComplete) onComplete();
        break;
      }

      if (currentPath.mCode || (currentPath.mode !== 'G00' && currentPath.mode !== 'G01' && currentPath.mode !== 'G02' && currentPath.mode !== 'G03')) {
        console.debug(`Processing non-motion path: line ${currentPath.lineNumber + 1}, mode=${currentPath.mode}, mCode=${currentPath.mCode || 'none'}, gcodeFeedMode=${currentPath.gCodes?.feedMode || 'none'}, gcodeDistanceMode=${currentPath.gCodes?.distanceMode || 'none'}, gcodeCoordinateSystem=${currentPath.gCodes?.coordinateSystem || 'none'}, gcodeToolOffset=${currentPath.gCodes?.toolOffset || 'none'}, gcodeToolLength=${currentPath.gCodes?.toolLength || 'none'}, index=${animationState.currentPathIndex}, isValid=${currentPath.isValid}`);
        if (!animationState.nonMotionDelayUntil) {
          animationState.nonMotionDelayUntil = timestamp + NON_MOTION_DELAY;
        }
        if (timestamp < animationState.nonMotionDelayUntil) {
          const feedMode = currentPath.gCodes?.feedMode || 'G94';
          const distanceMode = currentPath.gCodes?.distanceMode || 'G90';
          const coordinateSystem = currentPath.gCodes?.coordinateSystem || 'G54';
          const toolOffset = currentPath.gCodes?.toolOffset || 'G40';
          const toolLength = currentPath.gCodes?.toolLength || 'G49';
          updateCodeTables(paths, animationState.currentPathIndex, feedMode, distanceMode, coordinateSystem, toolOffset, toolLength);
          console.debug(`Non-motion delay: Updated code tables with feedMode=${feedMode}, distanceMode=${distanceMode}, coordinateSystem=${coordinateSystem}, toolOffset=${toolOffset}, toolLength=${toolLength} at pathIndex=${animationState.currentPathIndex}`);
          animationState.animationFrameId = requestAnimationFrame((ts) => animateToolpath(ts, {
            paths, ctx, canvasSize, isMobile, currentBounds, scale, offsetX, offsetY,
            minX, maxX, minY, maxY, showArrows, drawRange, drawBound, warningsDiv,
            rangesDiv, warningLines, invalidArcs, onComplete
          }));
          return;
        }
        const feedMode = currentPath.gCodes?.feedMode || 'G94';
        const distanceMode = currentPath.gCodes?.distanceMode || 'G90';
        const coordinateSystem = currentPath.gCodes?.coordinateSystem || 'G54';
        const toolOffset = currentPath.gCodes?.toolOffset || 'G40';
        const toolLength = currentPath.gCodes?.toolLength || 'G49';
        updateCodeTables(paths, animationState.currentPathIndex, feedMode, distanceMode, coordinateSystem, toolOffset, toolLength);
        console.debug(`Non-motion path complete: Updated code tables with feedMode=${feedMode}, distanceMode=${distanceMode}, coordinateSystem=${coordinateSystem}, toolOffset=${toolOffset}, toolLength=${toolLength} at pathIndex=${animationState.currentPathIndex}`);
        animationState.nonMotionDelayUntil = null;
        animationState.currentPathIndex++;
        animationState.progress = 0;
        animationState.startTime = null;
        continue;
      }

      const result = drawPath(ctx, currentPath, scale, offsetX, offsetY, canvasSize, isMobile, showArrows, warningsDiv, warningLines, animationState.progress);
      if (result.isInvalid && !warningLines.has(currentPath.lineNumber)) {
        invalidArcs.push(result);
        warningLines.add(currentPath.lineNumber);
        animationState.hasInvalidPath = true;
      }

      const feedMode = currentPath.gCodes?.feedMode || 'G94';
      const distanceMode = currentPath.gCodes?.distanceMode || 'G90';
      const coordinateSystem = currentPath.gCodes?.coordinateSystem || 'G54';
      const toolOffset = currentPath.gCodes?.toolOffset || 'G40';
      const toolLength = currentPath.gCodes?.toolLength || 'G49';
      updateCodeTables(paths, animationState.currentPathIndex, feedMode, distanceMode, coordinateSystem, toolOffset, toolLength);
      console.debug(`Current path: Updated code tables with feedMode=${feedMode}, distanceMode=${distanceMode}, coordinateSystem=${coordinateSystem}, toolOffset=${toolOffset}, toolLength=${toolLength} at pathIndex=${animationState.currentPathIndex}`);

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

      if (animationState.progress >= 1) {
        animationState.currentPathIndex++;
        animationState.progress = 0;
        animationState.startTime = null;
        continue;
      }
      break;
    }

    if (invalidArcs.length > 0 && warningsDiv) {
      invalidArcs.forEach(arc => {
        if (!warningLines.has(arc.lineNumber)) {
          warningsDiv.textContent += `Error: Invalid arc at line ${arc.lineNumber + 1}: Zero radius arc from (${arc.startX.toFixed(2)}, ${arc.startY.toFixed(2)}) to (${arc.endX.toFixed(2)}, ${arc.endY.toFixed(2)}). Pausing.\n`;
          warningLines.add(arc.lineNumber);
        }
      });
      warningsDiv.classList.add('error');
      console.debug(`Animation paused due to invalid arcs at index ${animationState.currentPathIndex}`);
      animationState.hasInvalidPath = true;
      animationState.isAnimating = false;
      const feedMode = animationState.currentPathIndex < paths.length ? paths[animationState.currentPathIndex]?.gCodes?.feedMode : 'G94';
      const distanceMode = animationState.currentPathIndex < paths.length ? paths[animationState.currentPathIndex]?.gCodes?.distanceMode : 'G90';
      const coordinateSystem = animationState.currentPathIndex < paths.length ? paths[animationState.currentPathIndex]?.gCodes?.coordinateSystem : 'G54';
      const toolOffset = animationState.currentPathIndex < paths.length ? paths[animationState.currentPathIndex]?.gCodes?.toolOffset : 'G40';
      const toolLength = animationState.currentPathIndex < paths.length ? paths[animationState.currentPathIndex]?.gCodes?.toolLength : 'G49';
      updateCodeTables(paths, animationState.currentPathIndex, feedMode, distanceMode, coordinateSystem, toolOffset, toolLength);
      console.debug(`Invalid arcs: Updated code tables with feedMode=${feedMode}, distanceMode=${distanceMode}, coordinateSystem=${coordinateSystem}, toolOffset=${toolOffset}, toolLength=${toolLength} at pathIndex=${animationState.currentPathIndex}`);
      updateButtonStates();
      if (onComplete) onComplete();
      return;
    }

    if (animationState.currentPathIndex >= paths.length) {
      console.debug(`Animation completed: currentPathIndex=${animationState.currentPathIndex}, progress=${animationState.progress}`);
      animationState.isAnimating = false;
      highlightLine(-1);
      const feedMode = paths.length > 0 ? paths[paths.length - 1].gCodes?.feedMode : 'G94';
      const distanceMode = paths.length > 0 ? paths[paths.length - 1].gCodes?.distanceMode : 'G90';
      const coordinateSystem = paths.length > 0 ? paths[paths.length - 1].gCodes?.coordinateSystem : 'G54';
      const toolOffset = paths.length > 0 ? paths[paths.length - 1].gCodes?.toolOffset : 'G40';
      const toolLength = paths.length > 0 ? paths[paths.length - 1].gCodes?.toolLength : 'G49';
      updateCodeTables(paths, paths.length - 1, feedMode, distanceMode, coordinateSystem, toolOffset, toolLength);
      console.debug(`Animation completed: Updated code tables with feedMode=${feedMode}, distanceMode=${distanceMode}, coordinateSystem=${coordinateSystem}, toolOffset=${toolOffset}, toolLength=${toolLength} at pathIndex=${paths.length - 1}`);
      updateButtonStates();
      if (onComplete) onComplete();
      return;
    }

    animationState.animationFrameId = requestAnimationFrame((ts) => animateToolpath(ts, {
      paths, ctx, canvasSize, isMobile, currentBounds, scale, offsetX, offsetY,
      minX, maxX, minY, maxY, showArrows, drawRange, drawBound, warningsDiv,
      rangesDiv, warningLines, invalidArcs, onComplete
    }));
  } catch (error) {
    console.error(`Animation error at line ${animationState.currentPathIndex < paths.length ? paths[animationState.currentPathIndex].lineNumber + 1 : 'unknown'}:`, error);
    animationState.isAnimating = false;
    animationState.hasInvalidPath = true;
    highlightLine(animationState.currentPathIndex < paths.length ? paths[animationState.currentPathIndex].lineNumber : -1);
    if (warningsDiv) {
      warningsDiv.textContent += `Error: Animation stopped due to error: ${error.message}\n`;
      warningsDiv.classList.add('error');
    }
    const feedMode = animationState.currentPathIndex < paths.length ? paths[animationState.currentPathIndex]?.gCodes?.feedMode : 'G94';
    const distanceMode = animationState.currentPathIndex < paths.length ? paths[animationState.currentPathIndex]?.gCodes?.distanceMode : 'G90';
    const coordinateSystem = animationState.currentPathIndex < paths.length ? paths[animationState.currentPathIndex]?.gCodes?.coordinateSystem : 'G54';
    const toolOffset = animationState.currentPathIndex < paths.length ? paths[animationState.currentPathIndex]?.gCodes?.toolOffset : 'G40';
    const toolLength = animationState.currentPathIndex < paths.length ? paths[animationState.currentPathIndex]?.gCodes?.toolLength : 'G49';
    updateCodeTables(paths, animationState.currentPathIndex, feedMode, distanceMode, coordinateSystem, toolOffset, toolLength);
    console.debug(`Animation error: Updated code tables with feedMode=${feedMode}, distanceMode=${distanceMode}, coordinateSystem=${coordinateSystem}, toolOffset=${toolOffset}, toolLength=${toolLength} at pathIndex=${animationState.currentPathIndex}`);
    updateButtonStates();
    if (onComplete) onComplete();
  }
}