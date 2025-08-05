import { warnedLines } from './codeNormalizer.js';

/**
 * Centralized error handling for G-code parsing
 * @module errorHandler
 */

/**
 * Logs an error message to warningsDiv and warnedLines
 * @param {string} message - Error message
 * @param {string} key - Unique key for the warning
 * @param {HTMLElement} [warningsDiv] - DOM element for warnings
 */
export function logError(message, key, warningsDiv) {
  if (warningsDiv && !warnedLines.has(key)) {
    warningsDiv.textContent += `${message}. Skipping.\n`;
    warningsDiv.classList.add('error');
    warnedLines.add(key);
    console.debug(`Added warning to warnedLines: ${key}`);
  }
}