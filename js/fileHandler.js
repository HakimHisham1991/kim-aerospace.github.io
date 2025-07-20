console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

/**
 * Handles file operations and encoding
 * @module fileHandler
 */

export let fileContentArrayBuffer = null;
export let originalEncoding = 'windows-1252';
export let displayContent = '';
let _originalFileName = '';
export let lastSavedName = '';
export let editCounter = 1;

const WINDOWS_1252_MAP = {
  '\u20AC': 0x80, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84, '\u2026': 0x85,
  '\u2020': 0x86, '\u2021': 0x87, '\u02C6': 0x88, '\u2030': 0x89, '\u0160': 0x8A,
  '\u2039': 0x8B, '\u0152': 0x8C, '\u017D': 0x8E, '\u2018': 0x91, '\u2019': 0x92,
  '\u201C': 0x93, '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9A, '\u203A': 0x9B, '\u0153': 0x9C,
  '\u017E': 0x9E, '\u0178': 0x9F, '\u00A0': 0xA0, '\u00D8': 0xD8, '\u00F8': 0xF8
};

/**
 * Gets the original file name
 * @returns {string} The original file name
 */
export function getOriginalFileName() {
  return _originalFileName;
}

/**
 * Sets the original file name
 * @param {string} fileName - The new file name
 */
export function setOriginalFileName(fileName) {
  _originalFileName = fileName;
}

/**
 * Encodes text to Windows-1252
 * @param {string} text - Input text
 * @returns {Uint8Array} Encoded bytes
 */
export function encodeWindows1252(text) {
  const buffer = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    buffer[i] = code < 128 ? code : WINDOWS_1252_MAP[char] !== undefined ? WINDOWS_1252_MAP[char] : (code <= 255 ? code : 63);
  }
  return buffer;
}

/**
 * Updates file statistics display
 * @param {string} content - File content
 */
export function updateFileStats(content) {
  const lines = content.split(/\r?\n/);
  document.getElementById('lineCount').textContent = `Lines: ${lines.length.toLocaleString()}`;
  document.getElementById('charCount').textContent = `Characters: ${content.length.toLocaleString()}`;
}

/**
 * Sets display content
 * @param {string} content - Content to display
 */
export function setDisplayContent(content) {
  displayContent = content;
}

/**
 * Handles file content loading
 * @param {ArrayBuffer} arrayBuffer - File buffer
 * @param {Function} simulateCallback - Callback to simulate toolpath
 */
export function handleFileContent(arrayBuffer, simulateCallback) {
  fileContentArrayBuffer = arrayBuffer;
  try {
    const decoder = new TextDecoder('windows-1252');
    displayContent = decoder.decode(arrayBuffer);
    originalEncoding = 'windows-1252';
  } catch (e) {
    console.error('Error decoding with windows-1252:', e);
    try {
      const decoder = new TextDecoder('utf-8');
      displayContent = decoder.decode(arrayBuffer);
      originalEncoding = 'utf-8';
    } catch (e) {
      console.error('Error decoding with utf-8:', e);
      alert('Error decoding file.');
      resetFileInput(() => clearCanvas(document.getElementById('toolpathCanvas')));
      return;
    }
  }
  displayContent = displayContent.replace(/\[DIA\]/gi, '\u00D8').replace(/\[DIAMETER\]/gi, '\u00D8');
  document.getElementById('contentTextarea').value = displayContent;
  updateFileStats(displayContent);
  simulateCallback();
}

/**
 * Generates a unique save filename
 * @returns {string} Generated filename
 */
export function generateSaveName() {
  if (lastSavedName) {
    const editMatch = lastSavedName.match(/^(.*?)(_edit[0-9]+)(\.[^.]+)?$/i);
    if (editMatch) {
      const baseName = editMatch[1];
      const currentEditNum = parseInt(editMatch[2].replace('_edit', '')) || 0;
      const extension = _originalFileName && _originalFileName.includes('.') 
        ? _originalFileName.substring(_originalFileName.lastIndexOf('.')) 
        : (editMatch[3] || '');
      return `${baseName}_edit${currentEditNum + 1}${extension}`;
    }
  }
  if (_originalFileName) {
    const lastDotIndex = _originalFileName.lastIndexOf('.');
    const baseName = lastDotIndex > -1 ? _originalFileName.substring(0, lastDotIndex) : _originalFileName;
    const extension = lastDotIndex > -1 ? _originalFileName.substring(lastDotIndex) : '';
    return `${baseName}_edit${editCounter}${extension}`;
  }
  return `nc_edit${editCounter}`;
}

/**
 * Resets file input and clears canvas
 * @param {Function} clearCanvasCallback - Callback to clear canvas
 */
export function resetFileInput(clearCanvasCallback) {
  document.getElementById('fileInput').value = '';
  document.getElementById('fileNameDisplay').textContent = 'No file selected';
  document.getElementById('contentTextarea').value = '';
  fileContentArrayBuffer = null;
  displayContent = '';
  setOriginalFileName('');
  updateFileStats('');
  clearCanvasCallback();
  document.getElementById('warningsDiv').textContent = '';
}

/**
 * Encodes edited content for saving
 * @returns {Uint8Array|null} Encoded content or null if error
 */
export function encodeEditedContent() {
  try {
    const editedText = document.getElementById('contentTextarea').value;
    return encodeWindows1252(editedText.replace(/\u00D8/g, '[DIA]'));
  } catch (error) {
    console.error('Error encoding content:', error);
    alert('Error encoding content.');
    return null;
  }
}

/**
 * Saves the file content
 */
export function saveFile() {
  if (!fileContentArrayBuffer) {
    alert('No content to save');
    return;
  }
  try {
    const saveName = generateSaveName();
    lastSavedName = saveName;
    editCounter++;
    const currentContent = document.getElementById('contentTextarea').value;
    const bytesToSave = currentContent !== displayContent ? encodeEditedContent() : new Uint8Array(fileContentArrayBuffer);
    if (!bytesToSave) throw new Error('Failed to encode content');
    const blob = new Blob([bytesToSave], { type: 'text/plain;charset=windows-1252' });
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
  } catch (error) {
    console.error('Error saving file:', error);
    alert('Error saving file.');
  }
}
