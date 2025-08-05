// uiAnimationControls.js
console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { displayContent } from './fileHandler.js';
import { animationState, pauseAnimation } from './animationController.js';
import { parseGcode } from './gcodeParserCore.js';
import { renderToolpath } from './toolpathRendererCore.js';
import { updateAxisTable } from './axisTableUpdater.js';
import { updateButtonStates } from './uiButtonStateManager.js';
import { logState } from './uiDebugManager.js';
import { UI_CONFIG } from './uiConfig.js';
import { currentScale, showArrows, drawBound, drawRange } from './uiControls.js';

/**
 * Steps forward one segment and pauses
 */
export function stepForward() {
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
    animationState.progress = 1;
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
export function stepBackward() {
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