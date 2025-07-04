let fileContentArrayBuffer = null;
let originalEncoding = 'windows-1252';
let displayContent = '';
let originalFileName = '';
let contentHistory = [];
let editCounter = 1;
let lastSavedName = '';
let currentScale = 1;
let showArrows = false; // Default to OFF

// Windows-1252 to Unicode mapping for characters that differ from ASCII
const windows1252Map = {
  '\u20AC': 0x80, // Euro sign
  '\u201A': 0x82, // Single low-9 quotation mark
  '\u0192': 0x83, // Latin small letter f with hook
  '\u201E': 0x84, // Double low-9 quotation mark
  '\u2026': 0x85, // Horizontal ellipsis
  '\u2020': 0x86, // Dagger
  '\u2021': 0x87, // Double dagger
  '\u02C6': 0x88, // Modifier letter circumflex accent
  '\u2030': 0x89, // Per mille sign
  '\u0160': 0x8A, // Latin capital letter S with caron
  '\u2039': 0x8B, // Single left-pointing angle quotation mark
  '\u0152': 0x8C, // Latin capital ligature OE
  '\u017D': 0x8E, // Latin capital letter Z with caron
  '\u2018': 0x91, // Left single quotation mark
  '\u2019': 0x92, // Right single quotation mark
  '\u201C': 0x93, // Left double quotation mark
  '\u201D': 0x94, // Right double quotation mark
  '\u2022': 0x95, // Bullet
  '\u2013': 0x96, // En dash
  '\u2014': 0x97, // Em dash
  '\u02DC': 0x98, // Small tilde
  '\u2122': 0x99, // Trade mark sign
  '\u0161': 0x9A, // Latin small letter s with caron
  '\u203A': 0x9B, // Single right-pointing angle quotation mark
  '\u0153': 0x9C, // Latin small ligature oe
  '\u017E': 0x9E, // Latin small letter z with caron
  '\u0178': 0x9F, // Latin capital letter Y with diaeresis
  '\u00A0': 0xA0, // Non-breaking space
  '\u00D8': 0xD8, // Latin capital letter O with stroke (Ø)
  '\u00F8': 0xF8, // Latin small letter o with stroke
};

function encodeWindows1252(text) {
  const buffer = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    
    if (code < 128) {
      buffer[i] = code;
    } else if (windows1252Map[char] !== undefined) {
      buffer[i] = windows1252Map[char];
    } else if (code <= 255) {
      buffer[i] = code;
    } else {
      buffer[i] = 63; // Replace undefined characters with '?'
    }
  }
  return buffer;
}

function updateFileStats(content) {
  const lines = content.split(/\r?\n/);
  const lineCount = lines.length;
  const charCount = content.length;
  
  document.getElementById('lineCount').textContent = `Lines: ${lineCount.toLocaleString()}`;
  document.getElementById('charCount').textContent = `Characters: ${charCount.toLocaleString()}`;
}

function saveToHistory(content) {
  contentHistory.push(content);
  document.getElementById('undoBtn').disabled = contentHistory.length <= 1;
}

function handleFileContent(arrayBuffer) {
  fileContentArrayBuffer = arrayBuffer;
  
  try {
    const decoder = new TextDecoder('windows-1252');
    displayContent = decoder.decode(arrayBuffer);
    originalEncoding = 'windows-1252';
  } catch (e) {
    console.error('Error decoding file with windows-1252:', e);
    try {
      // Fallback to UTF-8 if windows-1252 fails
      const decoder = new TextDecoder('utf-8');
      displayContent = decoder.decode(arrayBuffer);
      originalEncoding = 'utf-8';
    } catch (e) {
      console.error('Error decoding file with utf-8:', e);
      alert('Error decoding file. See console for details.');
      resetFileInput();
      return;
    }
  }
  
  displayContent = displayContent
    .replace(/\[DIA\]/gi, '\u00D8')
    .replace(/\[DIAMETER\]/gi, '\u00D8');
  
  document.getElementById('contentTextarea').value = displayContent;
  updateFileStats(displayContent);
  contentHistory = [displayContent];
  document.getElementById('undoBtn').disabled = true;
  
  // Automatically simulate after loading
  setTimeout(() => {
    simulateToolpath();
  }, 100);
}

