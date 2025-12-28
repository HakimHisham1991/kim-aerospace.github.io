let currentData = null;
let isAllExpanded = true;
// Track if we should select all on next focus
const shouldSelectAll = new WeakMap();
let lastFocusedBox = null;

function createBox(text, isKey = false, isArrayItem = false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'box-wrapper';

    const box = document.createElement('div');
    box.className = isKey ? 'key-box' : 'value-box';
    box.contentEditable = true;
    box.textContent = text;

    if (isKey && isArrayItem) {
        box.classList.add('array-item');
    }

    const copyIcon = document.createElement('span');
    copyIcon.className = 'copy-icon';
    copyIcon.textContent = '📋';
    copyIcon.title = 'Copy to clipboard';

    const feedback = document.createElement('div');
    feedback.className = 'copied-feedback';
    feedback.textContent = 'Copied!';
    wrapper.appendChild(feedback);

    copyIcon.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            await navigator.clipboard.writeText(box.textContent.trim());
            feedback.classList.add('show');
            setTimeout(() => feedback.classList.remove('show'), 1500);
        } catch (err) {
            alert('Copy failed');
        }
    };

    // Initial state - should select all on first focus
    shouldSelectAll.set(box, true);

    // Handle box focus
    box.onfocus = (e) => {
        wrapper.classList.add('focused');
        lastFocusedBox = box;
        
        // If we should select all, do it now
        if (shouldSelectAll.get(box)) {
            // Small delay to ensure focus is complete
            setTimeout(() => {
                selectAllText(box);
                // Clear the flag so next focus won't select all
                shouldSelectAll.set(box, false);
            }, 50);
        }
    };
    
    box.onblur = () => {
        wrapper.classList.remove('focused');
        
        // Reset selection when losing focus
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            selection.removeAllRanges();
        }
    };
    
    // Handle click events - for mobile touch
    box.addEventListener('click', (e) => {
        // On mobile, we need to handle selection differently
        if (shouldSelectAll.get(box)) {
            e.preventDefault();
            box.focus();
        }
    });
    
    // Handle touch events for mobile
    box.addEventListener('touchstart', (e) => {
        if (shouldSelectAll.get(box)) {
            // Prevent immediate focus on touch
            e.preventDefault();
            box.focus();
        }
    }, { passive: false });

    // Clear selection when user clicks inside (for normal cursor placement)
    box.addEventListener('mousedown', (e) => {
        // If this is not the first click (shouldSelectAll is false)
        // and there's a selection, clear it for normal cursor placement
        if (!shouldSelectAll.get(box)) {
            const selection = window.getSelection();
            if (selection.toString()) {
                // Allow normal cursor placement
                selection.removeAllRanges();
            }
        }
    });
    
    // Reset selection flag when user clicks outside
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target) && !box.contains(e.target)) {
            // User clicked outside - reset for next focus
            shouldSelectAll.set(box, true);
        }
    });

    wrapper.appendChild(box);
    wrapper.appendChild(copyIcon);

    return { wrapper, box };
}

