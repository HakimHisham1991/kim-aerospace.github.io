console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { validCodes, defaultGCodes, defaultMCodes } from './gcodeConfig.js';
import { normalizeCode, warnedLines } from './codeNormalizer.js';
import { processTokens } from './tokenProcessor.js';
import { createPath, updateState } from './pathBuilder.js';
import { logError } from './errorHandler.js';
import { handleGCode } from './gcodeHandler.js';
import { handleMCode } from './mcodeHandler.js';

/**
 * Core G-code parsing logic
 * @module gcodeParserCore
 */

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
    currentF: 0, // Initialize feed rate
    currentS: 0, // Initialize spindle speed
    activeGCodes: { ...defaultGCodes },
    activeMCodes: { ...defaultMCodes, stop: null, subprogram: null }, // Initialize subprogram as null
    previousCoordinateSystem: 'G54' // Track previous coordinate system for G53 reversion
  };
  const paths = [];

  const lines = displayContent.split(/\r?\n/);
  lines.forEach((line, index) => {
    line = line.replace(/ $.*?$/g, '').trim();
    if (!line) return;

    // Extract comments in parentheses and remove them from the line
    const commentRegex = /\([^)]*\)/g;
    const cleanedLine = line.replace(commentRegex, '').trim();
    if (!cleanedLine) {
      console.debug(`Skipped line ${index + 1}: empty after removing comments`);
      return;
    }

    const tokens = cleanedLine.split(/\s+/);
    let tokenData = processTokens(tokens, index, warningsDiv);
    if (!tokenData.isValid) {
      paths.push(createPath(state, tokenData, index));
      console.debug(`Added invalid path at line ${index + 1}: mode=${tokenData.gCode || state.currentMode}, isValid=false`);
      return;
    }

    // Reset stop and subprogram M-codes for each line unless explicitly set
    state.activeMCodes.stop = null;
    state.activeMCodes.subprogram = null;

    // Handle M-codes from tokenData
    if (tokenData.mCode) {
      const mCodes = [tokenData.mCode]; // Single M-code from tokenData
      // Check all tokens for additional M-codes
      tokens.forEach(token => {
        if (token.toUpperCase().startsWith('M') && token !== tokenData.mCode) {
          const normalized = normalizeCode(token, index);
          if (normalized && validCodes.has(normalized)) {
            mCodes.push(normalized);
          }
        }
      });

      mCodes.forEach((mCode, mIndex) => {
        const mCodeResult = handleMCode(state, mCode, tokenData, index);
        const pathTokenData = { ...tokenData, mCode, isValid: mCodeResult.isValid };
        paths.push(createPath(state, pathTokenData, index));
        console.debug(`Added M-code path at line ${index + 1}: mode=null, mCode=${mCode}, isValid=${mCodeResult.isValid}, s=${pathTokenData.s}, hasS=${pathTokenData.hasS}`);
        // Update state for M-codes with S parameter (e.g., M03 S1000)
        if (pathTokenData.hasS) {
          state = updateState(state, pathTokenData, null);
          console.debug(`Updated state for M-code with S at line ${index + 1}: currentS=${state.currentS}`);
        }
      });
      return; // Skip G-code processing if M-codes were found
    }

    // Handle G-code state
    const gCode = tokenData.gCode || state.currentMode;
    let currentCoordinateSystem = state.activeGCodes.coordinateSystem; // Store current for potential G53 reversion

    const gCodeResult = handleGCode(state, gCode, tokenData, index);
    if (gCodeResult.skip) {
      paths.push(createPath(state, { ...tokenData, gCode }, index));
      console.debug(`Added non-motion G-code path at line ${index + 1}: mode=${gCode}, isValid=true`);
      return;
    }

    // Create path and update bounds
    const path = createPath(state, { ...tokenData, gCode }, index);
    paths.push(path);
    console.debug(`Created path at line ${index + 1}: feedMode=${state.activeGCodes.feedMode}, distanceMode=${state.activeGCodes.distanceMode}, coordinateSystem=${state.activeGCodes.coordinateSystem}, toolOffset=${state.activeGCodes.toolOffset}, toolLength=${state.activeGCodes.toolLength}, retractPlane=${state.activeGCodes.retractPlane}, rotation=${state.activeGCodes.rotation}, holeCycle=${state.activeGCodes.holeCycle}, mode=${gCode}, isValid=${path.isValid}, s=${path.s}, hasS=${tokenData.hasS}`);

    // Update state and bounds
    if (path.isValid) {
      state = updateState(state, tokenData, gCode);
    }

    // Revert coordinate system after G53
    if (gCode === 'G53') {
      state.activeGCodes.coordinateSystem = state.previousCoordinateSystem;
      console.debug(`Reverted activeGCodes.coordinateSystem to ${state.previousCoordinateSystem} after G53 at line ${index + 1}`);
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