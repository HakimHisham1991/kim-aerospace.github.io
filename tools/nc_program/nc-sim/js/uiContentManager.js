// uiContentManager.js
console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { displayContent, setDisplayContent, updateFileStats } from './fileHandler.js';
import { parseGcode } from './gcodeParserCore.js';
import { renderToolpath } from './toolpathRendererCore.js';
import { resetAnimation } from './animationController.js';
import { calculateFitBounds, setBounds } from './boundsManager.js';
import { updateButtonStates, setContentEdited } from './uiButtonStateManager.js';
import { logState } from './uiDebugManager.js';
import { UI_CONFIG } from './uiConfig.js';
import { currentScale, showArrows, drawBound, drawRange } from './uiControls.js';

/**
 * Reloads the content from content div and resets the canvas
 */
export function reloadContent() {
  const contentDiv = document.getElementById(UI_CONFIG.ELEMENT_IDS.CONTENT_DIV);
  if (!contentDiv || !displayContent) return;

  const lineSpans = contentDiv.querySelectorAll('span.line');
  const newContent = Array.from(lineSpans)
    .map(span => span.textContent.replace(/\n$/, ''))
    .join('\n');

  if (!newContent) return;

  setDisplayContent(newContent);
  updateFileStats(newContent);
  setContentEdited(false);

  resetAnimation();
  const { paths, minX, maxX, minY, maxY } = parseGcode(newContent);
  const canvas = document.getElementById(UI_CONFIG.ELEMENT_IDS.TOOLPATH_CANVAS);
  const aspectRatio = canvas?.width / canvas?.height || 1;
  setBounds(calculateFitBounds(minX, maxX, minY, maxY, aspectRatio));
  renderToolpath(newContent, paths, minX, maxX, minY, maxY, currentScale, showArrows, drawBound, drawRange, false);
  logState(`Reload pressed → content reloaded, canvas reset`);
  updateButtonStates();
}