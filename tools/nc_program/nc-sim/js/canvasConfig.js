console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

/**
 * Configuration for canvas rendering
 * @module canvasConfig
 */

export const CANVAS_CONFIG = {
  DESKTOP_SIZE: 800,
  MOBILE_SIZE: 360,
  PADDING: { desktop: 40, mobile: 20 },
  LINE_WIDTH: { desktop: 2, mobile: 1 },
  TICK_SIZE: { desktop: 5, mobile: 3 },
  TICK_COUNT: { desktop: 10, mobile: 8 },
  FONT_SIZE: { desktop: 12, mobile: 10 },
  ARROW_SPACING_PX: { desktop: 50, mobile: 30 },
  ARROW_LENGTH: { desktop: 10, mobile: 6 },
  COLORS: {
    AXIS: '#000000',  // Black for axes
    RAPID: '#FF0000', // Red for rapid moves (G00)
    LINEAR: '#0000FF', // Blue for linear moves (G01)
    ARC: '#00FF00',   // Green for arcs (G02/G03)
    RANGE: '#FF00FF', // Magenta for range bounds
    BOUND: '#FFA500'  // Orange for view bounds
  },
  DEFAULT_BOUNDS: { minX: -100, maxX: 100, minY: -100, maxY: 100 }
};