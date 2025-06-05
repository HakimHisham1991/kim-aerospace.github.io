let parsedData = [];
const toolColors = {};
const colorPalette = ['#fce4ec', '#e3f2fd', '#e8f5e9', '#fff3e0', '#ede7f6', '#f3e5f5', '#f1f8e9', '#e0f7fa', '#f9fbe7', '#fbe9e7'];
let inputFileName = '';

// Excel width helper function
function excelWidth(jsWidth) {
  return jsWidth + 0.71; // Compensate for Excel's internal padding
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
      console.error('File processing error:', error);
												   
      const reReader = new FileReader();
      reReader.onload = function(e) {
        processFileContent(e.target.result);
      };
      reReader.readAsText(file, 'windows-1252');
    }
  };
  
							   
  reader.readAsText(file, 'UTF-8');
});

function sanitizeText(text) {
																					
  return text.replace(/[^\x00-\xFF]/g, '').trim();
}



function processFileContent(content) {
  updateFileStats(content);
  
  const lines = content.split(/\r?\n/);
  parsedData = [];
  Object.keys(toolColors).forEach(k => delete toolColors[k]);

  let currentOperation = null;
  let m7Activated = false;

  lines.forEach(line => {
    const opMatch = line.match(/\*\s*-\s*OPERATION:\s*(.+?)\s*-\s*TOOL:\s*(.+)/);
    const toolCallMatch = line.match(/TOOL CALL\s+(\d+)\s+Z\s+S(\d+)/i);
    const rpmOnlyMatch = line.match(/TOOL CALL\s+Z\s+S(\d+)/i);
    const feedMatch = line.match(/F(\d+(\.\d+)?)/);
    const plungingFeedMatch = line.match(/Q206=([+-]?\d+(?:\.\d+)?)/i);
    const m7Match = line.match(/M7/i);

    if (opMatch) {
      currentOperation = {
        operation: sanitizeText(opMatch[1].trim()),
        tool: sanitizeText(opMatch[2].trim().replace(/~[\s\S]*/, '')),
        toolNumber: '',
        rpm: '',
        feedrates: new Set(),
        m7Coolant: false
      };
      m7Activated = false;
      parsedData.push(currentOperation);
    } else if (currentOperation && toolCallMatch) {
      currentOperation.toolNumber = toolCallMatch[1];
      currentOperation.rpm = toolCallMatch[2];
    } else if (currentOperation && rpmOnlyMatch) {
																	  
      currentOperation.rpm = rpmOnlyMatch[1];
    } else if (currentOperation && (feedMatch || plungingFeedMatch) && !line.includes('M128')) {
      if (feedMatch) {
        currentOperation.feedrates.add(feedMatch[1]);
      }
      if (plungingFeedMatch) {
        currentOperation.feedrates.add(plungingFeedMatch[1]);
      }
    } else if (currentOperation && m7Match) {
      m7Activated = true;
      currentOperation.m7Coolant = true;
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
          <th>Feedrates</th>
          <th>Spindle RPM</th>
          <th>M7 Thru Coolant</th>
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
        <td>${Array.from(op.feedrates).join(', ')}</td>
        <td>${op.rpm}</td>
        <td>${op.m7Coolant ? 'X' : ''}</td>
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
        <th>M7 Thru Coolant</th>
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
      <td>${Array.from(op.feedrates).join(', ')}</td>
      <td>${op.rpm}</td>
      <td>${op.m7Coolant ? 'X' : ''}</td>
    `;
    tbody.appendChild(row);
  });

  tableWrapper.appendChild(table);
  container.appendChild(tableWrapper);
}

																				



document.getElementById('downloadBtn').addEventListener('click', async function () {
  const format = document.getElementById('format').value;
  const baseName = inputFileName || 'nc_output';
  
						  
  const header = ["No.", "Operation Name", "Tool Name", "Tool Number", "Feedrates", "Spindle RPM", "M7 Thru Coolant"];
  const rows = [];
  
  parsedData.forEach((item, index) => {
    rows.push([
      index + 1,
      item.operation,
      item.tool,
      item.toolNumber,
      Array.from(item.feedrates).join(', '),
      item.rpm,
      item.m7Coolant ? 'X' : ''
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
    
 
 
 else if (format === 'xlsx') {
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
          fgColor: { argb: 'FFC5D9F1' } // RGB 197,217,241
        };
        cell.font = {
          bold: true
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true // This enables text wrapping
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      
      // Set row height for header (optional but recommended)
      headerRow.height = 30; // Adjust as needed
      
      // Add data rows
      rows.forEach(row => worksheet.addRow(row));
      
      // Style data rows (without wrapText)
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) { // Skip header row
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
      
      // Set column widths (using your excelWidth function)
      worksheet.columns = [
        { width: excelWidth(5) },    // No.
        { width: excelWidth(30) },   // Operation Name
        { width: excelWidth(20) },   // Tool Name
        { width: excelWidth(12) },   // Tool Number
        { width: excelWidth(15) },   // Feedrates
        { width: excelWidth(12) },   // Spindle RPM
        { width: excelWidth(12) }    // M7 Thru Coolant
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
