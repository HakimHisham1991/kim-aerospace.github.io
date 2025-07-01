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

function calculateTickInterval(range) {
  // Calculate nice tick interval based on range
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  
  let tickInterval = Math.pow(10, exponent);
  if (fraction < 2) tickInterval *= 0.2;
  else if (fraction < 5) tickInterval *= 0.5;
  else if (fraction < 10) tickInterval *= 1;
  
  return tickInterval;
}

function drawArrow(ctx, fromX, fromY, toX, toY, scale) {
  const headlen = 10 * scale; // Arrowhead length
  const angle = Math.atan2(toY - fromY, toX - fromX);
  
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
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
    let x = currentX, y = currentY, i = 0, j = 0, mode = currentMode; // Default i, j to 0

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
      } else if (token.startsWith('J')) {
        j = parseFloat(token.substring(1));
      }
    });

    if (!isNaN(x) && !isNaN(y)) {
      paths.push({ startX: currentX, startY: currentY, endX: x, endY: y, i, j, mode });
      currentX = x;
      currentY = y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      // Update bounds for arc center and radius if G02 or G03
      if (mode === 'G02' || mode === 'G03') {
        const centerX = currentX + i;
        const centerY = currentY + j;
        const radius = Math.sqrt(i * i + j * j);
        minX = Math.min(minX, centerX - radius);
        maxX = Math.max(maxX, centerX + radius);
        minY = Math.min(minY, centerY - radius);
        maxY = Math.max(maxY, centerY + radius);
      }
    }
    currentMode = mode;
  });

  // Handle empty or single-point cases
  if (paths.length === 0) {
    alert('No valid toolpath found in the G-code.');
    return;
  }

  // Add padding to ensure all quadrants are visible
  const viewPadding = 10; // Minimum 10 units padding around the toolpath
  minX = Math.min(minX, -viewPadding);
  maxX = Math.max(maxX, viewPadding);
  minY = Math.min(minY, -viewPadding);
  maxY = Math.max(maxY, viewPadding);

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
  const scaleX = canvasWidth / effectiveWidth;
  const scaleY = canvasHeight / effectiveHeight;
  let scale = Math.min(scaleX, scaleY) * currentScale;

  // Adjust offsets to center the toolpath
  const offsetX = padding + (canvasWidth - effectiveWidth * scale) / 2 - minX * scale;
  const offsetY = padding + (canvasHeight - effectiveHeight * scale) / 2 - minY * scale;

  // Draw X and Y axes
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  
  // X axis (horizontal)
  ctx.beginPath();
  ctx.moveTo(padding, canvas.height - offsetY);
  ctx.lineTo(canvas.width - padding, canvas.height - offsetY);
  ctx.stroke();
  
  // Y axis (vertical)
  ctx.beginPath();
  ctx.moveTo(offsetX, canvas.height - padding);
  ctx.lineTo(offsetX, padding);
  ctx.stroke();

  // Draw axis labels
  ctx.font = '12px Arial';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  
  // X axis label
  ctx.fillText('X', canvas.width - padding + 10, canvas.height - offsetY);
  
  // Y axis label
  ctx.fillText('Y', offsetX, padding - 10);
  
  // Draw tick marks and values
  const tickSize = 5;
  const tickInterval = calculateTickInterval(Math.max(width, height));
  
  // X axis ticks
  const startXTick = Math.ceil(minX / tickInterval) * tickInterval;
  const endXTick = Math.floor(maxX / tickInterval) * tickInterval;
  for (let x = startXTick; x <= endXTick; x += tickInterval) {
    const canvasX = x * scale + offsetX;
    ctx.beginPath();
    ctx.moveTo(canvasX, canvas.height - offsetY - tickSize);
    ctx.lineTo(canvasX, canvas.height - offsetY + tickSize);
    ctx.stroke();
    ctx.fillText(x.toFixed(1), canvasX, canvas.height - offsetY + 20);
  }
  
  // Y axis ticks
  const startYTick = Math.ceil(minY / tickInterval) * tickInterval;
  const endYTick = Math.floor(maxY / tickInterval) * tickInterval;
  for (let y = startYTick; y <= endYTick; y += tickInterval) {
    const canvasY = canvas.height - (y * scale + offsetY);
    ctx.beginPath();
    ctx.moveTo(offsetX - tickSize, canvasY);
    ctx.lineTo(offsetX + tickSize, canvasY);
    ctx.stroke();
    ctx.fillText(y.toFixed(1), offsetX - 20, canvasY + 4);
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
      // Calculate arc parameters
      const centerX = path.startX + path.i;
      const centerY = path.startY + path.j;
      const radius = Math.sqrt(path.i * path.i + path.j * path.j);
      
      // Skip if radius is zero (no arc to draw)
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
      if (Math.abs(startDistance - endDistance) > 0.1) { // Relaxed tolerance
        const warningDiv = document.getElementById('warningsDiv');
        warningDiv.textContent += `Invalid arc: Start and end points not equidistant from center. Start distance: ${startDistance.toFixed(3)}, End distance: ${endDistance.toFixed(3)}. Skipping arc from (${path.startX}, ${path.startY}) to (${path.endX}, ${path.endY})\n`;
        warningDiv.style.color = 'red';
        return;
      }
      
      // Calculate angles with Y-axis inversion for canvas
      let startAngle = Math.atan2(-(path.startY - centerY), path.startX - centerX); // Negate Y for canvas
      let endAngle = Math.atan2(-(path.endY - centerY), path.endX - centerX); // Negate Y for canvas
      
      // Handle full circle (start point equals end point)
      let isFullCircle = false;
      if (Math.abs(path.startX - path.endX) < 0.001 && Math.abs(path.startY - path.endY) < 0.001) {
        isFullCircle = true;
        endAngle = path.mode === 'G02' ? startAngle + 2 * Math.PI : startAngle - 2 * Math.PI; // Full 360° sweep
      } else {
        // Normalize angles to [0, 2π)
        startAngle = (startAngle + 2 * Math.PI) % (2 * Math.PI);
        endAngle = (endAngle + 2 * Math.PI) % (2 * Math.PI);
        // Adjust angles based on direction
        if (path.mode === 'G02') {
          // Clockwise: ensure endAngle > startAngle
          if (endAngle <= startAngle) {
            endAngle += 2 * Math.PI;
          }
        } else {
          // Counterclockwise: ensure endAngle < startAngle
          if (endAngle >= startAngle) {
            endAngle -= 2 * Math.PI;
          }
        }
      }
      
      // Transform to canvas coordinates
      const centerCanvasX = centerX * scale + offsetX;
      const centerCanvasY = canvas.height - (centerY * scale + offsetY);
      
      // Draw arc (clockwise for G02, counterclockwise for G03)
      ctx.arc(centerCanvasX, centerCanvasY, radius * scale, startAngle, endAngle, path.mode === 'G03'); // true for counterclockwise
      ctx.strokeStyle = '#00ff00'; // Green for arcs
      ctx.stroke(); // Stroke the arc to make it visible
      
      // Draw arrows if toggle is ON
      if (showArrows) {
        const arrowSpacing = 0.5; // Angular spacing in radians (adjust for density)
        const angleDiff = path.mode === 'G03' ? startAngle - endAngle : endAngle - startAngle;
        const numArrows = Math.ceil(Math.abs(angleDiff) / arrowSpacing);
        for (let i = 0; i < numArrows; i++) {
          const t = i / Math.max(1, numArrows - 1);
          const angle = path.mode === 'G03' 
            ? startAngle - t * (startAngle - endAngle)
            : startAngle + t * (endAngle - startAngle);
          const arrowX = centerX + radius * Math.cos(angle);
          const arrowY = centerY - radius * Math.sin(angle); // Adjust for canvas Y-axis
          const nextT = (i + 1) / Math.max(1, numArrows - 1);
          const nextAngle = path.mode === 'G03'
            ? startAngle - nextT * (startAngle - endAngle)
            : startAngle + nextT * (endAngle - startAngle);
          const nextX = centerX + radius * Math.cos(nextAngle);
          const nextY = centerY - radius * Math.sin(nextAngle);
          drawArrow(ctx, 
            arrowX * scale + offsetX, 
            canvas.height - (arrowY * scale + offsetY), 
            nextX * scale + offsetX, 
            canvas.height - (nextY * scale + offsetY), 
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
      ctx.stroke(); // Stroke the linear path
    }

    // Draw arrows for linear paths if toggle is ON
    if (showArrows && path.mode !== 'G02' && path.mode !== 'G03') {
      const arrowSpacing = 50 * scale; // Adjust spacing based on scale
      const length = Math.sqrt(Math.pow(endCanvasX - startCanvasX, 2) + Math.pow(endCanvasY - startCanvasY, 2));
      const numArrows = Math.max(1, Math.floor(length / arrowSpacing));
      for (let i = 1; i <= numArrows; i++) {
        const t = i / (numArrows + 1);
        const arrowX = startCanvasX + t * (endCanvasX - startCanvasX);
        const arrowY = startCanvasY + t * (endCanvasY - startCanvasY);
        drawArrow(ctx, arrowX, arrowY, endCanvasX, endCanvasY, scale);
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

document.getElementById('clearFileBtn').addEventListener('click', function() {
  if (confirm('Are you sure you want to clear the current file? This action cannot be undone.')) {
    resetFileInput();
  }
});

document.getElementById('arrowToggle').addEventListener('change', function(e) {
  showArrows = e.target.checked;
  simulateToolpath();
});
