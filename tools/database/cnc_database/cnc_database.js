const DB_KEY = 'cnc_database';

let currentBuilder = '';
let currentModel = '';
let deleteCallback = null;

let database = {
  Mazak: { models: [], specs: {} },
  DMG: { models: [], specs: {} },
  Fanuc: { models: [], specs: {} }
};



// Add this function to reset all data
function resetAllToDefault() {
  showDeleteModal(
    'Reset All Data to Default?',
    'This will delete ALL your customizations including:<br><br>' +
    '• Custom builders you added<br>' +
    '• Custom models you added<br>' +
    '• Edited specifications<br>' +
    '• Uploaded photos<br><br>' +
    'This action cannot be undone!',
    performResetAll
  );
}

function performResetAll() {
  // Clear localStorage
  localStorage.removeItem(DB_KEY);
  
  // Reload the page to refresh data
  location.reload();
}

// Add event listener for the reset button
document.addEventListener('DOMContentLoaded', function() {
  // ... existing code ...
  
  // Add reset button event listener
  const resetAllBtn = document.getElementById('reset-all-btn');
  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', resetAllToDefault);
  }
  
  // Make sure this is called after loadDatabase
  loadDatabase();
});


// Helper: Get the default local image path for a machine
function getDefaultImagePath(builder, model) {
  const defaults = {
    Mazak: {
      "VRX i500": "images/vrxi500.webp",
      "VRX730": "images/vrx730.webp",
      "VCN530C": "images/vcn530c.webp",
      "Integrex i-400": "images/integrex-i400.webp",
      "Variaxis i-800": "images/vrxi800.webp"
    },
    DMG: {
      "DMU65 monoBLOCK": "images/dmu65.webp",
      "DMU95": "images/dmu95.webp",
      "NVX5100": "images/nvx5100.webp",
      "DMU50 3rd Gen": "images/dmu50.webp"
    },
    Fanuc: {
      "Robodrill α-D21LiB5": "images/robodrill-d21lib5.webp",
      "Robocut α-C600iB": "images/robocut-c600ib.webp"
    }
  };
  return defaults[builder]?.[model] || '';
}

// Load database from JSON files
async function loadDatabase() {
  try {
    const [mazakData, dmgData, fanucData] = await Promise.all([
      fetch('mazak.json').then(r => r.json()),
      fetch('dmg.json').then(r => r.json()),
      fetch('fanuc.json').then(r => r.json())
    ]);
    
    database = {
      Mazak: mazakData.Mazak,
      DMG: dmgData.DMG,
      Fanuc: fanucData.Fanuc
    };
    
    // Load any saved user modifications
    if (localStorage.getItem(DB_KEY)) {
      const saved = JSON.parse(localStorage.getItem(DB_KEY));
      Object.keys(saved).forEach(builder => {
        if (database[builder]) {
          // Merge models
          if (saved[builder].models) {
            database[builder].models = [
              ...new Set([...database[builder].models, ...saved[builder].models])
            ];
          }
          
          // Merge specs
          Object.keys(saved[builder].specs || {}).forEach(model => {
            if (!database[builder].specs[model]) {
              database[builder].specs[model] = { image: '', data: {} };
            }
            
            const savedSpec = saved[builder].specs[model];
            if (savedSpec.image) {
              database[builder].specs[model].image = savedSpec.image;
            }
            
            if (savedSpec.data) {
              database[builder].specs[model].data = {
                ...database[builder].specs[model].data,
                ...savedSpec.data
              };
            }
          });
        } else {
          // This is a custom builder added by user
          database[builder] = saved[builder];
        }
      });
    }
    
    populateBuilders();
    showBuilders();
    setupModalEvents();
    
  } catch (error) {
    console.error('Error loading database:', error);
    initializeUI();
  }
}

// Save user modifications
function saveDatabase() {
  const saved = {};
  
  Object.keys(database).forEach(builder => {
    saved[builder] = {
      models: database[builder].models || [],
      specs: {}
    };
    
    // Only save specs that have modifications
    Object.keys(database[builder].specs || {}).forEach(model => {
      const spec = database[builder].specs[model];
      const originalData = getOriginalDataFromJSON(builder, model);
      
      // Check for modifications
      const hasImageMod = spec.image && spec.image.startsWith('data:image');
      const hasDataMod = !isDataEqual(originalData, spec.data);
      const isCustomModel = !originalData || Object.keys(originalData).length === 0;
      
      if (hasImageMod || hasDataMod || isCustomModel) {
        saved[builder].specs[model] = {};
        if (spec.image) saved[builder].specs[model].image = spec.image;
        if (spec.data) saved[builder].specs[model].data = spec.data;
      }
    });
  });
  
  localStorage.setItem(DB_KEY, JSON.stringify(saved));
  showSaveIndicator('Changes saved');
}

