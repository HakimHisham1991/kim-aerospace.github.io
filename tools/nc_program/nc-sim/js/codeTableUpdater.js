console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { defaultGCodes, defaultMCodes } from './gcodeConfig.js';

/**
 * Updates UI tables for active G-codes, M-codes, and feed/speed parameters
 * @module codeTableUpdater
 */

/**
 * Updates the active G-code, M-code, and feed/speed tables based on the current path index
 * @param {Array} paths - Parsed G-code paths with state
 * @param {number} pathIndex - Current path index
 * @param {string} [feedMode] - Optional feed mode to override gcodeFeedMode
 * @param {string} [distanceMode] - Optional distance mode to override gcodeDistanceMode
 * @param {string} [coordinateSystem] - Optional coordinate system to override gcodeCoordinateSystem
 * @param {string} [toolOffset] - Optional tool offset to override gcodeToolOffset
 * @param {string} [toolLength] - Optional tool length to override gcodeToolLength
 * @param {string} [retractPlane] - Optional retract plane to override gcodeRetractPlane
 * @param {string} [rotation] - Optional rotation mode to override gcodeRotation
 * @param {string} [holeCycle] - Optional hole cycle to override gcodeHoleCycle
 */
export function updateCodeTables(paths, pathIndex, feedMode = null, distanceMode = null, coordinateSystem = null, toolOffset = null, toolLength = null, retractPlane = null, rotation = null, holeCycle = null) {
  let activeGCodes = { ...defaultGCodes };
  let activeMCodes = { ...defaultMCodes, stop: null, subprogram: null, toolChange: null }; // Ensure toolChange is null by default
  
  if (paths.length > 0 && pathIndex >= 0 && pathIndex < paths.length) {
    activeGCodes = { ...paths[pathIndex].gCodes };
    activeMCodes = { ...paths[pathIndex].mCodes }; // Use mCodes directly, including toolChange
    console.debug(`Path ${pathIndex} mCodes:`, paths[pathIndex].mCodes, `mCode: ${paths[pathIndex].mCode}`);
    if (feedMode && ['G93', 'G94', 'G95'].includes(feedMode)) {
      activeGCodes.feedMode = feedMode;
      console.debug(`Overriding feedMode to ${feedMode} at pathIndex ${pathIndex}`);
    }
    if (distanceMode && ['G90', 'G91'].includes(distanceMode)) {
      activeGCodes.distanceMode = distanceMode;
      console.debug(`Overriding distanceMode to ${distanceMode} at pathIndex ${pathIndex}`);
    }
    if (coordinateSystem && ['G53','G54', 'G55', 'G56', 'G57', 'G58', 'G59'].includes(coordinateSystem)) {
      activeGCodes.coordinateSystem = coordinateSystem;
      console.debug(`Overriding coordinateSystem to ${coordinateSystem} at pathIndex ${pathIndex}`);
    }
    if (toolOffset && ['G40', 'G41', 'G42'].includes(toolOffset)) {
      activeGCodes.toolOffset = toolOffset;
      console.debug(`Overriding toolOffset to ${toolOffset} at pathIndex ${pathIndex}`);
    }
    if (toolLength && ['G43', 'G44', 'G49'].includes(toolLength)) {
      activeGCodes.toolLength = toolLength;
      console.debug(`Overriding toolLength to ${toolLength} at pathIndex ${pathIndex}`);
    }
    if (retractPlane && ['G98', 'G99'].includes(retractPlane)) {
      activeGCodes.retractPlane = retractPlane;
      console.debug(`Overriding retractPlane to ${retractPlane} at pathIndex ${pathIndex}`);
    }
    if (rotation && ['G68', 'G69'].includes(rotation)) {
      activeGCodes.rotation = rotation;
      console.debug(`Overriding rotation to ${rotation} at pathIndex ${pathIndex}`);
    }
    if (holeCycle && ['G80', 'G81', 'G82', 'G83', 'G84', 'G85', 'G86', 'G87', 'G88', 'G89', 'G73', 'G74', 'G76'].includes(holeCycle)) {
      activeGCodes.holeCycle = holeCycle;
      console.debug(`Overriding holeCycle to ${holeCycle} at pathIndex ${pathIndex}`);
    }
  } else {
    console.debug(`Using defaultGCodes at pathIndex ${pathIndex} (out of bounds or empty paths):`, activeGCodes);
    if (feedMode && ['G93', 'G94', 'G95'].includes(feedMode)) {
      activeGCodes.feedMode = feedMode;
      console.debug(`Setting feedMode to ${feedMode} for out-of-bounds or empty paths`);
    }
    if (distanceMode && ['G90', 'G91'].includes(distanceMode)) {
      activeGCodes.distanceMode = distanceMode;
      console.debug(`Setting distanceMode to ${distanceMode} for out-of-bounds or empty paths`);
    }
    if (coordinateSystem && ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'].includes(coordinateSystem)) {
      activeGCodes.coordinateSystem = coordinateSystem;
      console.debug(`Setting coordinateSystem to ${coordinateSystem} for out-of-bounds or empty paths`);
    }
    if (toolOffset && ['G40', 'G41', 'G42'].includes(toolOffset)) {
      activeGCodes.toolOffset = toolOffset;
      console.debug(`Setting toolOffset to ${toolOffset} for out-of-bounds or empty paths`);
    }
    if (toolLength && ['G43', 'G44', 'G49'].includes(toolLength)) {
      activeGCodes.toolLength = toolLength;
      console.debug(`Setting toolLength to ${toolLength} for out-of-bounds or empty paths`);
    }
    if (retractPlane && ['G98', 'G99'].includes(retractPlane)) {
      activeGCodes.retractPlane = retractPlane;
      console.debug(`Setting retractPlane to ${retractPlane} for out-of-bounds or empty paths`);
    }
    if (rotation && ['G68', 'G69'].includes(rotation)) {
      activeGCodes.rotation = rotation;
      console.debug(`Setting rotation to ${rotation} for out-of-bounds or empty paths`);
    }
    if (holeCycle && ['G80', 'G81', 'G82', 'G83', 'G84', 'G85', 'G86', 'G87', 'G88', 'G89', 'G73', 'G74', 'G76'].includes(holeCycle)) {
      activeGCodes.holeCycle = holeCycle;
      console.debug(`Setting holeCycle to ${holeCycle} for out-of-bounds or empty paths`);
    }
  }

  // Update G-code table
  const gcodeTable = document.getElementById('gcodeTable');
  if (gcodeTable) {
    const gcodeMapping = {
      'gcodeMotion': 'motion',
      'gcodePlane': 'plane',
      'gcodeUnits': 'units',
      'gcodeDistanceMode': 'distanceMode',
      'gcodeFeedMode': 'feedMode',
      'gcodeCoordinateSystem': 'coordinateSystem',
      'gcodeToolOffset': 'toolOffset',
      'gcodeToolLength': 'toolLength',
      'gcodeRetractPlane': 'retractPlane',
      'gcodeRotation': 'rotation',
      'gcodeHoleCycle': 'holeCycle'
    };

    Object.entries(gcodeMapping).forEach(([id, key]) => {
      const element = document.getElementById(id);
      if (element) {
        let value = activeGCodes[key];
        if (!value) {
          if (id === 'gcodeMotion') {
            value = defaultGCodes.motion || 'G00';
            console.debug(`No value found for G-code key '${key}' in activeGCodes, using fallback '${value}' at pathIndex ${pathIndex}`);
          } else if (id === 'gcodePlane') {
            value = defaultGCodes.plane || 'G17';
            console.debug(`No value found for G-code key '${key}' in activeGCodes, using fallback '${value}' at pathIndex ${pathIndex}`);
          } else if (id === 'gcodeUnits') {
            value = defaultGCodes.units || 'G21';
            console.debug(`No value found for G-code key '${key}' in activeGCodes, using fallback '${value}' at pathIndex ${pathIndex}`);
          } else if (id === 'gcodeDistanceMode') {
            value = defaultGCodes.distanceMode || 'G90';
            console.debug(`No value found for G-code key '${key}' in activeGCodes, using fallback '${value}' at pathIndex ${pathIndex}`);
          } else if (id === 'gcodeFeedMode') {
            value = defaultGCodes.feedMode || 'G94';
            console.debug(`No value found for G-code key '${key}' in activeGCodes, using fallback '${value}' at pathIndex ${pathIndex}`);
          } else if (id === 'gcodeCoordinateSystem') {
            value = defaultGCodes.coordinateSystem || 'G54';
            console.debug(`No value found for G-code key '${key}' in activeGCodes, using fallback '${value}' at pathIndex ${pathIndex}`);
          } else if (id === 'gcodeToolOffset') {
            value = defaultGCodes.toolOffset || 'G40';
            console.debug(`No value found for G-code key '${key}' in activeGCodes, using fallback '${value}' at pathIndex ${pathIndex}`);
          } else if (id === 'gcodeToolLength') {
            value = defaultGCodes.toolLength || 'G49';
            console.debug(`No value found for G-code key '${key}' in activeGCodes, using fallback '${value}' at pathIndex ${pathIndex}`);
          } else if (id === 'gcodeRetractPlane') {
            value = defaultGCodes.retractPlane || 'G98';
            console.debug(`No value found for G-code key '${key}' in activeGCodes, using fallback '${value}' at pathIndex ${pathIndex}`);
          } else if (id === 'gcodeRotation') {
            value = defaultGCodes.rotation || 'G69';
            console.debug(`No value found for G-code key '${key}' in activeGCodes, using fallback '${value}' at pathIndex ${pathIndex}`);
          } else if (id === 'gcodeHoleCycle') {
            value = defaultGCodes.holeCycle || 'G80';
            console.debug(`No value found for G-code key '${key}' in activeGCodes, using fallback '${value}' at pathIndex ${pathIndex}`);
          } else {
            console.warn(`No value found for G-code key '${key}' in activeGCodes:`, activeGCodes);
            value = defaultGCodes[key] || '';
          }
        }
        element.textContent = value;
        if (id === 'gcodeFeedMode' || id === 'gcodeDistanceMode' || id === 'gcodeCoordinateSystem' || id === 'gcodeToolOffset' || id === 'gcodeToolLength' || id === 'gcodeRetractPlane' || id === 'gcodeRotation' || id === 'gcodeHoleCycle') {
          console.debug(`Updated ${id} to ${value} at pathIndex ${pathIndex} with key '${key}'`);
        }
      } else {
        console.warn(`DOM element with ID ${id} not found`);
      }
    });
  }

  // Update M-code table
  updateMcodeTable(activeMCodes, pathIndex);

  // Update feed/speed table
  if (paths.length > 0 && pathIndex >= 0 && pathIndex < paths.length) {
    const feedValue = document.getElementById('feedValue');
    const speedValue = document.getElementById('speedValue');
    const toolValue = document.getElementById('toolValue');
    const feedDisplay = typeof paths[pathIndex].f === 'number' ? paths[pathIndex].f.toFixed(3) : '0.000';
    const speedDisplay = typeof paths[pathIndex].s === 'number' ? paths[pathIndex].s.toFixed(0) : '0';
    const toolDisplay = paths[pathIndex].mCodes.toolNumber || 'T00';
    if (feedValue) {
      feedValue.textContent = feedDisplay;
    } else {
      console.warn('DOM element with ID feedValue not found');
    }
    if (speedValue) {
      speedValue.textContent = speedDisplay;
    } else {
      console.warn('DOM element with ID speedValue not found');
    }
    if (toolValue) {
      toolValue.textContent = toolDisplay;
    } else {
      console.warn('DOM element with ID toolValue not found');
    }
    console.debug(`Updated feed/speed table at pathIndex ${pathIndex}: feed=${feedDisplay}, speed=${speedDisplay}, tool=${toolDisplay}`);
  } else {
    const feedValue = document.getElementById('feedValue');
    const speedValue = document.getElementById('speedValue');
    const toolValue = document.getElementById('toolValue');
    if (feedValue) feedValue.textContent = '0.000';
    if (speedValue) speedValue.textContent = '0';
    if (toolValue) toolValue.textContent = 'T00';
    if (!feedValue || !speedValue || !toolValue) {
      console.warn('DOM elements for feed/speed table not found:', { feedValue: !!feedValue, speedValue: !!speedValue, toolValue: !!toolValue });
    }
    console.debug(`Updated feed/speed table for invalid pathIndex ${pathIndex}: feed=0.000, speed=0, tool=T00`);
  }
}

