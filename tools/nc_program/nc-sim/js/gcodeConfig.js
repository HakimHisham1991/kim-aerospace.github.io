console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

/**
 * Configuration for valid G-code and M-code commands and default states
 * @module gcodeConfig
 */

export const defaultGCodes = {
  motion: 'G00',
  plane: 'G17',
  units: 'G21',
  distanceMode: 'G90', // Default to absolute distance mode
  feedMode: 'G94',
  coordinateSystem: 'G54',
  toolOffset: 'G40',
  toolLength: 'G49'
};

export const defaultMCodes = {
  spindle: 'M05',
  coolant: 'M09'
};

export const validCodes = new Set([
  'G00', 'G01', 'G02', 'G03',
  'G17', 'G18', 'G19',
  'G20', 'G21',
  'G90', 'G91',
  'G93', 'G94', 'G95',
  'G54', 'G55', 'G56', 'G57', 'G58', 'G59',
  'G40', 'G41', 'G42',
  'G43', 'G44', 'G49',
  'M03', 'M04', 'M05',
  'M07', 'M08', 'M09',
  'M30'
]);