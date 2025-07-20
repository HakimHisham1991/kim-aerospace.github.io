console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { validCodes } from './gcodeConfig.js';

/**
 * Parses G-code and calculates arc geometry
 * @module gcodeParser
 */

/**
 * Calculates the center of an arc
 * @param {number} startX - Starting X coordinate
 * @param {number} startY - Starting Y coordinate
 * @param {number} endX - Ending X coordinate
 * @param {number} endY - Ending Y coordinate
 * @param {number} r - Radius
 * @param {string} mode - G02 or G03
 * @returns {Array|null} Center coordinates [x, y] or null if invalid
 */
export function calculateArcCenter(startX, startY, endX, endY, r, mode) {
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const radius = Math.abs(r);
  if (distance > 2 * radius) {
    document.getElementById('warningsDiv').textContent += `Invalid arc: Distance (${distance.toFixed(3)}) exceeds 2R (${(2 * radius).toFixed(3)}) from (${startX}, ${startY}) to (${endX}, ${endY}). Skipping.\n`;
    document.getElementById('warningsDiv').classList.add('error');
    return null;
  }
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const q = Math.sqrt(radius * radius - (distance / 2) * (distance / 2));
  const sign = (mode === 'G02' ? (r >= 0 ? -1 : 1) : (r >= 0 ? 1 : -1)) * (Math.abs(distance - 2 * radius) < 0.001 ? (mode === 'G02' ? -1 : 1) : 1);
  const perpX = -dy;
  const perpY = dx;
  const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);
  if (perpLength < 0.001) return null;
  return [midX + sign * q * perpX / perpLength, midY + sign * q * perpY / perpLength];
}

/**
 * Calculates arc bounds
 * @param {number} startX - Starting X coordinate
 * @param {number} startY - Starting Y coordinate
 * @param {number} endX - Ending X coordinate
 * @param {number} endY - Ending Y coordinate
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {number} radius - Arc radius
 * @param {string} mode - G02 or G03
 * @param {boolean} isMajor - Whether it's a major arc
 * @returns {Object} Bounds {minX, maxX, minY, maxY}
 */
export function calculateArcBounds(startX, startY, endX, endY, centerX, centerY, radius, mode, isMajor) {
  const theta1 = Math.atan2(startY - centerY, startX - centerX);
  let theta2 = Math.atan2(endY - centerY, endX - centerX);
  let theta1Norm = (theta1 + 2 * Math.PI) % (2 * Math.PI);
  let theta2Norm = (theta2 + 2 * Math.PI) % (2 * Math.PI);

  const isFullCircle = Math.abs(startX - endX) < 0.001 && Math.abs(startY - endY) < 0.001;
  let thetaStart, thetaEnd;
  if (isFullCircle) {
    thetaStart = 0;
    thetaEnd = 2 * Math.PI;
  } else if (isMajor) {
    thetaStart = mode === 'G02' ? theta2Norm : theta1Norm;
    thetaEnd = (mode === 'G02' ? theta1Norm : theta2Norm) + (mode === 'G02' ? (theta1Norm <= theta2Norm ? 2 * Math.PI : 0) : (theta2Norm <= theta1Norm ? 2 * Math.PI : 0));
  } else {
    thetaStart = theta1Norm;
    thetaEnd = mode === 'G02' ? theta2Norm - (theta2Norm > theta1Norm ? 2 * Math.PI : 0) : theta2Norm + (theta2Norm < theta1Norm ? 2 * Math.PI : 0);
  }

  const isAngleInArc = (angle) => {
    angle = (angle + 2 * Math.PI) % (2 * Math.PI);
    let start = thetaStart, end = thetaEnd;
    if (isFullCircle) return true;
    if (mode === 'G02') {
      if (isMajor) {
        if (start >= end) end += 2 * Math.PI;
        angle = angle < start ? angle + 2 * Math.PI : angle;
        return angle >= start && angle <= end;
      }
      if (start < end) start += 2 * Math.PI;
      angle = angle < end ? angle + 2 * Math.PI : angle;
      return angle <= start && angle >= end;
    }
    if (start > end) end += 2 * Math.PI;
    angle = angle < start ? angle + 2 * Math.PI : angle;
    return angle >= start && angle <= end;
  };

  let minX = Math.min(startX, endX);
  let maxX = Math.max(startX, endX);
  let minY = Math.min(startY, endY);
  let maxY = Math.max(startY, endY);

  const cardinalAngles = [
    { angle: 0, x: centerX + radius, y: centerY },
    { angle: Math.PI / 2, x: centerX, y: centerY + radius },
    { angle: Math.PI, x: centerX - radius, y: centerY },
    { angle: 3 * Math.PI / 2, x: centerX, y: centerY - radius }
  ];

  cardinalAngles.forEach(({ angle, x, y }) => {
    if (isAngleInArc(angle)) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  });

  return { minX, maxX, minY, maxY };
}