/**
 * Updates the M-code table based on active M-codes
 * @param {Object} activeMCodes - Active M-codes object
 * @param {number} pathIndex - Current path index
 */
export function updateMcodeTable(activeMCodes, pathIndex) {
  const mcodeTable = document.getElementById('mcodeTable');
  if (!mcodeTable) {
    console.warn('M-code table not found');
    return;
  }

  const rows = mcodeTable.querySelectorAll('tbody tr');
  const availableRows = Array.from(rows).slice(2);
  const usedRows = new Set();

  rows.forEach((row, index) => {
    const groupCell = row.cells[0];
    const codeCell = row.cells[1];
    if (index === 0) {
      groupCell.textContent = 'Spindle';
      codeCell.textContent = activeMCodes.spindle || '';
      codeCell.classList.toggle('active', !!activeMCodes.spindle);
    } else if (index === 1) {
      groupCell.textContent = 'Coolant';
      codeCell.textContent = activeMCodes.coolant || '';
      codeCell.classList.toggle('active', !!activeMCodes.coolant);
    } else {
      groupCell.textContent = '';
      codeCell.textContent = '';
      codeCell.classList.remove('active');
    }
  });

  const assignToEmptyRow = (group, code) => {
    for (let i = 0; i < availableRows.length; i++) {
      const rowIndex = i + 2;
      if (!usedRows.has(rowIndex) && !rows[rowIndex].cells[1].textContent) {
        const groupCell = rows[rowIndex].cells[0];
        const codeCell = rows[rowIndex].cells[1];
        groupCell.textContent = group;
        codeCell.textContent = code || '';
        codeCell.classList.toggle('active', !!code);
        usedRows.add(rowIndex);
        console.debug(`Assigned ${group} code ${code} to row ${rowIndex} (mcode${rowIndex}) at pathIndex ${pathIndex}`);
        return true;
      }
    }
    console.warn(`No empty row available for ${group} code ${code} at pathIndex ${pathIndex}`);
    return false;
  };

  if (activeMCodes.stop) {
    assignToEmptyRow('Stop', activeMCodes.stop);
  }

  if (activeMCodes.subprogram) {
    assignToEmptyRow('Subprogram', activeMCodes.subprogram);
  }

  if (activeMCodes.toolChange) {
    assignToEmptyRow('Tool Change', activeMCodes.toolChange);
    console.debug(`Assigned Tool Change code ${activeMCodes.toolChange} at pathIndex ${pathIndex}`);
  }
}