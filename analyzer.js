let parsedData = [];
const toolColors = {};
const colorPalette = ['#fce4ec', '#e3f2fd', '#e8f5e9', '#fff3e0', '#ede7f6', '#f3e5f5', '#f1f8e9', '#e0f7fa', '#f9fbe7', '#fbe9e7'];
let inputFileName = '';

function getToolColor(toolName) {
  if (!toolColors[toolName]) {
    const color = colorPalette[Object.keys(toolColors).length % colorPalette.length];
    toolColors[toolName] = color;
  }
  return toolColors[toolName];
}

function updateFileStats(content) {
  const lines = content.split(/\r?\n/);
  const lineCount = lines.length;
  const charCount = content.length;
  const wordCount = content.split(/[\s]+/).filter(word => word.length > 0).length || 0;
  
  document.getElementById('lineCount').textContent = `Lines: ${lineCount.toLocaleString()}`;
  document.getElementById('charCount').textContent = `Characters: ${charCount.toLocaleString()}`;
  document.getElementById('wordCount').textContent = `Words: ${wordCount.toLocaleString()}`;
  
  let attempts = 0;
  const maxAttempts = 10;
  const pollInterval = setInterval(() => {
    const container = document.getElementById('groupContainer');
    const table = container.querySelector('table');
    if (table) {
      const opCount = table.querySelectorAll('tbody tr').length || table.querySelectorAll('tr:not(:first-child)').length || 0;
      document.getElementById('opCount').textContent = `No. of Ops: ${opCount.toLocaleString()}`;
      
      const toolSet = new Set();
      parsedData.forEach(item => toolSet.add(item.tool));
      document.getElementById('uniqueToolsCount').textContent = `Unique Tools: ${toolSet.size}`;
      
      clearInterval(pollInterval);
    } else if (attempts >= maxAttempts) {
      console.log('Table not found after max attempts. GroupContainer content:', container.innerHTML);
      clearInterval(pollInterval);
    }
    attempts++;
  }, 100);
}

document.getElementById('fileInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) {
    document.getElementById('fileNameDisplay').textContent = 'No file selected';
    return;
  }

  inputFileName = file.name.replace(/\.[^/.]+$/, "");
  document.getElementById('fileNameDisplay').textContent = file.name;





  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      // First try UTF-8 directly
      let content = e.target.result;
      
      // Check for replacement character (�) which indicates encoding issues
      if (content.includes('\ufffd')) {
        // If UTF-8 fails, try Windows-1252 (common for NC files)
        const reReader = new FileReader();
        reReader.onload = function(e) {
          processFileContent(e.target.result);
        };
        reReader.readAsText(file, 'windows-1252');
      } else {
        processFileContent(content);
      }
    } catch (error) {
      console.error('File processing error:', error);
      // Fallback to Windows-1252 if all else fails
      const reReader = new FileReader();
      reReader.onload = function(e) {
        processFileContent(e.target.result);
      };
      reReader.readAsText(file, 'windows-1252');
    }
  };
  
  // First try reading as UTF-8
  reader.readAsText(file, 'UTF-8');
});

function sanitizeText(text) {
  // Replace any remaining invalid characters while preserving special chars like Ř
  return text.replace(/[^\x00-\xFF]/g, '').trim();
}

function processFileContent(content) {
  updateFileStats(content);
  
  const lines = content.split(/\r?\n/);
  parsedData = [];
  Object.keys(toolColors).forEach(k => delete toolColors[k]);

  let currentOperation = null;

  lines.forEach(line => {
    const opMatch = line.match(/OPERATION:\s*(.+?)\s*- TOOL:\s*(.+)/);
    const toolCallMatch = line.match(/\d+\s+TOOL CALL (\d+)\s+Z\s+S(\d+)/);
    const feedMatch = line.match(/F(\d+(\.\d+)?)/);
    const plungingFeedMatch = line.match(/Q206=\+(\d+)/);

    if (opMatch) {
      currentOperation = {
        operation: sanitizeText(opMatch[1]),
        tool: sanitizeText(opMatch[2]),
        toolNumber: '',
        rpm: '',
        feedrates: new Set()
      };
      parsedData.push(currentOperation);
    } else if (currentOperation && toolCallMatch) {
      currentOperation.toolNumber = toolCallMatch[1];
      currentOperation.rpm = toolCallMatch[2];
    } else if (currentOperation && (feedMatch || plungingFeedMatch) && !line.includes('M128')) {
      if (feedMatch) {
        currentOperation.feedrates.add(feedMatch[1]);
      }
      if (plungingFeedMatch) {
        currentOperation.feedrates.add(plungingFeedMatch[1]);
      }
    }
  });

  renderOutput();
}




document.getElementById('groupToggle').addEventListener('change', function () {
  const isChecked = this.checked;
  document.getElementById('collapseAll').disabled = !isChecked;
  document.getElementById('expandAll').disabled = !isChecked;
  clearButtonStates();
  renderOutput();
});