/**
 * Parses G-code into paths
 * @param {string} displayContent - G-code content
 * @returns {Object} Parsed paths and bounds
 */
export function parseGcode(displayContent) {
  let currentX = 0, currentY = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const paths = [];
  let currentMode = 'G00';
  const lines = displayContent.split(/\r?\n/);

  lines.forEach((line, index) => {
    line = line.replace(/\(.*?\)/g, '').trim();
    if (!line) return;

    const codeMatch = line.match(/(^|\s)([GM][0-9.]+)/i);
    if (!codeMatch || !validCodes.has(codeMatch[2].toUpperCase())) return;

    const tokens = line.split(/\s+/);
    let x = currentX, y = currentY, i = 0, j = 0, r = null, mode = currentMode;
    let hasR = false, hasIJ = false;

    tokens.forEach(token => {
      token = token.toUpperCase();
      if (token.startsWith('G')) {
        if (token === 'G00' || token === 'G0') mode = 'G00';
        else if (token === 'G01' || token === 'G1') mode = 'G01';
        else if (token === 'G02' || token === 'G2') mode = 'G02';
        else if (token === 'G03' || token === 'G3') mode = 'G03';
      } else if (token.startsWith('X')) x = parseFloat(token.substring(1));
      else if (token.startsWith('Y')) y = parseFloat(token.substring(1));
      else if (token.startsWith('I')) { i = parseFloat(token.substring(1)); hasIJ = true; }
      else if (token.startsWith('J')) { j = parseFloat(token.substring(1)); hasIJ = true; }
      else if (token.startsWith('R')) { r = parseFloat(token.substring(1)); hasR = true; }
    });

    if (isNaN(x) || isNaN(y)) return;

    if ((mode === 'G02' || mode === 'G03') && hasR && hasIJ) {
      document.getElementById('warningsDiv').textContent += `Warning: Both R and I/J values in G${mode.slice(1)}. Using R.\n`;
      document.getElementById('warningsDiv').classList.add('error');
      i = j = 0;
    }

    paths.push({ startX: currentX, startY: currentY, endX: x, endY: y, i, j, r, mode });

    if (mode === 'G00' || mode === 'G01') {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    } else if (mode === 'G02' || mode === 'G03') {
      let centerX, centerY, radius, isMajor = false;
      if (hasR) {
        radius = Math.abs(r);
        isMajor = r < 0;
        const center = calculateArcCenter(currentX, currentY, x, y, r, mode);
        if (!center) { paths.pop(); return; }
        [centerX, centerY] = center;
      } else if (hasIJ) {
        centerX = currentX + i;
        centerY = currentY + j;
        radius = Math.sqrt(i * i + j * j);
        if (radius < 0.001) {
          document.getElementById('warningsDiv').textContent += `Invalid arc: Zero radius (I=${i}, J=${j}) from (${currentX}, ${currentY}) to (${x}, ${y}). Skipping.\n`;
          document.getElementById('warningsDiv').classList.add('error');
          paths.pop();
          return;
        }
      } else {
        paths.pop();
        return;
      }

      const bounds = calculateArcBounds(currentX, currentY, x, y, centerX, centerY, radius, mode, isMajor);
      minX = Math.min(minX, bounds.minX);
      maxX = Math.max(maxX, bounds.maxX);
      minY = Math.min(minY, bounds.minY);
      maxY = Math.max(maxY, bounds.maxY);
    }

    currentX = x;
    currentY = y;
    currentMode = mode;
  });

  return {
    paths,
    minX: isFinite(minX) ? minX : 0,
    maxX: isFinite(maxX) ? maxX : 0,
    minY: isFinite(minY) ? minY : 0,
    maxY: isFinite(maxY) ? maxY : 0
  };
    }
