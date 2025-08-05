console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { calculateArcCenter, validateIJArc, calculateArcBounds } from './arcGeometry.js';
import { logError } from './errorHandler.js';

/**
 * Builds G-code paths and updates state
 * @module pathBuilder
 */

/**
 * Creates a path object from state and token data
 * @param {Object} state - Current machine state
 * @param {Object} tokenData - Parsed token data
 * @param {number} index - Line index
 * @returns {Object} Path object
 */
export function createPath(state, tokenData, index) {
  const { x, y, z, a, b, c, e, u, v, w, i, j, r, gCode, mCode, f, s, hasZ, hasA, hasB, hasC, hasE, hasU, hasV, hasW, hasR, hasIJ, hasF, hasS } = tokenData;
  const path = {
    startX: state.currentX, startY: state.currentY, startZ: state.currentZ,
    startA: state.currentA, startB: state.currentB, startC: state.currentC,
    startE: state.currentE, startU: state.currentU, startV: state.currentV, startW: state.currentW,
    endX: x ?? state.currentX, endY: y ?? state.currentY, endZ: z ?? state.currentZ,
    endA: a ?? state.currentA, endB: b ?? state.currentB, endC: c ?? state.currentC,
    endE: e ?? state.currentE, endU: u ?? state.currentU, endV: v ?? state.currentV, endW: w ?? state.currentW,
    i, j, r, mode: gCode || mCode || state.currentMode,
    gCodes: { ...state.activeGCodes }, mCodes: { ...state.activeMCodes },
    f: hasF ? f : (typeof state.currentF === 'number' ? state.currentF : 0),
    s: hasS ? s : (typeof state.currentS === 'number' ? state.currentS : 0),
    lineNumber: index, isValid: tokenData.isValid
  };

  console.debug(`Creating path at line ${index + 1}: f=${path.f}, s=${path.s}, state.currentF=${state.currentF}, state.currentS=${state.currentS}, hasF=${hasF}, hasS=${hasS}, mode=${path.mode}`);

  if (hasZ || hasA || hasB || hasC || hasE || hasU || hasV || hasW) {
    const axes = [];
    if (hasZ) axes.push(`Z=${z}`);
    if (hasA) axes.push(`A=${a}`);
    if (hasB) axes.push(`B=${b}`);
    if (hasC) axes.push(`C=${c}`);
    if (hasE) axes.push(`E=${e}`);
    if (hasU) axes.push(`U=${u}`);
    if (hasV) axes.push(`V=${v}`);
    if (hasW) axes.push(`W=${w}`);
    logError(`Unsupported axis movement at line ${index + 1}: ${axes.join(', ')}`, `unsupported-axes-${index}`);
    path.isValid = false;
  }

  if ((gCode === 'G02' || gCode === 'G03') && path.isValid) {
    let centerX, centerY, radius, isMajor = false;
    if (hasR) {
      radius = Math.abs(r);
      isMajor = r < 0;
      const center = calculateArcCenter(state.currentX, state.currentY, path.endX, path.endY, r, gCode);
      if (!center) {
        path.isValid = false;
        logError(`Invalid arc at line ${index + 1}: Unable to calculate center`, `arc-center-${index}`);
      } else {
        [centerX, centerY] = center;
      }
    } else if (hasIJ) {
      centerX = state.currentX + i;
      centerY = state.currentY + j;
      radius = Math.sqrt(i * i + j * j);
      if (!validateIJArc(state.currentX, state.currentY, path.endX, path.endY, i, j) &&
          !(Math.abs(state.currentX - path.endX) < 0.001 && Math.abs(state.currentY - path.endY) < 0.001 && radius >= 0.001)) {
        path.isValid = false;
        logError(`Invalid arc at line ${index + 1}: Invalid I/J parameters (I=${i}, J=${j}) from (${state.currentX.toFixed(2)}, ${state.currentY.toFixed(2)}) to (${path.endX.toFixed(2)}, ${path.endY.toFixed(2)})`, `arc_ij-${index}`);
      }
    }
    if (path.isValid) {
      const bounds = calculateArcBounds(state.currentX, state.currentY, path.endX, path.endY, centerX, centerY, radius, gCode, isMajor);
      state.minX = Math.min(state.minX, bounds.minX);
      state.maxX = Math.max(state.maxX, bounds.maxX);
      state.minY = Math.min(state.minY, bounds.minY);
      state.maxY = Math.max(state.maxY, bounds.maxY);
    }
  } else if ((gCode === 'G00' || gCode === 'G01') && path.isValid) {
    state.minX = Math.min(state.minX, path.endX);
    state.maxX = Math.max(state.maxX, path.endX);
    state.minY = Math.min(state.minY, path.endY);
    state.maxY = Math.max(state.maxY, path.endY);
  }

  return path;
}

/**
 * Updates machine state with new coordinates
 * @param {Object} state - Current machine state
 * @param {Object} tokenData - Parsed token data
 * @param {string} gCode - Active G-code
 * @returns {Object} Updated state
 */
export function updateState(state, tokenData, gCode) {
  const updatedState = {
    ...state,
    currentX: state.currentX ?? 0,
    currentY: state.currentY ?? 0,
    currentZ: state.currentZ ?? 0,
    currentA: state.currentA ?? 0,
    currentB: state.currentB ?? 0,
    currentC: state.currentC ?? 0,
    currentE: state.currentE ?? 0,
    currentU: state.currentU ?? 0,
    currentV: state.currentV ?? 0,
    currentW: state.currentW ?? 0,
    currentF: typeof state.currentF === 'number' ? state.currentF : 0,
    currentS: typeof state.currentS === 'number' ? state.currentS : 0
  };

  const newState = {
    ...updatedState,
    currentX: tokenData.x ?? updatedState.currentX,
    currentY: tokenData.y ?? updatedState.currentY,
    currentZ: tokenData.z ?? updatedState.currentZ,
    currentA: tokenData.a ?? updatedState.currentA,
    currentB: tokenData.b ?? updatedState.currentB,
    currentC: tokenData.c ?? updatedState.currentC,
    currentE: tokenData.e ?? updatedState.currentE,
    currentU: tokenData.u ?? updatedState.currentU,
    currentV: tokenData.v ?? updatedState.currentV,
    currentW: tokenData.w ?? updatedState.currentW,
    currentF: tokenData.hasF ? tokenData.f : updatedState.currentF,
    currentS: tokenData.hasS ? tokenData.s : updatedState.currentS
  };

  console.debug(`Updating state at line ${tokenData.lineNumber + 1}: currentF=${newState.currentF}, currentS=${newState.currentS}, hasF=${tokenData.hasF}, hasS=${tokenData.hasS}, gCode=${gCode}`);

  return newState;
}