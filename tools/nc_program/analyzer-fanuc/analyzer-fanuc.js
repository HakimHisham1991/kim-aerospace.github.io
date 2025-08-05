let parsedData = [];
const toolColors = {};
const colorPalette = ['#fce4ec', '#e3f2fd', '#e8f5e9', '#fff3e0', '#ede7f6', '#f3e5f5', '#f1f8e9', '#e0f7fa', '#f9fbe7', '#fbe9e7'];
let inputFileName = '';

function excelWidth(jsWidth) {
  return jsWidth + 0.71;
}

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
  
  document.getElementById('lineCount').textContent = `Lines: ${lineCount.toLocaleString()}`;
  document.getElementById('charCount').textContent = `Characters: ${charCount.toLocaleString()}`;
  
  let attempts = 0;
  const maxAttempts = 10;
  const pollInterval = setInterval(() => {
    const container = document.getElementById('groupContainer');
    const table = container.querySelector('table');
    if (table) {
      const opCount = table.querySelectorAll('tbody tr').length || table.querySelectorAll('tr:not(:first-child)').length || 0;
      document.getElementById('opCount').textContent = `No. of Operations: ${opCount.toLocaleString()}`;
      
      const toolSet = new Set();
      parsedData.forEach(item => toolSet.add(item.toolNumber));
      document.getElementById('uniqueToolsCount').textContent = `Unique Tools: ${toolSet.size}`;
      
      clearInterval(pollInterval);
    } else if (attempts >= maxAttempts) {
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
      let content = e.target.result;
      
      if (content.includes('\ufffd')) {
        const reReader = new FileReader();
        reReader.onload = function(e) {
          processFileContent(e.target.result);
        };
        reReader.readAsText(file, 'windows-1252');
      } else {
        processFileContent(content);
      }
    } catch (error) {
      const reReader = new FileReader();
      reReader.onload = function(e) {
        processFileContent(e.target.result);
      };
      reReader.readAsText(file, 'windows-1252');
    }
  };
  
  reader.readAsText(file, 'UTF-8');
});

function processFileContent(content) {
  updateFileStats(content);
  
  const lines = content.split(/\r?\n/);
  parsedData = [];
  Object.keys(toolColors).forEach(k => delete toolColors[k]);

  let currentOperation = null;
  let operationCounter = 0;

  lines.forEach((line, index) => {
    // Check for operation start
    if (line.includes('Start Path')) {
      const operationNameMatch = line.match(/Start Path\s*:\s*(.+?)(?:\s*\)|$)/);
      const operationName = operationNameMatch ? operationNameMatch[1].trim() : `Operation ${++operationCounter}`;
      
      currentOperation = {
        operation: operationName,
        toolNumber: '',
        toolName: '',
        rpm: '',
        feedrates: new Set(),
        throughCoolant: false
      };
      parsedData.push(currentOperation);
    }
    
    // Check for tool information in the operation header (only for tool name)
    if (currentOperation && line.includes('Tool Name')) {
      const toolNameMatch = line.match(/Tool Name\s*:\s*([^)\r\n]+)/);
      if (toolNameMatch) {
        currentOperation.toolName = toolNameMatch[1].trim();
      }
    }
    
    // Check for tool change (M06) - strict format
    if (currentOperation && line.includes('M06')) {
      // Find the tool number in the format T## before M06
      const toolMatch = line.match(/(?:^|\s)(T\d+)(?=.*M06)/);
      
      // Also look for the previous line in case it's on a separate line
      let prevLineToolMatch = null;
      if (index > 0) {
        prevLineToolMatch = lines[index - 1].match(/(?:^|\s)(T\d+)(?:\s|$)/);
      }

      if (toolMatch) {
        // Remove leading zeros and add 'T' prefix if not already there
        const toolNum = toolMatch[1].replace(/^T0+/, 'T');
        currentOperation.toolNumber = toolNum;
      } else if (prevLineToolMatch) {
        // Tool number was on previous line
        const toolNum = prevLineToolMatch[1].replace(/^T0+/, 'T');
        currentOperation.toolNumber = toolNum;
      }
      
      // If tool name wasn't found in the header, try to extract it from the line
      if (!currentOperation.toolName) {
        // Try to get tool name from comment after M06
        const commentMatch = line.match(/\(([^)]+)\)/);
        if (commentMatch) {
          currentOperation.toolName = commentMatch[1].trim();
        }
      }
    }
    
    // Check for spindle speed (S) - improved version that ignores comments
    if (currentOperation && !currentOperation.rpm) {
      // Remove comments (anything in brackets) first
      const codeWithoutComments = line.replace(/\(.*?\)/g, '');
      
      // Look for S followed by numbers, possibly with G97 or other commands around it
      const rpmMatch = codeWithoutComments.match(/(?:^|\s)(?:G97\s+)?S(\d+)(?:\s|$)/);
      if (rpmMatch) {
        currentOperation.rpm = rpmMatch[1];
      }
    }
    
    // Check for feedrate (F)
    if (currentOperation && line.includes('F')) {
      const feedMatch = line.match(/F(\d+(\.\d+)?)/);
      if (feedMatch) {
        currentOperation.feedrates.add(feedMatch[1]);
      }
    }
    
    // Check for through coolant activation
    if (currentOperation) {
      const coolantCodes = ['M51', 'M131', 'M07', 'M7', 'M88'];
      const hasCoolant = coolantCodes.some(code => {
        // Match the code as a whole word (preceded by whitespace or start of line, followed by whitespace or end of line)
        return new RegExp(`(?:^|\\s)${code}(?:\\s|$)`).test(line);
      });
      
      if (hasCoolant) {
        currentOperation.throughCoolant = true;
      }
    }
  });

  renderOutput();
}

