// uiConfig.js
console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

/**
 * UI configuration constants
 * @module uiConfig
 */
export const UI_CONFIG = {
  ELEMENT_IDS: {
    FILE_INPUT: 'fileInput',
    CONTENT_DIV: 'contentDiv',
    DEBUG_DIV: 'debugDiv',
    FILE_NAME_DISPLAY: 'fileNameDisplay',
    WARNINGS_DIV: 'warningsDiv',
    TOOLPATH_CANVAS: 'toolpathCanvas',
    BUTTONS: {
      PLAY: 'playBtn',
      PAUSE: 'pauseBtn',
      RESET: 'resetBtn',
      SEEK_END: 'seekEndBtn',
      STEP_FORWARD: 'stepForwardBtn',
      STEP_BACKWARD: 'stepBackwardBtn',
      UNDO: 'undoBtn',
      SAVE_FILE: 'saveFileBtn',
      CLEAR_FILE: 'clearFileBtn',
      RELOAD: 'reloadBtn',
      CLEAR_DEBUG: 'clearDebugBtn',
      ARROW_TOGGLE: 'arrowToggle',
      DRAW_RANGE_TOGGLE: 'drawRangeToggle',
      DRAW_BOUND_TOGGLE: 'drawBoundToggle',
      ZOOM_IN: 'zoomInBtn',
      ZOOM_OUT: 'zoomOutBtn',
      HOME: 'homeBtn',
      PAN_UP: 'panUpBtn',
      PAN_DOWN: 'panDownBtn',
      PAN_LEFT: 'panLeftBtn',
      PAN_RIGHT: 'panRightBtn',
      FIT: 'fitBtn'
    }
  },
  MAX_DEBUG_MESSAGES: 20,
  DEFAULT_SCALE: 1,
  DEFAULT_VISIBILITY: {
    SHOW_ARROWS: false,
    DRAW_BOUND: false,
    DRAW_RANGE: false
  }
};