// Helper function to select all text in an element
function selectAllText(element) {
    // Clear any existing selection first
    const selection = window.getSelection();
    selection.removeAllRanges();
    
    // Create and set new range
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.addRange(range);
    
    // On mobile, we need to make sure the selection is visible
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function createRow(key, value, container, path = [], isArrayParent = false) {
    const row = document.createElement('div');
    row.className = 'row';

    // Expander
    const expander = document.createElement('div');
    expander.className = 'expander';
    const hasChildren = typeof value === 'object' && value !== null &&
                       (Object.keys(value).length > 0 || (Array.isArray(value) && value.length > 0));

    if (hasChildren) {
        expander.textContent = '▼';
        expander.onclick = (e) => {
            e.stopPropagation();
            const childNode = row.nextElementSibling;
            if (childNode && childNode.classList.contains('json-node')) {
                childNode.classList.toggle('collapsed');
                expander.textContent = childNode.classList.contains('collapsed') ? '▶' : '▼';
            }
        };
    } else {
        expander.textContent = '◦';
    }
    row.appendChild(expander);

    // === KEY BOX ===
    // Remove quotes from key boxes - just show the key name
    const keyText = isArrayParent ? '[' + key + ']' : key;
    const { wrapper: keyWrapper, box: keyBox } = createBox(keyText, true, isArrayParent);

    keyBox.onblur = () => {
        let newKey = keyBox.textContent.trim();
        if (isArrayParent) {
            newKey = parseInt(newKey.replace(/[^\d]/g, ''), 10);
            if (isNaN(newKey)) newKey = key;
        }
        // No need to remove quotes anymore since they're not shown
        if (newKey !== key && newKey !== '' && newKey != null) {
            const parent = getValueByPath(currentData, path.slice(0, -1));
            if (parent) {
                parent[newKey] = parent[key];
                delete parent[key];
                loadJSON();
            }
        }
        // Reset selection flag after editing
        shouldSelectAll.set(keyBox, true);
    };
    keyBox.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            keyBox.blur();
        }
    };
    row.appendChild(keyWrapper);

    // === VALUE BOX ===
    let valueText, valueColor = '', editable = true;

    if (value === null) {
        valueText = 'null';
        valueColor = '#808080';
    } else if (typeof value === 'string') {
        // Keep quotes for string values
        valueText = '"' + value + '"';
        valueColor = '#008000';
    } else if (typeof value === 'number') {
        valueText = value;
        valueColor = '#0000ff';
    } else if (typeof value === 'boolean') {
        valueText = value.toString();
        valueColor = '#b85c00';
    } else {
        valueText = Array.isArray(value) ? '[Array]' : '{Object}';
        valueColor = '#666';
        editable = false;
    }

    const { wrapper: valueWrapper, box: valueBox } = createBox(valueText, false);
    valueBox.style.color = valueColor;
    if (!editable) valueBox.contentEditable = false;

    valueBox.onblur = () => {
        if (!editable) return;
        let input = valueBox.textContent.trim();
        let newVal;
        
        // Handle string values with or without quotes
        if (input.startsWith('"') && input.endsWith('"')) {
            // Remove surrounding quotes
            newVal = input.slice(1, -1);
        } else if (input === 'null') {
            newVal = null;
        } else if (input === 'true') {
            newVal = true;
        } else if (input === 'false') {
            newVal = false;
        } else if (!isNaN(input) && input !== '') {
            newVal = Number(input);
        } else {
            // Treat as string without quotes
            newVal = input;
        }

        const parent = getValueByPath(currentData, path.slice(0, -1));
        if (parent !== undefined) {
            parent[key] = newVal;
        }
        // Reset selection flag after editing
        shouldSelectAll.set(valueBox, true);
    };
    valueBox.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            valueBox.blur();
        }
    };

    row.appendChild(valueWrapper);
    container.appendChild(row);

    // Nested children
    if (hasChildren) {
        const childNode = document.createElement('div');
        childNode.className = 'json-node';

        if (Array.isArray(value)) {
            value.forEach((item, idx) => {
                createRow(idx, item, childNode, [...path, idx], true);
            });
        } else {
            Object.keys(value).forEach(k => {
                createRow(k, value[k], childNode, [...path, k], false);
            });
        }
        container.appendChild(childNode);
    }
}

function getValueByPath(obj, path) {
    return path.reduce((acc, k) => acc && acc[k], obj);
}

function loadJSON() {
    const input = document.getElementById('jsonInput').value.trim();
    try {
        currentData = input ? JSON.parse(input) : {};
        const editor = document.getElementById('editor');
        editor.innerHTML = '';

        if (Array.isArray(currentData)) {
            currentData.forEach((item, idx) => {
                createRow(idx, item, editor, [idx], true);
            });
        } else {
            Object.keys(currentData).forEach(key => {
                createRow(key, currentData[key], editor, [key], false);
            });
        }

        isAllExpanded = true;
        document.getElementById('toggleAllBtn').title = 'Collapse All';
        document.getElementById('toggleAllBtn').querySelector('.icon').textContent = '⏏️';
        
        // Show success notification
        showNotification('JSON loaded successfully!');
    } catch (e) {
        showNotification('Invalid JSON: ' + e.message, 'error');
    }
}

function exportJSON() {
    if (!currentData) {
        showNotification('No data loaded!', 'error');
        return;
    }
    
    const pretty = JSON.stringify(currentData, null, 2);
    document.getElementById('jsonInput').value = pretty;
    
    // Show success notification
    showNotification('JSON copied to textarea!');
}

function toggleAllCollapse() {
    const nodes = document.querySelectorAll('.json-node');
    const expanders = document.querySelectorAll('.expander');

    if (isAllExpanded) {
        nodes.forEach(n => n.classList.add('collapsed'));
        expanders.forEach(e => { if (e.textContent === '▼') e.textContent = '▶'; });
        document.getElementById('toggleAllBtn').title = 'Expand All';
        // Flip the icon upside down
        document.getElementById('toggleAllBtn').querySelector('.icon').style.transform = 'rotate(180deg)';
        showNotification('All sections collapsed');
    } else {
        nodes.forEach(n => n.classList.remove('collapsed'));
        expanders.forEach(e => { if (e.textContent === '▶') e.textContent = '▼'; });
        document.getElementById('toggleAllBtn').title = 'Collapse All';
        // Reset the icon rotation
        document.getElementById('toggleAllBtn').querySelector('.icon').style.transform = 'rotate(0deg)';
        showNotification('All sections expanded');
    }
    isAllExpanded = !isAllExpanded;
}

// Function to show non-intrusive notifications
function showNotification(message, type = 'success') {
    // Remove any existing notification
    const existingNotification = document.querySelector('.global-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `global-notification ${type}`;
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Clear selections when tapping/clicking elsewhere
document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('key-box') && 
        !e.target.classList.contains('value-box') &&
        lastFocusedBox) {
        const selection = window.getSelection();
        if (selection.toString()) {
            selection.removeAllRanges();
        }
    }
});

// Initialize on load
window.addEventListener('DOMContentLoaded', loadJSON);