// Helper functions
function isDataEqual(original, current) {
  if (!original && !current) return true;
  if (!original || !current) return false;
  
  const originalKeys = Object.keys(original);
  const currentKeys = Object.keys(current);
  
  if (originalKeys.length !== currentKeys.length) return false;
  
  for (const key of originalKeys) {
    if (original[key] !== current[key]) return false;
  }
  
  return true;
}

function getOriginalDataFromJSON(builder, model) {
  // In production, this would fetch from JSON
  // For now, return empty for custom models
  return {};
}

// Navigation
function showBuilders() {
  document.getElementById('builders-page').style.display = 'block';
  document.getElementById('models-page').style.display = 'none';
  document.getElementById('detail-page').style.display = 'none';
  document.getElementById('sidebar').classList.remove('open');
  populateBuilders();
}

function showModels(builder) {
  currentBuilder = builder;
  document.getElementById('current-builder').textContent = builder;
  document.getElementById('builders-page').style.display = 'none';
  document.getElementById('models-page').style.display = 'block';
  document.getElementById('detail-page').style.display = 'none';
  document.getElementById('sidebar').classList.remove('open');

  populateModels(builder);
}

function showDetail(builder, model) {
  currentBuilder = builder;
  currentModel = model;
  
  document.getElementById('current-model').textContent = model;
  document.getElementById('builders-page').style.display = 'none';
  document.getElementById('models-page').style.display = 'none';
  document.getElementById('detail-page').style.display = 'block';
  document.getElementById('sidebar').classList.remove('open');

  if (!database[builder].specs[model]) {
    database[builder].specs[model] = { image: '', data: {} };
  }
  const specs = database[builder].specs[model];

  // Setup image
  const img = document.getElementById('machine-image');
  img.src = specs.image || getDefaultImagePath(builder, model) || '';

  // Render table
  renderSpecsTable(builder, model, specs);
  
  // Setup buttons
  setupImageUpload(builder, model, img, specs);
  setupResetPhotoButton(builder, model, img, specs);
  setupResetDataButton(builder, model);
  setupDeleteModelButton(builder, model);
  setupAddSpecButton(builder, model);
}

// Builder Management
function populateBuilders() {
  const grid = document.getElementById('builders-grid');
  const list = document.getElementById('builder-list');
  grid.innerHTML = '';
  list.innerHTML = '';

  Object.keys(database).sort().forEach(builder => {
    // Sidebar list
    const li = document.createElement('li');
    
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = builder;
    a.onclick = (e) => { e.preventDefault(); showModels(builder); };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-builder-btn';
    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
    deleteBtn.title = 'Delete builder';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      showDeleteModal(
        `Delete "${builder}"?`,
        `This will delete ${builder} and all ${database[builder].models.length} models.`,
        () => deleteBuilder(builder)
      );
    };
    
    li.appendChild(a);
    li.appendChild(deleteBtn);
    list.appendChild(li);

    // Grid cards
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => showModels(builder);
    
    const deleteCardBtn = document.createElement('button');
    deleteCardBtn.className = 'delete-model-btn';
    deleteCardBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteCardBtn.onclick = (e) => {
      e.stopPropagation();
      showDeleteModal(
        `Delete "${builder}"?`,
        `This will delete ${builder} and all ${database[builder].models.length} models.`,
        () => deleteBuilder(builder)
      );
    };
    
    card.innerHTML = `<h3>${builder}</h3>`;
    card.appendChild(deleteCardBtn);
    grid.appendChild(card);
  });
}

function addNewBuilder(name) {
  if (!name.trim()) {
    alert('Builder name is required');
    return;
  }
  
  if (database[name]) {
    alert(`Builder "${name}" already exists`);
    return;
  }
  
  database[name] = {
    models: [],
    specs: {}
  };
  
  saveDatabase();
  populateBuilders();
  showSaveIndicator(`Builder "${name}" added`);
}

function deleteBuilder(builderName) {
  if (!confirm(`Are you sure you want to delete "${builderName}" and all its models?`)) {
    return;
  }
  
  delete database[builderName];
  saveDatabase();
  showBuilders();
  showSaveIndicator(`Builder "${builderName}" deleted`);
}

