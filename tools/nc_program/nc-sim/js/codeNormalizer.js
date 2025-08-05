console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { validCodes } from './gcodeConfig.js';

/**
 * Handles G-code and M-code validation and normalization
 * @module codeNormalizer
 */

export const warnedLines = new Set(); // Track lines with warnings to avoid duplicates

/**
 * Normalizes G-code or M-code to a standard two-digit format
 * @param {string} code - Input code (e.g., 'G0', 'G00', 'G000', 'M8', 'M08')
 * @param {number} index - Line number for error reporting
 * @returns {string|null} Normalized code (e.g., 'G00', 'M08') or null if invalid
 */
export function normalizeCode(code, index) {
  code = code.toUpperCase().trim();
  const match = code.match(/^([GM])(\d+)$/);
  if (!match) {
    const warningsDiv = document.getElementById('warningsDiv');
    if (warningsDiv && !warnedLines.has(`invalid-${index}`)) {
      warningsDiv.textContent += `Error: Invalid code format '${code}' at line ${index + 1}. Expected G or M followed by digits.\n`;
      warningsDiv.classList.add('error');
      warnedLines.add(`invalid-${index}`);
    }
    return null;
  }

  const letter = match[1];
  const num = parseInt(match[2], 10).toString();
  const paddedNum = num.length === 1 && validCodes.has(`${letter}0${num}`) ? `0${num}` : num;
  const normalized = `${letter}${paddedNum}`;
  
  // Allow G93, G94, G95 as valid non-motion G-codes without warnings
  const validNonMotionGCodes = ['G93', 'G94', 'G95', 'G17', 'G18', 'G19', 'G20', 'G21', 'G90', 'G91', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59', 'G40', 'G41', 'G42', 'G43', 'G44', 'G49'];
  if (letter === 'G' && !['G00', 'G01', 'G02', 'G03'].includes(normalized) && !validNonMotionGCodes.includes(normalized)) {
    const warningsDiv = document.getElementById('warningsDiv');
    const key = `${letter}-${num}-${index}`;
    if (warningsDiv && !warnedLines.has(key)) {
      warningsDiv.textContent += `Error: Unrecognized G-code '${code}' (normalized to '${normalized}') at line ${index + 1}. Skipping.\n`;
      warningsDiv.classList.add('error');
      warnedLines.add(key);
      console.debug(`Added warning to warnedLines: ${key}`);
    }
    return normalized; // Still return normalized code for state tracking
  }
  
  if (!validCodes.has(normalized) && !validNonMotionGCodes.includes(normalized)) {
    const warningsDiv = document.getElementById('warningsDiv');
    const key = `${letter}-${num}-${index}`;
    if (warningsDiv && !warnedLines.has(key)) {
      warningsDiv.textContent += `Error: Unrecognized ${letter}-code '${code}' (normalized to '${normalized}') at line ${index + 1}. Skipping.\n`;
      warningsDiv.classList.add('error');
      warnedLines.add(key);
      console.debug(`Added warning to warnedLines: ${key}`);
    }
    return null;
  }
  
  console.debug(`Normalized code '${code}' to '${normalized}' at line ${index + 1}`);
  return normalized;
}