function generateSaveName() {
  if (lastSavedName) {
    const editMatch = lastSavedName.match(/^(.*?)(_edit[0-9]+)(\.[^.]+)?$/i);
    if (editMatch) {
      const baseName = editMatch[1];
      const currentEditNum = parseInt(editMatch[2].replace('_edit', '')) || 0;
      const extension = originalFileName && originalFileName.includes('.') 
        ? originalFileName.substring(originalFileName.lastIndexOf('.')) 
        : (editMatch[3] || '');
      return `${baseName}_edit${currentEditNum + 1}${extension}`;
    }
  }

  if (originalFileName) {
    const lastDotIndex = originalFileName.lastIndexOf('.');
    const baseName = lastDotIndex > -1 ? originalFileName.substring(0, lastDotIndex) : originalFileName;
    const extension = lastDotIndex > -1 ? originalFileName.substring(lastDotIndex) : '';
    return `${baseName}_edit${editCounter}${extension}`;
  }

  return `nc_edit${editCounter}`;
}

function resetFileInput() {
  document.getElementById('fileInput').value = '';
  document.getElementById('fileNameDisplay').textContent = 'No file selected';
  document.getElementById('contentTextarea').value = '';
  fileContentArrayBuffer = null;
  displayContent = '';
  contentHistory = [];
  document.getElementById('undoBtn').disabled = true;
  updateFileStats('');
  clearCanvas();
  document.getElementById('warningsDiv').textContent = '';
}

function encodeEditedContent() {
  const editedText = document.getElementById('contentTextarea').value;
  const text = editedText.replace(/\u00D8/g, '[DIA]');
  try {
    return encodeWindows1252(text);
  } catch (error) {
    console.error('Error encoding content:', error);
    alert('Error encoding content. See console for details.');
    return null;
  }
}

function clearCanvas() {
  const canvas = document.getElementById('toolpathCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawArrow(ctx, fromX, fromY, toX, toY, scale) {
  const headlen = 5 * scale; // Arrow head length proportional to scale
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);
  
  ctx.beginPath();
  ctx.moveTo(fromX, fromY); // Base of the arrow
  ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

function calculateArcCenter(startX, startY, endX, endY, r, mode) {
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const radius = Math.abs(r);

  // Validate arc distance
  if (distance > 2 * radius) {
    const warningDiv = document.getElementById('warningsDiv');
    warningDiv.textContent += `Invalid arc: Distance (${distance.toFixed(3)}) exceeds 2R (${(2 * radius).toFixed(3)}) from (${startX}, ${startY}) to (${endX}, ${endY}). Skipping.\n`;
    warningDiv.style.color = 'red';
    return null;
  }

  // Calculate the two possible arc centers
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const q = Math.sqrt(radius * radius - (distance / 2) * (distance / 2));
  
  // For positive R, choose the shortest arc; for negative R, choose the longest arc
  let sign = r >= 0 ? -1 : 1; // Invert sign logic: positive R uses the inner center, negative R uses the outer
  if (Math.abs(distance - 2 * radius) < 0.001) {
    // Semicircle case
    sign = mode === 'G02' ? -1 : 1; // Clockwise uses inner, counterclockwise uses outer
  }

  // Calculate perpendicular vector
  const perpX = -dy;
  const perpY = dx;
  const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);
  if (perpLength < 0.001) return null;

  const centerX = midX + sign * q * perpX / perpLength;
  const centerY = midY + sign * q * perpY / perpLength;

  return [centerX, centerY];
}