document.getElementById('collapseAll').addEventListener('click', function () {
  if (this.disabled) return;
  this.classList.add('active');
  document.getElementById('expandAll').classList.remove('active');

  document.querySelectorAll('.tool-body').forEach(body => body.style.display = 'none');
  document.querySelectorAll('.tool-header').forEach(header => {
    header.textContent = header.textContent.replace('▼', '▶');
  });
});

document.getElementById('expandAll').addEventListener('click', function () {
  if (this.disabled) return;
  this.classList.add('active');
  document.getElementById('collapseAll').classList.remove('active');

  document.querySelectorAll('.tool-body').forEach(body => body.style.display = 'block');
  document.querySelectorAll('.tool-header').forEach(header => {
    header.textContent = header.textContent.replace('▶', '▼');
  });
});

function clearButtonStates() {
  document.getElementById('collapseAll').classList.remove('active');
  document.getElementById('expandAll').classList.remove('active');
}

function renderOutput() {
  const container = document.getElementById('groupContainer');
  container.innerHTML = '';

  const groupMode = document.getElementById('groupToggle').checked;

  if (groupMode) {
    renderGrouped(container);
  } else {
    renderFlat(container);
  }
}

function renderGrouped(container) {
  const grouped = {};
  parsedData.forEach(item => {
    if (!grouped[item.tool]) grouped[item.tool] = [];
    grouped[item.tool].push(item);
  });

  let counter = 1;

  Object.entries(grouped).forEach(([toolName, ops]) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'tool-group';
    const color = getToolColor(toolName);

    const header = document.createElement('div');
    header.className = 'tool-header';
    header.style.backgroundColor = color;
    header.textContent = `▼ Tool: ${toolName} (${ops.length} operations)`;
    header.addEventListener('click', () => {
      const isCollapsed = body.style.display === 'none';
      body.style.display = isCollapsed ? 'block' : 'none';
      header.textContent = (isCollapsed ? '▼' : '▶') + ` Tool: ${toolName} (${ops.length} operations)`;
      clearButtonStates();
    });

    const body = document.createElement('div');
    body.className = 'tool-body';
    body.style.display = 'block';

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';

    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>No.</th>
          <th>Operation Name</th>
          <th>Tool Name</th>
          <th>Tool Number</th>
          <th>Spindle RPM</th>
          <th>Feedrates</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    ops.forEach(op => {
      const row = document.createElement('tr');
      row.style.backgroundColor = color;
      row.innerHTML = `
        <td>${counter++}</td>
        <td>${op.operation}</td>
        <td>${op.tool}</td>
        <td>${op.toolNumber}</td>
        <td>${op.rpm}</td>
        <td>${Array.from(op.feedrates).join(', ')}</td>
      `;
      tbody.appendChild(row);
    });

    tableWrapper.appendChild(table);
    body.appendChild(tableWrapper);
    groupDiv.appendChild(header);
    groupDiv.appendChild(body);
    container.appendChild(groupDiv);
  });
}

function renderFlat(container) {
  let counter = 1;

  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'table-wrapper';
  
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>No.</th>
        <th>Operation Name</th>
        <th>Tool Name</th>
        <th>Tool Number</th>
        <th>Spindle RPM</th>
        <th>Feedrates</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  parsedData.forEach(op => {
    const row = document.createElement('tr');
    row.style.backgroundColor = getToolColor(op.tool);
    row.innerHTML = `
      <td>${counter++}</td>
      <td>${op.operation}</td>
      <td>${op.tool}</td>
      <td>${op.toolNumber}</td>
      <td>${op.rpm}</td>
      <td>${Array.from(op.feedrates).join(', ')}</td>
    `;
    tbody.appendChild(row);
  });

  tableWrapper.appendChild(table);
  container.appendChild(tableWrapper);
}

// [Previous code remains exactly the same until the downloadBtn event listener]

document.getElementById('downloadBtn').addEventListener('click', function () {
  const format = document.getElementById('format').value;
  const baseName = inputFileName || 'nc_output';
  
  // Prepare the data rows
  const rows = [
    ["No.", "Operation Name", "Tool Name", "Tool Number", "Spindle RPM", "Feedrates"]
  ];
  
  parsedData.forEach((item, index) => {
    rows.push([
      index + 1,
      item.operation,
      item.tool,
      item.toolNumber,
      item.rpm,
      Array.from(item.feedrates).join(', ')
    ]);
  });

  if (format === 'csv') {
    // Create CSV content with proper escaping
    const csvContent = rows.map(row => 
      row.map(cell => `"${typeof cell === 'string' ? cell.replace(/"/g, '""') : cell}"`).join(',')
    ).join('\r\n');
    
    // Create blob with UTF-8 BOM
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8' });
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = `${baseName}.csv`;
    
    // Append to DOM, trigger click, then remove
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
  } else if (format === 'txt') {
    const txtContent = rows.map(row => row.join('\t')).join('\n');
    downloadFile(txtContent, `${baseName}.txt`, 'text/plain;charset=utf-8');
    
  } else if (format === 'xlsx') {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = `${baseName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }
});

// Modified downloadFile function with better cleanup
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
