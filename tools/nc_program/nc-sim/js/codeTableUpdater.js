console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { defaultGCodes, defaultMCodes } from './gcodeConfig.js';

/**
 * Updates UI tables for active G-codes and M-codes
 * @module codeTableUpdater
 */

/**
 * Updates the active G-code and M-code tables based on the current path index
 * @param {Array} paths - Parsed G-code paths with state
 * @param {number} pathIndex - Current path index
 * @param {string} [feedMode] - Optional feed mode to override gcodeFeedMode
 * @param {string} [distanceMode] - Optional distance mode to override gcodeDistanceMode
 * @param {string} [coordinateSystem] - Optional coordinate system to override gcodeCoordinateSystem
 * @param {string} [toolOffset] - Optional tool offset to override gcodeToolOffset
 * @param {string} [toolLength] - Optional tool length to override gcodeToolLength
 */
export function updateCodeTables(paths, pathIndex, feedMode = null, distanceMode = null, coordinateSystem = null, toolOffset = null, toolLength = null) {
  // Use defaultGCodes if pathIndex is invalid or out of bounds (e.g., after M30)
  let activeGCodes = { ...defaultGCodes };
  let activeMCodes = { ...defaultMCodes };
  
  if (paths.length > 0 && pathIndex >= 0 && pathIndex < paths.length) {
    activeGCodes = { ...paths[pathIndex].gCodes };
    activeMCodes = { ...paths[pathIndex].mCodes };
    // Override feedMode if provided
    if (feedMode && ['G93', 'G94', 'G95'].includes(feedMode)) {
      activeGCodes.feedMode = feedMode;
      console.debug(`Overriding feedMode to ${feedMode} at pathIndex ${pathIndex}`);
    }
    // Override distanceMode if provided
    if (distanceMode && ['G90', 'G91'].includes(distanceMode)) {
      activeGCodes.distanceMode = distanceMode;
      console.debug(`Overriding distanceMode to ${distanceMode} at pathIndex ${pathIndex}`);
    }
    // Override coordinateSystem if provided
    if (coordinateSystem && ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'].includes(coordinateSystem)) {
      activeGCodes.coordinateSystem = coordinateSystem;
      console.debug(`Overriding coordinateSystem to ${coordinateSystem} at pathIndex ${pathIndex}`);
    }
    // Override toolOffset if provided
    if (toolOffset && ['G40', 'G41', 'G42'].includes(toolOffset)) {
      activeGCodes.toolOffset = toolOffset;
      console.debug(`Overriding toolOffset to ${toolOffset} at pathIndex ${pathIndex}`);
    }
    // Override toolLength if provided
    if (toolLength && ['G43', 'G44', 'G49'].includes(toolLength)) {
      activeGCodes.toolLength = toolLength;
      console.debug(`Overriding toolLength to ${toolLength} at pathIndex ${pathIndex}`);
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
  }

  const gcodeIds = [
    'gcodeMotion', 'gcodePlane', 'gcodeUnits', 'gcodeDistanceMode',
    'gcodeFeedMode', 'gcodeCoordinateSystem', 'gcodeToolOffset', 'gcodeToolLength'
  ];
  const mcodeIds = ['mcodeSpindle', 'mcodeCoolant'];

  gcodeIds.forEach(id => {
    const element = document.getElementById(id);
    const key = id === 'gcodeFeedMode' ? 'feedMode' : 
                id === 'gcodeDistanceMode' ? 'distanceMode' : 
                id === 'gcodeCoordinateSystem' ? 'coordinateSystem' : 
                id === 'gcodeToolOffset' ? 'toolOffset' : 
                id === 'gcodeToolLength' ? 'toolLength' : 
                id.replace(/^gcode/, '').toLowerCase();
    if (element) {
      let value = activeGCodes[key];
      if (value === undefined) {
        if (id === 'gcodeFeedMode') {
          value = defaultGCodes.feedMode || 'G94'; // Fallback to defaultGCodes.feedMode or G94
          console.debug(`No value found for G-code key '${key}' in activeGCodes, using fallback '${value}' at pathIndex ${pathIndex}`);
        } else if (id === 'gcodeDistanceMode') {
          value = defaultGCodes.distanceMode || 'G90'; // Fallback to defaultGCodes.distanceMode or G90
          console.debug(`No value found for G-code key '${key}' in activeGCodes, using fallback '${value}' at pathIndex ${pathIndex}`);
        } else if (id === 'gcodeCoordinateSystem') {
          value = defaultGCodes.coordinateSystem || 'G54'; // Fallback to defaultGCodes.coordinateSystem or G54
          console.debug(`No value found for G-code key '${key}' in activeGCodes, using fallback '${value}' at pathIndex ${pathIndex}`);
        } else if (id === 'gcodeToolOffset') {
          value = defaultGCodes.toolOffset || 'G40'; // Fallback to defaultGCodes.toolOffset or G40
          console.debug(`No value found for G-code key '${key}' in activeGCodes, using fallback '${value}' at pathIndex ${pathIndex}`);
        } else if (id === 'gcodeToolLength') {
          value = defaultGCodes.toolLength || 'G49'; // Fallback to defaultGCodes.toolLength or G49
          console.debug(`No value found for G-code key '${key}' in activeGCodes, using fallback '${value}' at pathIndex ${pathIndex}`);
        } else {
          console.warn(`No value found for G-code key '${key}' in activeGCodes:`, activeGCodes);
          value = defaultGCodes[key] || '';
        }
      }
      element.textContent = value;
      if (id === 'gcodeFeedMode' || id === 'gcodeDistanceMode' || id === 'gcodeCoordinateSystem' || id === 'gcodeToolOffset' || id === 'gcodeToolLength') {
        console.debug(`Updated ${id} to ${value} at pathIndex ${pathIndex} with key '${key}'`);
      }
    } else {
      console.warn(`DOM element with ID ${id} not found`);
    }
  });

  mcodeIds.forEach(id => {
    const element = document.getElementById(id);
    const key = id.replace(/^mcode/, '').toLowerCase();
    if (element) {
      const value = activeMCodes[key];
      if (value === undefined) {
        console.warn(`No value found for M-code key '${key}' in activeMCodes:`, activeMCodes);
        element.textContent = defaultMCodes[key] || '';
      } else {
        element.textContent = value;
      }
    } else {
      console.warn(`DOM element with ID ${id} not found`);
    }
  });
}