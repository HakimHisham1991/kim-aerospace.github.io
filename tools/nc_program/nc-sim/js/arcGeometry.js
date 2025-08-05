console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

/**
 * Handles arc geometry calculations for G-code parsing
 * @module arcGeometry
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
    const warningsDiv = document.getElementById('warningsDiv');
    if (warningsDiv) {
      warningsDiv.textContent += `Error: Invalid arc: Distance (${distance.toFixed(3)}) exceeds 2R (${(2 * radius).toFixed(3)}) from (${startX.toFixed(2)}, ${startY.toFixed(2)}) to (${endX.toFixed(2)}, ${endY.toFixed(2)}). Skipping.\n`;
      warningsDiv.classList.add('error');
    }
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
 * Validates an arc for I/J parameters
 * @param {number} startX - Starting X coordinate
 * @param {number} startY - Starting Y coordinate
 * @param {number} endX - Ending X coordinate
 * @param {number} endY - Ending Y coordinate
 * @param {number} i - I offset (center X relative to start)
 * @param {number} j - J offset (center Y relative to start)
 * @returns {boolean} True if the arc is valid, false otherwise
 */
export function validateIJArc(startX, startY, endX, endY, i, j) {
  const centerX = startX + i;
  const centerY = startY + j;
  const radius = Math.sqrt(i * i + j * j);
  if (radius < 0.001) return false;

  const startDistance = Math.sqrt((startX - centerX) ** 2 + (startY - centerY) ** 2);
  const endDistance = Math.sqrt((endX - centerX) ** 2 + (endY - centerY) ** 2);
  const tolerance = 0.01; // Relaxed tolerance for floating-point errors
  const isValid = Math.abs(startDistance - radius) < tolerance && Math.abs(endDistance - radius) < tolerance;

  if (!isValid) {
    console.debug(`Invalid arc: radius=${radius.toFixed(3)}, startDistance=${startDistance.toFixed(3)}, endDistance=${endDistance.toFixed(3)}, tolerance=${tolerance}, I=${i}, J=${j}, from (${startX}, ${startY}) to (${endX}, ${endY})`);
  }

  return isValid;
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