function simulateToolpath() {
  if (!displayContent) {
    alert('Please load a file first');
    return;
  }

  const canvas = document.getElementById('toolpathCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById('warningsDiv').textContent = ''; // Clear previous warnings

  // Initialize tool position and state
  let currentX = 0, currentY = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const paths = [];

  // Parse G-code
  const lines = displayContent.split(/\r?\n/);
  let currentMode = 'G00'; // Default to rapid move

  lines.forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('(') || line.startsWith('%') || line.startsWith('O')) return;

    const tokens = line.split(/\s+/);
    let x = currentX, y = currentY, i = 0, j = 0, r = null, mode = currentMode;
    let hasR = false;
    let hasIJ = false;

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

    // Warning for R and I/J coexistence
    if ((mode === 'G02' || mode === 'G03') && hasR && hasIJ) {
      const warningDiv = document.getElementById('warningsDiv');
      warningDiv.textContent += `Warning: Both R and I/J values detected in G${mode.slice(1)} command. Ignoring I/J values and using R.\n`;
      warningDiv.style.color = 'red';
      i = 0;
      j = 0;
    }

    if (!isNaN(x) && !isNaN(y)) {
      paths.push({ startX: currentX, startY: currentY, endX: x, endY: y, i, j, r, mode });
      // Update bounds based on rules
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
          // Validate arc distance
          if (distance > 2 * radius) {
            const warningDiv = document.getElementById('warningsDiv');
            warningDiv.textContent += `Invalid arc: Distance (${distance.toFixed(3)}) exceeds 2R (${(2 * radius).toFixed(3)}) from (${currentX}, ${currentY}) to (${x}, ${y}). Skipping.\n`;
            warningDiv.style.color = 'red';
            return;
          }
          // Calculate bounding box for arc
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
          if (radius >= 0.001) { // Skip invalid arcs
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

  // Handle empty or single-point cases
  if (paths.length === 0) {
    alert('No valid toolpath found in the G-code.');
    return;
  }

  // Ensure minimum padding of 10 units in each quadrant
  const minPadding = 10;
  if (minX > -minPadding) minX = -minPadding;
  if (maxX < minPadding) maxX = minPadding;
  if (minY > -minPadding) minY = -minPadding;
  if (maxY < minPadding) maxY = minPadding;

  // Round min/max to nearest hundred for tick marks
  const tickInterval = 100;
  minX = Math.floor(minX / tickInterval) * tickInterval;
  maxX = Math.ceil(maxX / tickInterval) * tickInterval;
  minY = Math.floor(minY / tickInterval) * tickInterval;
  maxY = Math.ceil(maxY / tickInterval) * tickInterval;

  // Calculate scaling to fit canvas
  const padding = 50;
  const canvasWidth = canvas.width - 2 * padding;
  const canvasHeight = canvas.height - 2 * padding;
  const width = maxX - minX;
  const height = maxY - minY;

  // Ensure non-zero dimensions with a minimum size
  const minDimension = 1; // Minimum width/height to avoid division by zero
  const effectiveWidth = width === 0 ? minDimension : width;
  const effectiveHeight = height === 0 ? minDimension : height;

  // Base scale to fit the toolpath within the canvas
  let scale = Math.min(canvasHeight / effectiveHeight, canvasWidth / effectiveWidth) * currentScale;

  // Adjust offsets to center the toolpath
  const offsetX = padding - minX * scale;
  const offsetY = (canvas.height / 2) + ((-minY - (maxY - minY) / 2) * scale); // Center y=0 at canvas middle

  // Draw X and Y axes
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  
  // X axis (horizontal) at y=0
  const zeroY = canvas.height - (0 * scale + offsetY);
  ctx.beginPath();
  ctx.moveTo(padding, zeroY);
  ctx.lineTo(canvas.width - padding, zeroY);
  ctx.stroke();
  
  // Y axis (vertical) at x=0
  const zeroX = 0 * scale + offsetX;
  ctx.beginPath();
  ctx.moveTo(zeroX, padding);
  ctx.lineTo(zeroX, canvas.height - padding);
  ctx.stroke();

  // Draw axis labels
  ctx.font = '12px Arial';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  
  // X axis label
  ctx.fillText('X', canvas.width - padding + 10, zeroY);
  
  // Y axis label
  ctx.fillText('Y', zeroX, padding - 10);
  
  // Draw tick marks and values
  const tickSize = 5;
  
  // X axis ticks
  for (let x = minX; x <= maxX; x += tickInterval) {
    const canvasX = x * scale + offsetX;
    ctx.beginPath();
    ctx.moveTo(canvasX, zeroY - tickSize);
    ctx.lineTo(canvasX, zeroY + tickSize);
    ctx.stroke();
    ctx.fillText(x.toFixed(0), canvasX, zeroY + 20);
  }
  
  // Y axis ticks
  for (let y = minY; y <= maxY; y += tickInterval) {
    const canvasY = canvas.height - (y * scale + offsetY);
    ctx.beginPath();
    ctx.moveTo(zeroX - tickSize, canvasY);
    ctx.lineTo(zeroX + tickSize, canvasY);
    ctx.stroke();
    ctx.fillText(y.toFixed(0), zeroX - 20, canvasY + 4);
  }

  // Draw paths
  ctx.lineWidth = 2;
  paths.forEach(path => {
    ctx.beginPath();
    const startCanvasX = path.startX * scale + offsetX;
    const startCanvasY = canvas.height - (path.startY * scale + offsetY);
    const endCanvasX = path.endX * scale + offsetX;
    const endCanvasY = canvas.height - (path.endY * scale + offsetY);
    if (path.mode === 'G02' || path.mode === 'G03') {
      let centerX, centerY, radius, startAngle, endAngle;
      if (path.r !== null) {
        // R syntax
        const dx = path.endX - path.startX;
        const dy = path.endY - path.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        radius = Math.abs(path.r);
        
        // Skip if radius is zero
        if (radius < 0.001) {
          const warningDiv = document.getElementById('warningsDiv');
          warningDiv.textContent += `Invalid arc: Zero radius arc from (${path.startX}, ${path.startY}) to (${path.endX}, ${path.endY}). Skipping.\n`;
          warningDiv.style.color = 'red';
          return;
        }
        
        // Calculate arc center
        const center = calculateArcCenter(path.startX, path.startY, path.endX, path.endY, path.r, path.mode);
        if (!center) return;
        centerX = center[0];
        centerY = center[1];
        
        // Calculate angles with Y-axis inversion for canvas
        startAngle = Math.atan2(-(path.startY - centerY), path.startX - centerX);
        endAngle = Math.atan2(-(path.endY - centerY), path.endX - centerX);
        
        // Determine arc direction and angles
        if (Math.abs(path.startX - path.endX) < 0.001 && Math.abs(path.startY - path.endY) < 0.001) {
          // Full circle
          endAngle = path.mode === 'G02' ? startAngle + 2 * Math.PI : startAngle - 2 * Math.PI;
        } else {
          // Normalize angles to [0, 2π)
          startAngle = (startAngle + 2 * Math.PI) % (2 * Math.PI);
          endAngle = (endAngle + 2 * Math.PI) % (2 * Math.PI);
          // Adjust angles based on R sign and arc length
          const angleDiff = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
          if (path.r > 0) {
            // Shortest arc
            if (angleDiff > Math.PI) {
              if (path.mode === 'G02') endAngle -= 2 * Math.PI;
              else endAngle += 2 * Math.PI;
            }
          } else {
            // Longest arc
            if (angleDiff < Math.PI) {
              if (path.mode === 'G02') endAngle += 2 * Math.PI;
              else endAngle -= 2 * Math.PI;
            }
          }
        }
      } else {
        // I/J syntax
        centerX = path.startX + path.i;
        centerY = path.startY + path.j;
        radius = Math.sqrt(path.i * path.i + path.j * path.j);
        
        // Skip if radius is zero
        if (radius < 0.001) {
          const warningDiv = document.getElementById('warningsDiv');
          warningDiv.textContent += `Invalid arc: Zero radius arc from (${path.startX}, ${path.startY}) to (${path.endX}, ${path.endY}). Skipping.\n`;
          warningDiv.style.color = 'red';
          return;
        }
        
        // Validate arc
        const startDistance = Math.sqrt(
          Math.pow(path.startX - centerX, 2) + Math.pow(path.startY - centerY, 2)
        );
        const endDistance = Math.sqrt(
          Math.pow(path.endX - centerX, 2) + Math.pow(path.endY - centerY, 2)
        );
        if (Math.abs(startDistance - endDistance) > 0.1) {
          const warningDiv = document.getElementById('warningsDiv');
          warningDiv.textContent += `Invalid arc: Start and end points not equidistant from center. Start distance: ${startDistance.toFixed(3)}, End distance: ${endDistance.toFixed(3)}. Skipping arc from (${path.startX}, ${path.startY}) to (${path.endX}, ${path.endY})\n`;
          warningDiv.style.color = 'red';
          return;
        }
        
        // Calculate angles with Y-axis inversion for canvas
        startAngle = Math.atan2(-(path.startY - centerY), path.startX - centerX);
        endAngle = Math.atan2(-(path.endY - centerY), path.endX - centerX);
        
        // Normalize angles to [0, 2π)
        startAngle = (startAngle + 2 * Math.PI) % (2 * Math.PI);
        endAngle = (endAngle + 2 * Math.PI) % (2 * Math.PI);
        // Adjust angles based on direction
        if (path.mode === 'G02') {
          if (endAngle <= startAngle) endAngle += 2 * Math.PI;
        } else {
          if (endAngle >= startAngle) endAngle -= 2 * Math.PI;
        }
      }
      
      // Draw arc
      const centerCanvasX = centerX * scale + offsetX;
      const centerCanvasY = canvas.height - (centerY * scale + offsetY);
      ctx.arc(centerCanvasX, centerCanvasY, radius * scale, startAngle, endAngle, path.mode === 'G03');
      ctx.strokeStyle = '#00ff00'; // Green for arcs
      ctx.stroke();
      
      // Draw arrows if toggle is ON
      if (showArrows) {
        const arrowSpacing = 0.5; // Angular spacing in radians
        const angleDiff = path.mode === 'G03' ? startAngle - endAngle : endAngle - startAngle;
        const numArrows = Math.max(1, Math.floor(Math.abs(angleDiff) / arrowSpacing));
        for (let i = 0; i < numArrows; i++) {
          const t = i / (numArrows === 1 ? 1 : numArrows - 1);
          const angle = path.mode === 'G03' 
            ? startAngle - t * (startAngle - endAngle)
            : startAngle + t * (endAngle - startAngle);
          const arrowX = centerX + radius * Math.cos(angle);
          const arrowY = centerY - radius * Math.sin(angle);
          
          // Calculate tangent direction (corrected for arc direction)
          const radiusX = Math.cos(angle);
          const radiusY = -Math.sin(angle); // Y-axis inversion
          let tangentX, tangentY;
          if (path.mode === 'G02') {
            tangentX = radiusY; // Clockwise tangent (corrected)
            tangentY = -radiusX;
          } else {
            tangentX = -radiusY; // Counterclockwise tangent (corrected)
            tangentY = radiusX;
          }
          
          // Normalize tangent vector
          const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
          if (tangentLength > 0) {
            tangentX /= tangentLength;
            tangentY /= tangentLength;
          }
          
          // Define arrow length
          const arrowLength = 5 / scale;
          
          // Calculate from and to points for the arrow (base at arc, pointing along tangent)
          const fromX = arrowX + tangentX * arrowLength;
          const fromY = arrowY + tangentY * arrowLength;
          const toX = arrowX;
          const toY = arrowY;
          
          // Draw arrow
          ctx.strokeStyle = '#00ff00'; // Match arc color
          drawArrow(ctx, 
            toX * scale + offsetX, 
            canvas.height - (toY * scale + offsetY), 
            fromX * scale + offsetX, 
            canvas.height - (fromY * scale + offsetY), 
            scale
          );
        }
      }
    } else {
      // Linear path for G00 and G01
      ctx.moveTo(startCanvasX, startCanvasY);
      ctx.lineTo(endCanvasX, endCanvasY);
      
      if (path.mode === 'G00') {
        ctx.setLineDash([5, 5]); // Dashed line for rapid moves
        ctx.strokeStyle = '#ff0000'; // Red for rapid
      } else {
        ctx.setLineDash([]); // Solid line for cutting
        ctx.strokeStyle = '#0000ff'; // Blue for cutting
      }
      ctx.stroke();
      
      // Draw arrows for linear paths if toggle is ON
      if (showArrows && path.mode !== 'G02' && path.mode !== 'G03') {
        const arrowSpacing = 50 * scale;
        const length = Math.sqrt(Math.pow(endCanvasX - startCanvasX, 2) + Math.pow(endCanvasY - startCanvasY, 2));
        const numArrows = Math.max(1, Math.floor(length / arrowSpacing));
        for (let i = 1; i <= numArrows; i++) {
          const t = i / (numArrows + 1);
          const arrowX = startCanvasX + t * (endCanvasX - startCanvasX);
          const arrowY = startCanvasY + t * (endCanvasY - startCanvasY);
          // Draw arrow from start to end (correct direction)
          drawArrow(ctx, 
            arrowX, 
            arrowY, 
            arrowX + (endCanvasX - startCanvasX) / length * 10 / scale, 
            arrowY + (endCanvasY - startCanvasY) / length * 10 / scale, 
            scale
          );
        }
      }
    }
  });

  // Save current content to history if edited
  const currentContent = document.getElementById('contentTextarea').value;
  if (currentContent !== displayContent) {
    saveToHistory(displayContent);
    displayContent = currentContent;
    updateFileStats(displayContent);
  }
}

// Event Listeners
document.getElementById('fileInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) {
    resetFileInput();
    return;
  }

  originalFileName = file.name;
  document.getElementById('fileNameDisplay').textContent = file.name;
  editCounter = 1;
  lastSavedName = '';

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      handleFileContent(e.target.result);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. See console for details.');
      resetFileInput();
    }
  };
  reader.onerror = function(error) {
    console.error('FileReader error:', error);
    alert('Error reading file. See console for details.');
    resetFileInput();
  };

  reader.readAsArrayBuffer(file);
});

