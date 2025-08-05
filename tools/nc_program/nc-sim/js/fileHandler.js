console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { saveToHistory } from './uiControls.js';
import { clearCanvas } from './main.js';

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



export function updateFileStats(content) {
  console.log('updateFileStats called with content length:', content.length);
  const lines = content.split(/\r?\n/);
  let lineCountElement = document.getElementById('lineCount');
  let charCountElement = document.getElementById('charCount');

  // Fallback: Create elements if not found
  if (!lineCountElement) {
    console.warn('lineCount element not found, creating dynamically');
    lineCountElement = document.createElement('span');
    lineCountElement.id = 'lineCount';
    lineCountElement.textContent = 'Lines: 0';
    const statsContainer = document.querySelector('.stats-container') || document.body;
    statsContainer.appendChild(lineCountElement);
  }
  if (!charCountElement) {
    console.warn('charCount element not found, creating dynamically');
    charCountElement = document.createElement('span');
    charCountElement.id = 'charCount';
    charCountElement.textContent = 'Characters: 0';
    const statsContainer = document.querySelector('.stats-container') || document.body;
    statsContainer.appendChild(charCountElement);
  }

  console.log('DOM elements with IDs:', Array.from(document.querySelectorAll('[id]')).map(el => ({
    id: el.id,
    tagName: el.tagName,
    outerHTML: el.outerHTML.substring(0, 100)
  })));

  console.log('Updating file stats:', {
    lines: lines.length,
    characters: content.length,
    contentPreview: content.substring(0, 100)
  });
  
  lineCountElement.textContent = `Lines: ${lines.length.toLocaleString()}`;
  charCountElement.textContent = `Characters: ${content.length.toLocaleString()}`;
}





/**
 * Sets display content
 * @param {string} content - Content to display
 */
export function setDisplayContent(content) {
  displayContent = content;
  saveToHistory(content);
  const contentDiv = document.getElementById('contentDiv');
  if (contentDiv) {
    contentDiv.innerHTML = '';
    content.split(/\r?\n/).forEach(line => {
      const lineSpan = document.createElement('span');
      lineSpan.className = 'line';
      lineSpan.textContent = line + '\n';
      contentDiv.appendChild(lineSpan);
    });
  }
}




/**
 * Handles file content loading
 * @param {ArrayBuffer} arrayBuffer - File buffer
 * @param {Function} simulateCallback - Callback to simulate toolpath
 */
export function handleFileContent(arrayBuffer, simulateCallback) {
  console.log('handleFileContent started');
  try {
    const decoder = new TextDecoder('windows-1252');
    displayContent = decoder.decode(arrayBuffer);
    originalEncoding = 'windows-1252';
    console.log('Decoded with windows-1252, content length:', displayContent.length);
  } catch (e) {
    console.error('Error decoding with windows-1252:', e);
    try {
      const decoder = new TextDecoder('utf-8');
      displayContent = decoder.decode(arrayBuffer);
      originalEncoding = 'utf-8';
      console.log('Decoded with utf-8, content length:', displayContent.length);
    } catch (e) {
      console.error('Error decoding with utf-8:', e);
      alert('Error decoding file: ' + e.message);
      resetFileInput(clearCanvas);
      return;
    }
  }
  if (!displayContent.trim()) {
    console.error('File is empty or contains no valid content');
    alert('Error: File is empty or contains no valid content');
    resetFileInput(clearCanvas);
    return;
  }
  displayContent = displayContent.replace(/\[DIA\]/gi, '\u00D8').replace(/\[DIAMETER\]/gi, '\u00D8');
  console.log('Processed displayContent, length:', displayContent.length, 'preview:', displayContent.substring(0, 100));
  setDisplayContent(displayContent);
  console.log('Calling updateFileStats');
  updateFileStats(displayContent);
  try {
    console.log('Calling simulateCallback');
    simulateCallback();
  } catch (error) {
    console.error('Error during simulation:', error);
    alert('Error simulating toolpath: ' + error.message);
  }
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
  const fileInput = document.getElementById('fileInput');
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  const contentDiv = document.getElementById('contentDiv');
  const warningsDiv = document.getElementById('warningsDiv');

  if (fileInput) fileInput.value = '';
  else console.warn('fileInput element not found');
  
  if (fileNameDisplay) fileNameDisplay.textContent = 'No file selected';
  else console.warn('fileNameDisplay element not found');
  
  if (contentDiv) contentDiv.innerHTML = '';
  else console.warn('contentDiv element not found');
  
  fileContentArrayBuffer = null;
  displayContent = '';
  setOriginalFileName('');
  updateFileStats('');
  
  try {
    clearCanvasCallback();
  } catch (error) {
    console.error('Error clearing canvas:', error);
    alert('Error clearing canvas: ' + error.message);
  }
  
  if (warningsDiv) warningsDiv.textContent = '';
}

/**
 * Encodes edited content for saving
 * @returns {Uint8Array|null} Encoded content or null if error
 */
export function encodeEditedContent() {
  try {
    const contentDiv = document.getElementById('contentDiv');
    if (!contentDiv) {
      console.error('contentDiv element not found');
      alert('Error: contentDiv not found');
      return null;
    }
    const editedText = contentDiv.textContent;
    return encodeWindows1252(editedText.replace(/\u00D8/g, '[DIA]'));
  } catch (error) {
    console.error('Error encoding content:', error);
    alert('Error encoding content: ' + error.message);
    return null;
  }
}

/**
 * Saves the file content
 */
export function saveFile() {
  if (!fileContentArrayBuffer && !document.getElementById('contentDiv').textContent) {
    alert('No content to save');
    return;
  }
  try {
    const saveName = generateSaveName();
    lastSavedName = saveName;
    editCounter++;
    const currentContent = document.getElementById('contentDiv').textContent;
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
    alert('Error saving file: ' + error.message);
  }
}