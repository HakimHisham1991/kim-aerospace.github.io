console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { normalizeCode, warnedLines } from './codeNormalizer.js';
import { logError } from './errorHandler.js';

/**
 * Processes G-code tokens and validates them
 * @module tokenProcessor
 */

/**
 * Processes tokens from a G-code line
 * @param {string[]} tokens - Array of tokens
 * @param {number} index - Line index
 * @param {HTMLElement} warningsDiv - DOM element for warnings
 * @returns {Object} Parsed token data
 */
export function processTokens(tokens, index, warningsDiv) {
  let tokenData = {
    x: null, y: null, z: null, a: null, b: null, c: null, e: null, u: null, v: null, w: null,
    i: 0, j: 0, r: null, gCode: null, mCode: null, f: null, s: null,
    hasZ: false, hasA: false, hasB: false, hasC: false, hasE: false,
    hasU: false, hasV: false, hasW: false, hasR: false, hasIJ: false,
    hasF: false, hasS: false,
    isValid: true
  };

  tokens.forEach(token => {
    token = token.toUpperCase();
    if (token.startsWith('G')) {
      tokenData.gCode = normalizeCode(token, index);
      if (!tokenData.gCode) {
        tokenData.isValid = false;
        logError(`Invalid G-code '${token}' at line ${index + 1}`, `g-${index}`, warningsDiv);
      }
    } else if (token.startsWith('M')) {
      tokenData.mCode = normalizeCode(token, index);
      if (!tokenData.mCode) {
        tokenData.isValid = false;
        logError(`Invalid M-code '${token}' at line ${index + 1}`, `m-${index}`, warningsDiv);
      }
    } else {
      const axes = { X: 'x', Y: 'y', Z: 'z', A: 'a', B: 'b', C: 'c', E: 'e', U: 'u', V: 'v', W: 'w', I: 'i', J: 'j', R: 'r', F: 'f', S: 's' };
      const key = token[0];
      if (axes[key]) {
        const match = token.match(/^([XYZABCEUVWIJFRS])(-?\d*\.?\d*)$/i);
        if (match) {
          const value = parseFloat(match[2]);
          if (!isNaN(value)) {
            tokenData[axes[key]] = value;
            if (['Z', 'A', 'B', 'C', 'E', 'U', 'V', 'W'].includes(key)) {
              tokenData[`has${key}`] = true;
            }
            if (key === 'R') tokenData.hasR = true;
            if (['I', 'J'].includes(key)) tokenData.hasIJ = true;
            if (key === 'F') tokenData.hasF = true;
            if (key === 'S') tokenData.hasS = true;
            console.debug(`Processed parameter ${key}${value} at line ${index + 1}`);
          } else {
            tokenData.isValid = false;
            logError(`Invalid ${key} value '${token}' at line ${index + 1}`, `${key.toLowerCase()}-${index}`, warningsDiv);
          }
        } else {
          tokenData.isValid = false;
          logError(`Invalid parameter format '${token}' at line ${index + 1}`, `${key.toLowerCase()}-${index}`, warningsDiv);
        }
      } else {
        tokenData.isValid = false;
        logError(`Unrecognized token '${token}' at line ${index + 1}`, `token-${index}`, warningsDiv);
      }
    }
  });

  return tokenData;
}