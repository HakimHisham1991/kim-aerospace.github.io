console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { validCodes, defaultGCodes, defaultMCodes } from './gcodeConfig.js';
import { normalizeCode, warnedLines } from './codeNormalizer.js';
import { processTokens } from './tokenProcessor.js';
import { createPath, updateState } from './pathBuilder.js';
import { logError } from './errorHandler.js';

/**
 * Core G-code parsing logic
 * @module gcodeParserCore
 */

/**
 * Placeholder function for G90 (Absolute Distance Mode)
 * @param {Object} state - Current machine state
 */
function handleG90(state) {
  console.debug('G90 (Absolute Distance Mode) activated - placeholder, no effect on calculations');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Placeholder function for G91 (Incremental Distance Mode)
 * @param {Object} state - Current machine state
 */
function handleG91(state) {
  console.debug('G91 (Incremental Distance Mode) activated - placeholder, no effect on calculations');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Placeholder function for G54 (Coordinate System 1)
 * @param {Object} state - Current machine state
 */
function handleG54(state) {
  console.debug('G54 (Coordinate System 1) activated - placeholder, no effect on calculations');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Placeholder function for G55 (Coordinate System 2)
 * @param {Object} state - Current machine state
 */
function handleG55(state) {
  console.debug('G55 (Coordinate System 2) activated - placeholder, no effect on calculations');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Placeholder function for G56 (Coordinate System 3)
 * @param {Object} state - Current machine state
 */
function handleG56(state) {
  console.debug('G56 (Coordinate System 3) activated - placeholder, no effect on calculations');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Placeholder function for G57 (Coordinate System 4)
 * @param {Object} state - Current machine state
 */
function handleG57(state) {
  console.debug('G57 (Coordinate System 4) activated - placeholder, no effect on calculations');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Placeholder function for G58 (Coordinate System 5)
 * @param {Object} state - Current machine state
 */
function handleG58(state) {
  console.debug('G58 (Coordinate System 5) activated - placeholder, no effect on calculations');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Placeholder function for G59 (Coordinate System 6)
 * @param {Object} state - Current machine state
 */
function handleG59(state) {
  console.debug('G59 (Coordinate System 6) activated - placeholder, no effect on calculations');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Placeholder function for G40 (Tool Offset Cancellation)
 * @param {Object} state - Current machine state
 */
function handleG40(state) {
  console.debug('G40 (Tool Offset Cancellation) activated - placeholder, no effect on calculations');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Placeholder function for G41 (Tool Offset Left)
 * @param {Object} state - Current machine state
 */
function handleG41(state) {
  console.debug('G41 (Tool Offset Left) activated - placeholder, no effect on calculations');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Placeholder function for G42 (Tool Offset Right)
 * @param {Object} state - Current machine state
 */
function handleG42(state) {
  console.debug('G42 (Tool Offset Right) activated - placeholder, no effect on calculations');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Placeholder function for G43 (Tool Length Compensation Positive)
 * @param {Object} state - Current machine state
 */
function handleG43(state) {
  console.debug('G43 (Tool Length Compensation Positive) activated - placeholder, no effect on calculations');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Placeholder function for G44 (Tool Length Compensation Negative)
 * @param {Object} state - Current machine state
 */
function handleG44(state) {
  console.debug('G44 (Tool Length Compensation Negative) activated - placeholder, no effect on calculations');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Placeholder function for G49 (Tool Length Compensation Cancel)
 * @param {Object} state - Current machine state
 */
function handleG49(state) {
  console.debug('G49 (Tool Length Compensation Cancel) activated - placeholder, no effect on calculations');
  // Placeholder: No effect on rendering or calculations
}

/**
 * Parses G-code into paths and tracks active G-codes and M-codes
 * @param {string} displayContent - G-code content
 * @returns {Object} Parsed paths and bounds
 */
export function parseGcode(displayContent) {
  console.debug(`Parsing G-code: ${displayContent}`);
  const infosDiv = document.getElementById('infosDiv');
  const warningsDiv = document.getElementById('warningsDiv');
  if (infosDiv) infosDiv.textContent = '';
  if (warningsDiv) warningsDiv.textContent = '';
  warnedLines.clear(); // Reset warnings for new parse

  // Initialize state
  let state = {
    currentX: 0, currentY: 0, currentZ: 0, currentA: 0, currentB: 0,
    currentC: 0, currentE: 0, currentU: 0, currentV: 0, currentW: 0,
    minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity,
    currentMode: 'G00',
    activeGCodes: { ...defaultGCodes },
    activeMCodes: { ...defaultMCodes }
  };
  const paths = [];

  const lines = displayContent.split(/\r?\n/);
  lines.forEach((line, index) => {
    line = line.replace(/ $.*?$/g, '').trim();
    if (!line) return;

    const tokens = line.split(/\s+/);
    let tokenData = processTokens(tokens, index, warningsDiv);
    if (!tokenData.isValid) {
      paths.push(createPath(state, tokenData, index));
      console.debug(`Added invalid path at line ${index + 1}: mode=${tokenData.gCode || state.currentMode}, isValid=false`);
      return;
    }

    // Handle M-codes
    if (tokenData.mCode) {
      if (['M03', 'M04', 'M05'].includes(tokenData.mCode)) {
        state.activeMCodes.spindle = tokenData.mCode;
      } else if (['M07', 'M08', 'M09'].includes(tokenData.mCode)) {
        state.activeMCodes.coolant = tokenData.mCode;
      } else if (tokenData.mCode === 'M30') {
        state.activeGCodes = { ...defaultGCodes }; // Reset to defaults, including G49
        state.activeMCodes = { ...defaultMCodes };
        console.debug(`Reset activeGCodes to defaultGCodes at line ${index + 1} (M30):`, state.activeGCodes);
      }
      paths.push(createPath(state, tokenData, index));
      console.debug(`Added M-code path at line ${index + 1}: mode=null, mCode=${tokenData.mCode}, isValid=true`);
      return;
    }

    // Update G-code state
    const gCode = tokenData.gCode || state.currentMode;
    if (gCode) {
      if (['G00', 'G01', 'G02', 'G03'].includes(gCode)) {
        state.currentMode = gCode;
        state.activeGCodes.motion = gCode;
      } else if (['G17', 'G18', 'G19'].includes(gCode)) {
        state.activeGCodes.plane = gCode;
      } else if (['G20', 'G21'].includes(gCode)) {
        state.activeGCodes.units = gCode;
      } else if (['G90', 'G91'].includes(gCode)) {
        state.activeGCodes.distanceMode = gCode;
        if (gCode === 'G90') {
          handleG90(state);
        } else {
          handleG91(state);
        }
        console.debug(`Updated activeGCodes.distanceMode to ${gCode} at line ${index + 1}`);
      } else if (['G93', 'G94', 'G95'].includes(gCode)) {
        state.activeGCodes.feedMode = gCode;
        console.debug(`Updated activeGCodes.feedMode to ${gCode} at line ${index + 1}`);
      } else if (['G54', 'G55', 'G56', 'G57', 'G58', 'G59'].includes(gCode)) {
        state.activeGCodes.coordinateSystem = gCode;
        if (gCode === 'G54') {
          handleG54(state);
        } else if (gCode === 'G55') {
          handleG55(state);
        } else if (gCode === 'G56') {
          handleG56(state);
        } else if (gCode === 'G57') {
          handleG57(state);
        } else if (gCode === 'G58') {
          handleG58(state);
        } else if (gCode === 'G59') {
          handleG59(state);
        }
        console.debug(`Updated activeGCodes.coordinateSystem to ${gCode} at line ${index + 1}`);
      } else if (['G40', 'G41', 'G42'].includes(gCode)) {
        state.activeGCodes.toolOffset = gCode;
        if (gCode === 'G40') {
          handleG40(state);
        } else if (gCode === 'G41') {
          handleG41(state);
        } else if (gCode === 'G42') {
          handleG42(state);
        }
        console.debug(`Updated activeGCodes.toolOffset to ${gCode} at line ${index + 1}`);
      } else if (['G43', 'G44', 'G49'].includes(gCode)) {
        state.activeGCodes.toolLength = gCode;
        if (gCode === 'G43') {
          handleG43(state);
        } else if (gCode === 'G44') {
          handleG44(state);
        } else if (gCode === 'G49') {
          handleG49(state);
        }
        console.debug(`Updated activeGCodes.toolLength to ${gCode} at line ${index + 1}`);
      } else {
        paths.push(createPath(state, { ...tokenData, gCode }, index));
        console.debug(`Added non-motion G-code path at line ${index + 1}: mode=${gCode}, isValid=true`);
        return;
      }
    }

    // Create path and update bounds
    const path = createPath(state, { ...tokenData, gCode }, index);
    paths.push(path);
    console.debug(`Created path at line ${index + 1}: feedMode=${state.activeGCodes.feedMode}, distanceMode=${state.activeGCodes.distanceMode}, coordinateSystem=${state.activeGCodes.coordinateSystem}, toolOffset=${state.activeGCodes.toolOffset}, toolLength=${state.activeGCodes.toolLength}, mode=${gCode}, isValid=${path.isValid}`);

    // Update state and bounds
    if (path.isValid) {
      state = updateState(state, tokenData, gCode);
    }
  });

  console.debug(`Parse complete: ${paths.length} paths created`);
  return {
    paths,
    minX: isFinite(state.minX) ? state.minX : -100,
    maxX: isFinite(state.maxX) ? state.maxX : 100,
    minY: isFinite(state.minY) ? state.minY : -100,
    maxY: isFinite(state.maxY) ? state.maxY : 100
  };
}