// Model Management
function populateModels(builder) {
  const grid = document.getElementById('models-grid');
  grid.innerHTML = '';

  const models = database[builder].models || [];
  
  models.forEach(model => {
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => showDetail(builder, model);

    const specs = database[builder].specs[model] || { image: '' };
    const imgHtml = specs.image ? `<img src="${specs.image}" alt="${model}">` : '';

    card.innerHTML = `${imgHtml}<h3>${model}</h3>`;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-model-btn';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      showDeleteModal(
        `Delete "${model}"?`,
        `This will delete the ${model} model and all its specifications.`,
        () => deleteModel(builder, model)
      );
    };
    
    card.appendChild(deleteBtn);
    grid.appendChild(card);
  });
}

function addNewModel(builder, modelName, imagePath) {
  if (!modelName.trim()) {
    alert('Model name is required');
    return;
  }
  
  if (!database[builder].models.includes(modelName)) {
    database[builder].models.push(modelName);
    database[builder].models.sort();
    
    if (!database[builder].specs[modelName]) {
      database[builder].specs[modelName] = {
        image: imagePath || '',
        data: {}
      };
    }
    
    saveDatabase();
    populateModels(builder);
    showSaveIndicator(`Model "${modelName}" added`);
  } else {
    alert(`Model "${modelName}" already exists`);
  }
}

function deleteModel(builder, modelName) {
  if (!confirm(`Are you sure you want to delete model "${modelName}"?`)) {
    return;
  }
  
  // Remove from models array
  const index = database[builder].models.indexOf(modelName);
  if (index > -1) {
    database[builder].models.splice(index, 1);
  }
  
  // Remove from specs
  delete database[builder].specs[modelName];
  
  saveDatabase();
  showModels(builder);
  showSaveIndicator(`Model "${modelName}" deleted`);
}

// Specification Management
function renderSpecsTable(builder, model, specs) {
  const table = document.getElementById('specs-table');
  table.innerHTML = '<tr><th>Category</th><th>Value / Link</th><th>Actions</th></tr>';
  
  if (!specs.data || Object.keys(specs.data).length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="3" style="text-align: center; padding: 40px; color: #999;">No specifications yet. Add some!</td>';
    table.appendChild(tr);
    return;
  }
  
  Object.keys(specs.data).forEach(key => {
    addSpecRow(table, builder, model, key, specs.data[key]);
  });
}

function addSpecRow(table, builder, model, key, value) {
  const tr = document.createElement('tr');
  tr.className = 'spec-row';
  
  // Category cell
  const categoryCell = document.createElement('td');
  const categoryInput = document.createElement('input');
  categoryInput.type = 'text';
  categoryInput.value = key;
  categoryInput.className = 'category-input';
  categoryInput.placeholder = 'Enter category name...';
  
  // Clear placeholder text when user starts typing
  categoryInput.addEventListener('focus', function() {
    if (this.value === 'New Specification' || this.value.startsWith('New Specification ')) {
      this.value = '';
    }
  });
  
  // Save on change
  categoryInput.addEventListener('change', () => {
    if (!categoryInput.value.trim()) {
      alert('Category name cannot be empty');
      categoryInput.value = key;
      return;
    }
    updateSpecKey(builder, model, key, categoryInput.value);
  });
  
  // Save on Enter key
  categoryInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      categoryInput.blur(); // Triggers change event
    }
  });
  
  categoryCell.appendChild(categoryInput);
  
  // Value cell
  const valueCell = document.createElement('td');
  const valueInput = document.createElement('textarea');
  valueInput.value = value;
  valueInput.className = 'value-input';
  valueInput.rows = 2;
  valueInput.placeholder = 'Enter value or paste link...';
  
  // Clear placeholder text when user starts typing
  valueInput.addEventListener('focus', function() {
    if (this.value === 'Enter value here...') {
      this.value = '';
    }
  });
  
  valueInput.addEventListener('change', () => {
    updateSpecValue(builder, model, key, valueInput.value);
  });
  
  // Auto-save on blur (when user clicks away)
  valueInput.addEventListener('blur', () => {
    updateSpecValue(builder, model, key, valueInput.value);
  });
  
  valueCell.appendChild(valueInput);
  
  // Actions cell
  const actionsCell = document.createElement('td');
  const deleteBtn = document.createElement('button');
  deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
  deleteBtn.className = 'table-action-btn delete-row-btn';
  deleteBtn.title = 'Delete this specification';
  deleteBtn.onclick = () => deleteSpec(builder, model, key);
  
  actionsCell.appendChild(deleteBtn);
  
  tr.appendChild(categoryCell);
  tr.appendChild(valueCell);
  tr.appendChild(actionsCell);
  table.appendChild(tr);
}