document.getElementById('simulateBtn').addEventListener('click', function() {
  simulateToolpath();
});

document.getElementById('applyScaleBtn').addEventListener('click', function() {
  currentScale = parseFloat(document.getElementById('scaleSelect').value);
  simulateToolpath();
});

document.getElementById('undoBtn').addEventListener('click', function() {
  if (contentHistory.length > 1) {
    contentHistory.pop();
    displayContent = contentHistory[contentHistory.length - 1];
    document.getElementById('contentTextarea').value = displayContent;
    updateFileStats(displayContent);
    document.getElementById('undoBtn').disabled = contentHistory.length <= 1;
    clearCanvas();
    document.getElementById('warningsDiv').textContent = '';
    simulateToolpath();
  }
});

document.getElementById('saveFileBtn').addEventListener('click', function() {
  if (!fileContentArrayBuffer) {
    alert('No content to save');
    return;
  }

  try {
    const saveName = generateSaveName();
    lastSavedName = saveName;
    editCounter++;
    
    let bytesToSave;
    const currentContent = document.getElementById('contentTextarea').value;
    if (contentHistory.length > 0 && currentContent !== contentHistory[0]) {
      bytesToSave = encodeEditedContent();
    } else {
      bytesToSave = new Uint8Array(fileContentArrayBuffer);
    }
    
    if (!bytesToSave) {
      throw new Error('Failed to encode content');
    }
    
    const blob = new Blob([bytesToSave], { type: 'text/plain;charset=windows-1252' });
    
    if (typeof saveAs !== 'undefined') {
      saveAs(blob, saveName);
    } else if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, saveName);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = saveName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }
  } catch (error) {
    console.error('Error saving file:', error);
    alert('Error saving file. See console for details.');
  }
});

document.getElementById('arrowToggle').addEventListener('change', function(e) {
  showArrows = e.target.checked;
  simulateToolpath();
});
