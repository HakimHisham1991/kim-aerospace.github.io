let fileContentArrayBuffer = null;
let originalEncoding = 'windows-1252';
let displayContent = '';
let originalFileName = '';
let contentHistory = [];
let editCounter = 1;
let lastSavedName = '';

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
  // ... (other mappings can be added if needed)
  '\u00D8': 0xD8, // Latin capital letter O with stroke (Ø)
  '\u00F8': 0xF8, // Latin small letter o with stroke
};

function encodeWindows1252(text) {
  const buffer = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    
    if (code < 128) {
      // ASCII characters map directly
      buffer[i] = code;
    } else if (windows1252Map[char] !== undefined) {
      // Use Windows-1252 mapping for special characters
      buffer[i] = windows1252Map[char];
    } else if (code <= 255) {
      // Other characters in 0x80-0xFF range map directly if defined
      buffer[i] = code;
    } else {
      // Replace undefined characters with '?'
      buffer[i] = 63;
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
  
  // Decode using windows-1252
  try {
    const decoder = new TextDecoder('windows-1252');
    displayContent = decoder.decode(arrayBuffer);
    originalEncoding = 'windows-1252';
  } catch (e) {
    console.error('Error decoding file with windows-1252:', e);
    alert('Error decoding file. See console for details.');
    return;
  }
  
  // Minimal transformations: replace only [DIA] and [DIAMETER] placeholders
  displayContent = displayContent
    .replace(/\[DIA\]/gi, '\u00D8')
    .replace(/\[DIAMETER\]/gi, '\u00D8');
  
  document.getElementById('contentTextarea').value = displayContent;
  updateFileStats(displayContent);
  contentHistory = [displayContent];
  document.getElementById('undoBtn').disabled = true;
}

function generateSaveName() {
  if (lastSavedName) {
    const editMatch = lastSavedName.match(/^(.*?)(_edit\d+)(\.[^.]+)?$/i);
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
}

function encodeEditedContent() {
  const editedText = document.getElementById('contentTextarea').value;
  
  // Encode to Windows-1252
  try {
    return encodeWindows1252(editedText);
  } catch (error) {
    console.error('Error encoding content:', error);
    alert('Error encoding content. See console for details.');
    return null;
  }
}

document.getElementById('fileInput').addEventListener('change', function (e) {
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
  reader.onload = function (e) {
    try {
      handleFileContent(e.target.result);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. See console for details.');
      resetFileInput();
    }
  };
  reader.onerror = function (error) {
    console.error('FileReader error:', error);
    alert('Error reading file. See console for details.');
    resetFileInput();
  };

  reader.readAsArrayBuffer(file);
});

document.getElementById('removeSpacesBtn').addEventListener('click', function() {
  if (!displayContent) {
    alert('Please load a file first');
    return;
  }

  const processedContent = (() => {
    const lines = displayContent.split(/\r?\n/);
    const processedLines = lines.map(line => {
      let result = '';
      let inBrackets = false;
      let bracketContent = '';
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '(') {
          inBrackets = true;
          bracketContent += char;
        } else if (char === ')') {
          inBrackets = false;
          bracketContent += char;
          result += bracketContent;
          bracketContent = '';
        } else if (inBrackets) {
          bracketContent += char;
        } else {
          if (char !== ' ') {
            result += char;
          }
        }
      }
      
      if (bracketContent) {
        result += bracketContent;
      }
      
      return result;
    });
    
    return processedLines.join('\n');
  })();

  if (processedContent !== displayContent) {
    saveToHistory(displayContent);
    displayContent = processedContent;
    document.getElementById('contentTextarea').value = displayContent;
    updateFileStats(displayContent);
  }
});

document.getElementById('addSpacesBtn').addEventListener('click', function() {
  if (!displayContent) {
    alert('Please load a file first');
    return;
  }

  const processedContent = (() => {
    const AXIS_LETTERS = /[A-Z]/;
    const WHITESPACE = /\s/;
    
    return displayContent.split(/\r?\n/).map(line => {
      if (!line.trim()) return line;
      
      let result = '';
      let inBrackets = false;
      let bracketContent = '';
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const prevChar = i > 0 ? line[i-1] : '';
        const nextChar = i < line.length-1 ? line[i+1] : '';
        
        if (char === '(') {
          if (i > 0 && !WHITESPACE.test(prevChar) && prevChar !== '(' && prevChar !== ')') {
            result += ' ';
          }
          inBrackets = true;
          bracketContent += char;
        } else if (char === ')') {
          bracketContent += char;
          inBrackets = false;
          result += bracketContent;
          bracketContent = '';
          if (i < line.length-1 && !WHITESPACE.test(nextChar) && nextChar !== ')' && nextChar !== '(') {
            result += ' ';
          }
        } else if (inBrackets) {
          bracketContent += char;
        } else {
          if (i > 0 && result.slice(-1) !== ' ' && AXIS_LETTERS.test(char)) {
            result += ' ';
          }
          result += char;
        }
      }
      
      if (bracketContent) result += bracketContent;
      
      return result.trim();
    }).join('\n');
  })();

  if (processedContent !== displayContent) {
    saveToHistory(displayContent);
    displayContent = processedContent;
    document.getElementById('contentTextarea').value = displayContent;
    updateFileStats(displayContent);
  }
});

document.getElementById('undoBtn').addEventListener('click', function() {
  if (contentHistory.length > 1) {
    contentHistory.pop();
    displayContent = contentHistory[contentHistory.length - 1];
    document.getElementById('contentTextarea').value = displayContent;
    updateFileStats(displayContent);
    document.getElementById('undoBtn').disabled = contentHistory.length <= 1;
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
      // Content was edited - encode the changes
      bytesToSave = encodeEditedContent();
    } else {
      // No edits - use original bytes
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
