export let fileContentArrayBuffer = null;
export let originalEncoding = 'windows-1252';
export let displayContent = '';
export let originalFileName = '';
export let lastSavedName = '';
export let editCounter = 1;

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

export function encodeWindows1252(text) {
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

export function updateFileStats(content) {
  const lines = content.split(/\r?\n/);
  const lineCount = lines.length;
  const charCount = content.length;
  document.getElementById('lineCount').textContent = `Lines: ${lineCount.toLocaleString()}`;
  document.getElementById('charCount').textContent = `Characters: ${charCount.toLocaleString()}`;
}

export function setDisplayContent(content) {
  displayContent = content;
}

export function handleFileContent(arrayBuffer, simulateCallback) {
  fileContentArrayBuffer = arrayBuffer;
  try {
    const decoder = new TextDecoder('windows-1252');
    displayContent = decoder.decode(arrayBuffer);
    originalEncoding = 'windows-1252';
  } catch (e) {
    console.error('Error decoding file with windows-1252:', e);
    try {
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
  simulateCallback(); // Call directly, no setTimeout
}

export function generateSaveName() {
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

export function resetFileInput(clearCanvasCallback) {
  document.getElementById('fileInput').value = '';
  document.getElementById('fileNameDisplay').textContent = 'No file selected';
  document.getElementById('contentTextarea').value = '';
  fileContentArrayBuffer = null;
  displayContent = '';
  updateFileStats('');
  clearCanvasCallback();
  document.getElementById('warningsDiv').textContent = '';
}

export function encodeEditedContent() {
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

export function saveFile() {
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
    if (currentContent !== displayContent) {
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
}