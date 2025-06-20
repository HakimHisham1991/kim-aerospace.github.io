document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('excel-files');
    const processBtn = document.getElementById('process-btn');
    const exportXlsxBtn = document.getElementById('export-xlsx-btn');
    const clearBtn = document.getElementById('clear-btn');
    const tableContainer = document.getElementById('table-container');

    // Column indexes for reference (0-based index in the expectedColumns array)
    const COLUMN_INDEXES = {
        TOOL_NO: 0,
        TOOL_NAME: 1,
        CONSUMABLE_DESC: 2,
        TOOL_SUPPLIER: 3,
        TOOL_HOLDER: 4,
        TOOL_DIAMETER: 5,
        FLUTE_LENGTH: 6,
        TOOL_EXT_LENGTH: 7,
        CORNER_RADIUS: 8,
        ARBOR_DESC: 9,
        PATH_TIME: 10,
        REMARKS: 11,
        FILENAME: 12
    };

    let combinedData = [];
    const expectedColumns = [
        "Tool No.",
        "Tool Name",
        "Consumable Tool Description",
        "Tool Supplier",
        "Tool Holder",
        "Tool Diameter (D1)",
        "Flute Length (L1)",
        "Tool Ext. Length (L2)",
        "Tool Corner Radius",
        "Arbor Description(or equivalent specs)",
        "Tool Path Time in Minutes",
        "Remarks",
        "Filename"
    ];
    
    processBtn.addEventListener('click', processFiles);
    exportXlsxBtn.addEventListener('click', exportToXLSX);
    clearBtn.addEventListener('click', clearResults);
    
    function processFiles() {
        const files = fileInput.files;
        if (files.length === 0) {
            alert('Please select at least one Excel file.');
            return;
        }
        
        combinedData = [];
        tableContainer.innerHTML = '';
        
        let filesProcessed = 0;
        
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    if (workbook.SheetNames.length > 0) {
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                        
                        let startRow = 10;
                        let endRow = jsonData.length;
                        
                        for (let i = startRow; i < jsonData.length; i++) {
                            if (jsonData[i] && jsonData[i][0] && 
                                String(jsonData[i][0]).includes("CAM Programmer :")) {
                                endRow = i;
                                break;
                            }
                        }
                        
                        for (let i = startRow; i < endRow; i++) {
                            if (jsonData[i] && jsonData[i].length > 0) {
                                const rowData = [];
                                
                                for (let col = 0; col < 12; col++) {
                                    rowData.push(jsonData[i][col] !== undefined ? jsonData[i][col] : '');
                                }
                                
                                rowData.push(file.name);
                                
                                while (rowData.length < 13) {
                                    rowData.push('');
                                }
                                
                                combinedData.push(rowData);
                            }
                        }
                    }
                    
                    filesProcessed++;
                    
                    if (filesProcessed === files.length) {
                        displayResults();
                    }
                } catch (error) {
                    console.error('Error processing file:', file.name, error);
                    filesProcessed++;
                    
                    if (filesProcessed === files.length) {
                        displayResults();
                    }
                }
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
    
    function displayResults() {
        if (combinedData.length === 0) {
            tableContainer.innerHTML = '<div class="status error">No valid data found in the files.</div>';
            exportXlsxBtn.disabled = true;
            clearBtn.disabled = true;
            return;
        }
        
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        expectedColumns.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        
        combinedData.forEach(row => {
            const tr = document.createElement('tr');
            
            row.forEach((cell, index) => {
                const td = document.createElement('td');
                if (index === COLUMN_INDEXES.PATH_TIME && typeof cell === 'number') {
                    td.textContent = cell.toFixed(2);
                } else {
                    td.textContent = cell !== undefined ? cell : '';
                }
                tr.appendChild(td);
            });
            
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(table);
        
        const statusDiv = document.createElement('div');
        statusDiv.className = 'status success';
        statusDiv.textContent = `Processed ${combinedData.length} rows from ${fileInput.files.length} file(s).`;
        tableContainer.insertBefore(statusDiv, table);
        
        exportXlsxBtn.disabled = false;
        clearBtn.disabled = false;
    }
    
    function exportToXLSX() {
        if (combinedData.length === 0) {
            alert('No data to export!');
            return;
        }

        try {
            const wb = XLSX.utils.book_new();
            const xlsxData = [expectedColumns, ...combinedData];
            const ws = XLSX.utils.aoa_to_sheet(xlsxData);
            XLSX.utils.book_append_sheet(wb, ws, "Combined Data");
            XLSX.writeFile(wb, 'combined_data.xlsx');
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please check console for details.');
        }
    }
    
    function clearResults() {
        combinedData = [];
        tableContainer.innerHTML = '';
        fileInput.value = '';
        exportXlsxBtn.disabled = true;
        clearBtn.disabled = true;
    }
});