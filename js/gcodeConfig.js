console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

/**
 * Configuration for valid G-code commands
 * @module gcodeConfig
 */
export const validCodes = new Set([
  'G00', 'G0', 'G01', 'G1', 'G02', 'G2', 'G03', 'G3'
]);