function updateSpecKey(builder, model, oldKey, newKey) {
  if (!newKey.trim()) {
    alert('Category name cannot be empty');
    return;
  }
  
  const specs = database[builder].specs[model];
  if (!specs.data) specs.data = {};
  
  if (newKey !== oldKey && specs.data[newKey]) {
    alert('A category with this name already exists');
    return;
  }
  
  specs.data[newKey] = specs.data[oldKey];
  if (newKey !== oldKey) {
    delete specs.data[oldKey];
  }
  
  saveDatabase();
  renderSpecsTable(builder, model, specs);
}

function updateSpecValue(builder, model, key, value) {
  const specs = database[builder].specs[model];
  if (!specs.data) specs.data = {};
  specs.data[key] = value;
  saveDatabase();
}

function deleteSpec(builder, model, key) {
  if (confirm(`Delete specification "${key}"?`)) {
    const specs = database[builder].specs[model];
    if (specs.data && specs.data[key]) {
      delete specs.data[key];
      saveDatabase();
      renderSpecsTable(builder, model, specs);
    }
  }
}

function addNewSpecification(builder, model) {
  const specs = database[builder].specs[model];
  if (!specs.data) specs.data = {};
  
  // Create a unique temporary key
  let newKey = '';
  let counter = 1;
  const baseKey = 'New Specification';
  
  // Find a unique name
  do {
    newKey = counter === 1 ? baseKey : `${baseKey} ${counter}`;
    counter++;
  } while (specs.data[newKey]);
  
  // Add with empty values
  specs.data[newKey] = '';
  saveDatabase();
  renderSpecsTable(builder, model, specs);
  
  // Focus on the new row's category input and select all text
  setTimeout(() => {
    const lastRow = document.querySelector('.spec-row:last-child');
    if (lastRow) {
      const categoryInput = lastRow.querySelector('.category-input');
      if (categoryInput) {
        categoryInput.focus();
        categoryInput.select();
      }
    }
  }, 50);
}

// Button Setup Functions
function setupImageUpload(builder, model, img, specs) {
  const uploadBtn = document.getElementById('upload-btn');
  const fileInput = document.getElementById('image-upload');
  
  uploadBtn.onclick = () => fileInput.click();
  fileInput.onchange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result;
        img.src = base64;
        specs.image = base64;
        saveDatabase();
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };
}

function setupResetPhotoButton(builder, model, img, specs) {
  const resetBtn = document.getElementById('reset-photo-btn');
  resetBtn.onclick = () => {
    if (confirm('Reset photo to default image?')) {
      const defaultPath = getDefaultImagePath(builder, model);
      delete specs.image;
      img.src = defaultPath || '';
      saveDatabase();
    }
  };
}

function setupResetDataButton(builder, model) {
  const resetBtn = document.getElementById('reset-data-btn');
  resetBtn.onclick = () => {
    if (confirm('Reset all specifications to default values?')) {
      database[builder].specs[model].data = {};
      saveDatabase();
      renderSpecsTable(builder, model, database[builder].specs[model]);
    }
  };
}

function setupDeleteModelButton(builder, model) {
  const deleteBtn = document.getElementById('delete-model-btn');
  deleteBtn.onclick = () => {
    showDeleteModal(
      `Delete "${model}"?`,
      `This will permanently delete the ${model} model and all its data.`,
      () => deleteModel(builder, model)
    );
  };
}


function setupAddSpecButton(builder, model) {
  const addBtn = document.getElementById('add-spec-btn');
  addBtn.onclick = () => addNewSpecification(builder, model);
  
  // Optional: Add bulk specs button
  const bulkBtn = document.getElementById('add-bulk-specs-btn');
  if (bulkBtn) {
    bulkBtn.onclick = () => showBulkAddModal(builder, model);
  }
}

