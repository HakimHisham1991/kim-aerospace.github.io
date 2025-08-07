import { defaultGCodes, defaultMCodes } from './gcodeConfig.js';

/**
 * M-code handling logic
 * @module mcodeHandler
 */

/**
 * Placeholder function for M00 (Program Stop)
 * @param {Object} state - Current machine state
 */
export function handleM00(state) {
  console.debug('M00 (Program Stop) activated - pausing animation');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Placeholder function for M01 (Optional Stop)
 * @param {Object} state - Current machine state
 */
export function handleM01(state) {
  console.debug('M01 (Optional Stop) activated - pausing animation');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Placeholder function for M98 (Subprogram Call)
 * @param {Object} state - Current machine state
 */
export function handleM98(state) {
  console.debug('M98 (Subprogram Call) activated - placeholder, no effect on calculations');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Placeholder function for M99 (Subprogram End)
 * @param {Object} state - Current machine state
 */
export function handleM99(state) {
  console.debug('M99 (Subprogram End) activated - placeholder, no effect on calculations');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Placeholder function for M198 (External Subprogram Call)
 * @param {Object} state - Current machine state
 */
export function handleM198(state) {
  console.debug('M198 (External Subprogram Call) activated - placeholder, no effect on calculations');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Handles M06 (Tool Change) and updates tool number
 * @param {Object} state - Current machine state
 * @param {Object} tokenData - Token data from processTokens
 */
export function handleM06(state, tokenData) {
  console.debug(`M06 (Tool Change) activated - tool number set to ${tokenData.t || 'T00'}`);
  if (tokenData.hasT) {
    state.activeMCodes.toolNumber = `T${String(tokenData.t).padStart(2, '0')}`;
  }
}

/**
 * Handles M-code logic and updates state
 * @param {Object} state - Current machine state
 * @param {string} mCode - M-code to process
 * @param {Object} tokenData - Token data from processTokens
 * @param {number} index - Line index
 * @returns {Object} Result object with isValid flag
 */
export function handleMCode(state, mCode, tokenData, index) {
  let isValid = true;

  if (['M03', 'M04', 'M05'].includes(mCode)) {
    state.activeMCodes.spindle = mCode;
  } else if (['M07', 'M08', 'M09'].includes(mCode)) {
    state.activeMCodes.coolant = mCode;
  } else if (['M00', 'M01'].includes(mCode)) {
    state.activeMCodes.stop = mCode;
    if (mCode === 'M00') handleM00(state);
    if (mCode === 'M01') handleM01(state);
  } else if (['M98', 'M99', 'M198'].includes(mCode)) {
    state.activeMCodes.subprogram = mCode;
    if (mCode === 'M98') handleM98(state);
    if (mCode === 'M99') handleM99(state);
    if (mCode === 'M198') handleM198(state);
  } else if (mCode === 'M06') {
    if (tokenData.hasT) {
      state.activeMCodes.toolChange = mCode; // Non-modal, reset after each line
      handleM06(state, tokenData);
    } else {
      isValid = false;
      const warningsDiv = document.getElementById('warningsDiv');
      if (warningsDiv) {
        warningsDiv.textContent += `Error: M06 (Tool Change) requires TXX parameter at line ${index + 1}.\n`;
        warningsDiv.classList.add('error');
      }
    }
  } else if (mCode === 'M30') {
    state.activeGCodes = { ...defaultGCodes }; // Reset to defaults, including G80
    state.activeMCodes = { ...defaultMCodes, stop: null, subprogram: null, toolChange: null };
    state.previousCoordinateSystem = 'G54'; // Reset previous coordinate system
    state.currentF = 0;
    state.currentS = 0;
    console.debug(`Reset activeGCodes to defaultGCodes at line ${index + 1} (M30):`, state.activeGCodes);
  } else {
    isValid = false;
  }

  return { isValid };
}