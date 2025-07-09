import { validCodes } from './gcodeConfig.js';

export function calculateArcCenter(startX, startY, endX, endY, r, mode) {
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const radius = Math.abs(r);
  if (distance > 2 * radius) {
    const warningDiv = document.getElementById('warningsDiv');
    warningDiv.textContent += `Invalid arc: Distance (${distance.toFixed(3)}) exceeds 2R (${(2 * radius).toFixed(3)}) from (${startX}, ${startY}) to (${endX}, ${endY}). Skipping.\n`;
    warningDiv.style.color = 'red';
    return null;
  }
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const q = Math.sqrt(radius * radius - (distance / 2) * (distance / 2));
  let sign;
  if (mode === 'G02') {
    sign = r >= 0 ? -1 : 1; // G02: R > 0 (minor, -1), R < 0 (major, 1)
  } else {
    sign = r >= 0 ? 1 : -1; // G03: R > 0 (minor, 1), R < 0 (major, -1)
  }
  if (Math.abs(distance - 2 * radius) < 0.001) {
    sign = mode === 'G02' ? -1 : 1; // 180-degree arc: G02 (-1), G03 (1)
  }
  const perpX = -dy;
  const perpY = dx;
  const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);
  if (perpLength < 0.001) return null;
  const centerX = midX + sign * q * perpX / perpLength;
  const centerY = midY + sign * q * perpY / perpLength;
  return [centerX, centerY];
}

export function parseGcode(displayContent) {
  let currentX = 0, currentY = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const paths = [];
  let currentMode = 'G00';
  const lines = displayContent.split(/\r?\n/);

  lines.forEach((line, index) => {
    // Remove content within parentheses, including nested parentheses
    line = line.replace(/\(.*?\)/g, '').trim();
    if (!line) return; // Skip empty lines or lines that only had comments

    // Extract the first G or M code from the line
    const codeMatch = line.match(/(^|\s)([GM][0-9.]+)/i);
    if (!codeMatch) {
      console.debug(`Skipping line ${index + 1}: "${line}" (no G/M code found)`);
      return; // Skip lines without G/M codes
    }
    const code = codeMatch[2].toUpperCase();
    if (!validCodes.has(code)) {
      console.debug(`Skipping line ${index + 1}: "${line}" (invalid code: ${code})`);
      return; // Skip lines with invalid codes
    }
    console.debug(`Processing line ${index + 1}: "${line}"`);
    const tokens = line.split(/\s+/);
    let x = currentX, y = currentY, i = 0, j = 0, r = null, mode = currentMode;
    let hasR = false;
    let hasIJ = false;
    console.debug(`Tokens for line ${index + 1}: ${JSON.stringify(tokens)}`);
    tokens.forEach(token => {
      if (token.startsWith('G')) {
        const code = token.toUpperCase();
        if (code === 'G00' || code === 'G0') mode = 'G00';
        else if (code === 'G01' || code === 'G1') mode = 'G01';
        else if (code === 'G02' || code === 'G2') mode = 'G02';
        else if (code === 'G03' || code === 'G3') mode = 'G03';
      } else if (token.startsWith('X')) {
        x = parseFloat(token.substring(1));
      } else if (token.startsWith('Y')) {
        y = parseFloat(token.substring(1));
      } else if (token.startsWith('I')) {
        i = parseFloat(token.substring(1));
        hasIJ = true;
      } else if (token.startsWith('J')) {
        j = parseFloat(token.substring(1));
        hasIJ = true;
      } else if (token.startsWith('R')) {
        r = parseFloat(token.substring(1));
        hasR = true;
      }
    });
    console.debug(`Parsed values for line ${index + 1}: mode=${mode}, x=${x}, y=${y}, i=${i}, j=${j}, r=${r}, hasIJ=${hasIJ}, hasR=${hasR}`);
    if ((mode === 'G02' || mode === 'G03') && hasR && hasIJ) {
      const warningDiv = document.getElementById('warningsDiv');
      warningDiv.textContent += `Warning: Both R and I/J values detected in G${mode.slice(1)} command. Ignoring I/J values and using R.\n`;
      warningDiv.style.color = 'red';
      i = 0;
      j = 0;
    }
    // Allow paths with only X or Y specified
    if (!isNaN(x) || !isNaN(y)) {
      paths.push({ startX: currentX, startY: currentY, endX: x, endY: y, i, j, r, mode });
      if (mode === 'G00' || mode === 'G01') {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      } else if (mode === 'G02' || mode === 'G03') {
        if (hasR) {
          const radius = Math.abs(r);
          const dx = x - currentX;
          const dy = y - currentY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 2 * radius) {
            const warningDiv = document.getElementById('warningsDiv');
            warningDiv.textContent += `Invalid arc: Distance (${distance.toFixed(3)}) exceeds 2R (${(2 * radius).toFixed(3)}) from (${currentX}, ${currentY}) to (${x}, ${y}). Skipping.\n`;
            warningDiv.style.color = 'red';
            return;
          }
          const center = calculateArcCenter(currentX, currentY, x, y, r, mode);
          if (center) {
            const centerX = center[0];
            const centerY = center[1];
            minX = Math.min(minX, centerX - radius);
            maxX = Math.max(maxX, centerX + radius);
            minY = Math.min(minY, centerY - radius);
            maxY = Math.max(maxY, centerY + radius);
          }
        } else if (hasIJ) {
          const centerX = currentX + i;
          const centerY = currentY + j;
          const radius = Math.sqrt(i * i + j * j);
          if (radius >= 0.001) {
            minX = Math.min(minX, centerX - radius);
            maxX = Math.max(maxX, centerX + radius);
            minY = Math.min(minY, centerY - radius);
            maxY = Math.max(maxY, centerY + radius);
          }
        }
      }
      currentX = x;
      currentY = y;
    }
    currentMode = mode;
  });
  console.debug(`Parsed ${paths.length} paths`);
  return { paths, minX, maxX, minY, maxY };
}