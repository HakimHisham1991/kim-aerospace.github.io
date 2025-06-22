let fileContent = '';
let originalFileName = '';
let contentHistory = [];
let editCounter = 1;
let lastSavedName = '';

function updateFileStats(content) {
  console.log('Updating file stats, content length:', content.length);
  const lines = content.split(/\r?\n/);
  const lineCount = lines.length;
  const charCount = content.length;
  
  document.getElementById('lineCount').textContent = `Lines: ${lineCount.toLocaleString()}`;
  document.getElementById('charCount').textContent = `Characters: ${charCount.toLocaleString()}`;
}

function saveToHistory(content) {
  console.log('Saving to history, history length:', contentHistory.length + 1);
  contentHistory.push(content);
  document.getElementById('undoBtn').disabled = contentHistory.length <= 1;
}

function handleFileContent(content) {
  console.log('Handling file content, length:', content.length);
  const normalizedContent = content
    .replace(/\[DIA\]/gi, '⌀')
    .replace(/\[DIAMETER\]/gi, '⌀')
    .replace(/\u00D8/g, '⌀')
    .replace(/\u00F8/g, '⌀');

  fileContent = normalizedContent;
  document.getElementById('contentTextarea').value = fileContent;
  updateFileStats(fileContent);
  contentHistory = [fileContent];
  document.getElementById('undoBtn').disabled = true;
}

function generateSaveName() {
  console.log('Generating save name, lastSavedName:', lastSavedName, 'originalFileName:', originalFileName);
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
  console.log('Resetting file input');
  document.getElementById('fileInput').value = '';
  document.getElementById('fileNameDisplay').textContent = 'No file selected';
  document.getElementById('contentTextarea').value = '';
  fileContent = '';
  contentHistory = [];
  document.getElementById('undoBtn').disabled = true;
  updateFileStats('');
}

document.getElementById('fileInput').addEventListener('change', function (e) {
  console.log('File input changed, files:', e.target.files);
  const file = e.target.files[0];
  if (!file) {
    console.log('No file selected');
    resetFileInput();
    return;
  }

  console.log('Selected file:', file.name, 'size:', file.size);
  originalFileName = file.name;
  document.getElementById('fileNameDisplay').textContent = file.name;
  editCounter = 1;
  lastSavedName = '';

  const reader = new FileReader();
  reader.onload = function (e) {
    console.log('FileReader onload triggered, result length:', e.target.result.length);
    try {
      let content = e.target.result;
      if (content.includes('\ufffd')) {
        console.log('Detected possible encoding issue, retrying with windows-1252');
        const reReader = new FileReader();
        reReader.onload = function(e) {
          console.log('Re-read file with windows-1252, result length:', e.target.result.length);
          handleFileContent(e.target.result);
        };
        reReader.onerror = function(error) {
          console.error('Re-read error:', error);
          alert('Error reading file with alternative encoding. See console for details.');
          resetFileInput();
        };
        reReader.readAsText(file, 'windows-1252');
      } else {
        handleFileContent(content);
      }
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

  console.log('Reading file as UTF-8');
  reader.readAsText(file, 'UTF-8');
});

document.getElementById('removeSpacesBtn').addEventListener('click', function() {
  console.log('Remove Spaces button clicked');
  if (!fileContent) {
    alert('Please load a file first');
    return;
  }

  const processedContent = (() => {
    const lines = fileContent.split(/\r?\n/);
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

  if (processedContent !== fileContent) {
    saveToHistory(fileContent);
    fileContent = processedContent;
    document.getElementById('contentTextarea').value = fileContent;
    updateFileStats(fileContent);
  }
});

document.getElementById('addSpacesBtn').addEventListener('click', function() {
  console.log('Add Spaces button clicked');
  if (!fileContent) {
    alert('Please load a file first');
    return;
  }

  const processedContent = (() => {
    const AXIS_LETTERS = /[A-Z]/;
    const WHITESPACE = /\s/;
    
    return fileContent.split(/\r?\n/).map(line => {
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

  if (processedContent !== fileContent) {
    saveToHistory(fileContent);
    fileContent = processedContent;
    document.getElementById('contentTextarea').value = fileContent;
    updateFileStats(fileContent);
  }
});

document.getElementById('undoBtn').addEventListener('click', function() {
  console.log('Undo button clicked');
  if (contentHistory.length > 1) {
    contentHistory.pop();
    fileContent = contentHistory[contentHistory.length - 1];
    document.getElementById('contentTextarea').value = fileContent;
    updateFileStats(fileContent);
    document.getElementById('undoBtn').disabled = contentHistory.length <= 1;
  }
});

document.getElementById('saveFileBtn').addEventListener('click', function() {
  console.log('Save File button clicked');
  if (!fileContent) {
    alert('No content to save');
    return;
  }

  try {
    const saveName = generateSaveName();
    lastSavedName = saveName;
    editCounter++;
    
    const blob = new Blob([`\uFEFF${fileContent}`], { type: 'text/plain;charset=utf-8' });
    
    if (typeof saveAs !== 'undefined') {
      console.log('Using saveAs for file download');
      saveAs(blob, saveName);
    } else if (navigator.msSaveBlob) {
      console.log('Using msSaveBlob for file download');
      navigator.msSaveBlob(blob, saveName);
    } else {
      console.log('Using anchor tag for file download');
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
  console.log('Clear File button clicked');
  if (confirm('Are you sure you want to clear the current file? This action cannot be undone.')) {
    resetFileInput();
  }
});