function showBulkAddModal(builder, model) {
  // Create a simple modal for bulk adding
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>Add Multiple Specifications</h3>
      <button class="modal-close">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Enter specifications (one per line, format: Category|Value)</label>
        <textarea id="bulk-specs-input" rows="10" placeholder="Machine Type|5-Axis VMC&#10;Spindle Speed|12,000 RPM&#10;Control System|Mazatrol SmoothX" style="width: 100%; font-family: monospace;"></textarea>
        <p style="font-size: 0.9em; color: #666; margin-top: 5px;">
          Example: <code>Category Name|Value goes here</code>
        </p>
      </div>
    </div>
    <div class="modal-footer">
      <button class="cancel-btn">Cancel</button>
      <button class="save-btn">Add Specifications</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.getElementById('modal-overlay').style.display = 'block';
  modal.style.display = 'block';
  
  // Setup events
  modal.querySelector('.modal-close').onclick = () => {
    document.getElementById('modal-overlay').style.display = 'none';
    modal.remove();
  };
  
  modal.querySelector('.cancel-btn').onclick = () => {
    document.getElementById('modal-overlay').style.display = 'none';
    modal.remove();
  };
  
  modal.querySelector('.save-btn').onclick = () => {
    const input = modal.querySelector('#bulk-specs-input');
    const lines = input.value.split('\n').filter(line => line.trim());
    
    let addedCount = 0;
    lines.forEach(line => {
      const parts = line.split('|').map(part => part.trim());
      if (parts.length >= 2) {
        const key = parts[0];
        const value = parts.slice(1).join('|'); // In case value contains |
        
        const specs = database[builder].specs[model];
        if (!specs.data) specs.data = {};
        
        // Only add if not already exists
        if (!specs.data[key]) {
          specs.data[key] = value;
          addedCount++;
        }
      }
    });
    
    if (addedCount > 0) {
      saveDatabase();
      renderSpecsTable(builder, model, database[builder].specs[model]);
      showSaveIndicator(`Added ${addedCount} specification(s)`);
    } else {
      alert('No valid specifications were added. Check your format.');
    }
    
    document.getElementById('modal-overlay').style.display = 'none';
    modal.remove();
  };
}




// Modal Functions
function setupModalEvents() {
  // Add Builder Modal
  document.getElementById('add-builder-btn').onclick = () => {
    document.getElementById('builder-name').value = '';
    showModal('add-builder-modal');
  };
  
  document.querySelector('#add-builder-modal .save-btn').onclick = () => {
    const name = document.getElementById('builder-name').value.trim();
    addNewBuilder(name);
    hideModal('add-builder-modal');
  };
  
  // Add Model Modal
  document.getElementById('add-model-btn').onclick = () => {
    document.getElementById('model-name').value = '';
    document.getElementById('default-image').value = 'images/';
    showModal('add-model-modal');
  };
  
  document.querySelector('#add-model-modal .save-btn').onclick = () => {
    const name = document.getElementById('model-name').value.trim();
    const image = document.getElementById('default-image').value.trim();
    addNewModel(currentBuilder, name, image);
    hideModal('add-model-modal');
  };
  
  // Close buttons
  document.querySelectorAll('.modal-close, .cancel-btn').forEach(btn => {
    btn.onclick = (e) => {
      const modal = e.target.closest('.modal');
      hideModal(modal.id);
    };
  });
  
  // Overlay click
  document.getElementById('modal-overlay').onclick = () => {
    hideAllModals();
  };
}

function showModal(modalId) {
  document.getElementById('modal-overlay').style.display = 'block';
  document.getElementById(modalId).style.display = 'block';
}

function hideModal(modalId) {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById(modalId).style.display = 'none';
}

function hideAllModals() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
}

function showDeleteModal(title, message, callback) {
  document.getElementById('delete-title').textContent = title;
  document.getElementById('delete-message').textContent = message;
  deleteCallback = callback;
  
  const deleteBtn = document.querySelector('#delete-modal .delete-confirm-btn');
  deleteBtn.onclick = () => {
    if (deleteCallback) deleteCallback();
    hideModal('delete-modal');
  };
  
  showModal('delete-modal');
}

// Save Indicator
function showSaveIndicator(message) {
  const indicator = document.getElementById('save-indicator');
  indicator.innerHTML = `<i class="fas fa-check"></i> ${message}`;
  indicator.classList.add('show');
  
  setTimeout(() => {
    indicator.classList.remove('show');
  }, 3000);
}

// Back buttons
document.getElementById('back-to-builders').onclick = (e) => { 
  e.preventDefault(); 
  showBuilders(); 
};

document.getElementById('back-to-models').onclick = (e) => { 
  e.preventDefault(); 
  showModels(currentBuilder); 
};

// Mobile menu
document.getElementById('mobile-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

document.getElementById('toggle-btn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
});

function initializeUI() {
  populateBuilders();
  showBuilders();
  setupModalEvents();
}


// Add keyboard shortcuts for the detail page
document.addEventListener('keydown', function(e) {
  // Only on detail page
  if (document.getElementById('detail-page').style.display !== 'block') return;
  
  // Ctrl/Cmd + N to add new spec
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    addNewSpecification(currentBuilder, currentModel);
  }
  
  // Esc to cancel editing (if focused on input)
  if (e.key === 'Escape') {
    const activeElement = document.activeElement;
    if (activeElement.classList.contains('category-input') || 
        activeElement.classList.contains('value-input')) {
      activeElement.blur();
    }
  }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', loadDatabase);
