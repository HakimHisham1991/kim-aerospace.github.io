console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

/**
 * Updates the axis table in the UI
 * @module axisTableUpdater
 */

/**
 * Updates the axis table with current X, Y, Z coordinates
 * @param {number} currentX - Current X coordinate
 * @param {number} currentY - Current Y coordinate
 * @param {number} currentZ - Current Z coordinate
 */
export function updateAxisTable(currentX, currentY, currentZ) {
  document.getElementById('axisX').textContent = currentX.toFixed(3);
  document.getElementById('axisY').textContent = currentY.toFixed(3);
  document.getElementById('axisZ').textContent = currentZ.toFixed(3);
}