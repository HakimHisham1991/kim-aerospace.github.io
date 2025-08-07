console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

/**
 * Configuration for valid G-code and M-code commands and default states
 * @module gcodeConfig
 */

export const defaultGCodes = {
  motion: 'G00',
  plane: 'G17',
  units: 'G21',
  distanceMode: 'G90',
  feedMode: 'G94',
  coordinateSystem: 'G54',
  toolOffset: 'G40',
  toolLength: 'G49',
  retractPlane: 'G98',
  rotation: 'G69',
  holeCycle: 'G80'
};

export const defaultMCodes = {
  spindle: 'M05',
  coolant: 'M09',
  toolNumber: 'T00'
};

export const validCodes = new Set([
  'G00', 'G01', 'G02', 'G03',
  'G17', 'G18', 'G19',
  'G20', 'G21',
  'G90', 'G91',
  'G93', 'G94', 'G95',
  'G53', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59',
  'G40', 'G41', 'G42',
  'G43', 'G44', 'G49',
  'G98', 'G99',
  'G68', 'G69',
  'G80', 'G81', 'G82', 'G83', 'G84', 'G85', 'G86', 'G87', 'G88', 'G89', 'G73', 'G74', 'G76',
  'M00', 'M01',
  'M03', 'M04', 'M05',
  'M06',
  'M07', 'M08', 'M09',
  'M30',
  'M98', 'M99', 'M198'
]);