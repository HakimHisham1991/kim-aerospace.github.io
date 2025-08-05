console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

import { setupEventListeners } from './js/uiControls.js';
import { clearCanvas } from './js/main.js';

/**
 * Initializes the NC Toolpath Simulator
 * @module index
 */

document.addEventListener('DOMContentLoaded', () => {
  try {
    console.debug('Initializing NC Toolpath Simulator');
    setupEventListeners(clearCanvas);
  } catch (error) {
    console.error('Error initializing application:', error);
    alert('Error initializing application: ' + error.message);
  }
});