// Rest of the file remains the same...
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
    if (!grouped[item.toolNumber]) grouped[item.toolNumber] = [];
    grouped[item.toolNumber].push(item);
  });

  let counter = 1;

  Object.entries(grouped).forEach(([toolNumber, ops]) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'tool-group';
    const color = getToolColor(toolNumber);

    const header = document.createElement('div');
    header.className = 'tool-header';
    header.style.backgroundColor = color;
    header.textContent = `▼ Tool: ${toolNumber} (${ops.length} operations)`;
    header.addEventListener('click', () => {
      const isCollapsed = body.style.display === 'none';
      body.style.display = isCollapsed ? 'block' : 'none';
      header.textContent = (isCollapsed ? '▼' : '▶') + ` Tool: ${toolNumber} (${ops.length} operations)`;
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
          <th>Feedrates</th>
          <th>Spindle RPM</th>
          <th>Through Coolant</th>
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
        <td>${op.toolName}</td>
        <td>${op.toolNumber}</td>
        <td>${Array.from(op.feedrates).join(', ')}</td>
        <td>${op.rpm}</td>
        <td>${op.throughCoolant ? 'X' : ''}</td>
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
        <th>Feedrates</th>
        <th>Spindle RPM</th>
        <th>Through Coolant</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  parsedData.forEach(op => {
    const row = document.createElement('tr');
    row.style.backgroundColor = getToolColor(op.toolNumber);
    row.innerHTML = `
      <td>${counter++}</td>
      <td>${op.operation}</td>
      <td>${op.toolName}</td>
      <td>${op.toolNumber}</td>
      <td>${Array.from(op.feedrates).join(', ')}</td>
      <td>${op.rpm}</td>
      <td>${op.throughCoolant ? 'X' : ''}</td>
    `;
    tbody.appendChild(row);
  });

  tableWrapper.appendChild(table);
  container.appendChild(tableWrapper);
}

document.getElementById('downloadBtn').addEventListener('click', async function () {
  const format = document.getElementById('format').value;
  const baseName = inputFileName || 'eia_output';
  
  const header = ["No.", "Operation Name", "Tool Name", "Tool Number", "Feedrates", "Spindle RPM", "Through Coolant"];
  const rows = [];
  
  parsedData.forEach((item, index) => {
    rows.push([
      index + 1,
      item.operation,
      item.toolName,
      item.toolNumber,
      Array.from(item.feedrates).join(', '),
      item.rpm,
      item.throughCoolant ? 'X' : ''
    ]);
  });

  if (format === 'csv') {
    const csvContent = rows.map(row => 
      row.map(cell => `"${typeof cell === 'string' ? cell.replace(/"/g, '""') : cell}"`).join(',')
    ).join('\r\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = `${baseName}.csv`;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
  } else if (format === 'txt') {
    const txtContent = rows.map(row => row.join('\t')).join('\n');
    downloadFile(txtContent, `${baseName}.txt`, 'text/plain;charset=utf-8');
    
  } else if (format === 'xlsx') {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Results');
      
      // Add header row
      worksheet.addRow(header);
      
      // Style the header row with wrapText enabled
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFC5D9F1' }
        };
        cell.font = {
          bold: true
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      
      // Set row height for header
      headerRow.height = 30;
      
      // Add data rows
      rows.forEach(row => worksheet.addRow(row));
      
      // Style data rows
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell) => {
            cell.alignment = {
              vertical: 'middle',
              horizontal: 'left'
            };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
        }
      });
      
      // Set column widths
      worksheet.columns = [
        { width: excelWidth(5) },
        { width: excelWidth(30) },
        { width: excelWidth(12) },
        { width: excelWidth(25) },
        { width: excelWidth(15) },
        { width: excelWidth(12) },
        { width: excelWidth(15) }
      ];
      
      // Add filters
      worksheet.autoFilter = {
        from: 'A1',
        to: 'G1'
      };
      
      // Freeze header row
      worksheet.views = [
        { state: 'frozen', ySplit: 1 }
      ];
      
      // Generate the Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `${baseName}.xlsx`);
      
    } catch (error) {
      console.error('Error generating Excel file:', error);
      alert('Error generating Excel file. See console for details.');
    }
  }
});

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