// uiButtonStateManager.js
console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { displayContent } from './fileHandler.js';
import { animationState } from './animationController.js';
import { parseGcode } from './gcodeParserCore.js';
import { UI_CONFIG } from './uiConfig.js';

let contentEdited = false;

/**
 * Sets the content edited state
 * @param {boolean} edited - Whether content has been edited
 */
export function setContentEdited(edited) {
  contentEdited = edited;
  updateButtonStates();
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

  const buttons = [
    { id: UI_CONFIG.ELEMENT_IDS.BUTTONS.PLAY, disabled: playDisabled },
    { id: UI_CONFIG.ELEMENT_IDS.BUTTONS.PAUSE, disabled: pauseDisabled },
    { id: UI_CONFIG.ELEMENT_IDS.BUTTONS.RESET, disabled: resetDisabled },
    { id: UI_CONFIG.ELEMENT_IDS.BUTTONS.SEEK_END, disabled: seekEndDisabled },
    { id: UI_CONFIG.ELEMENT_IDS.BUTTONS.STEP_FORWARD, disabled: stepForwardDisabled },
    { id: UI_CONFIG.ELEMENT_IDS.BUTTONS.STEP_BACKWARD, disabled: stepBackwardDisabled },
    { id: UI_CONFIG.ELEMENT_IDS.BUTTONS.RELOAD, disabled: reloadDisabled },
    { id: UI_CONFIG.ELEMENT_IDS.BUTTONS.ARROW_TOGGLE, disabled: arrowToggleDisabled },
    { id: UI_CONFIG.ELEMENT_IDS.BUTTONS.DRAW_RANGE_TOGGLE, disabled: drawRangeToggleDisabled },
    { id: UI_CONFIG.ELEMENT_IDS.BUTTONS.DRAW_BOUND_TOGGLE, disabled: drawBoundToggleDisabled }
  ];

  buttons.forEach(({ id, disabled }) => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = disabled;
  });

  const contentDiv = document.getElementById(UI_CONFIG.ELEMENT_IDS.CONTENT_DIV);
  if (contentDiv) contentDiv.contentEditable = isAnimating ? 'false' : 'true';
}