console.log('✅ loaded: ' + new URL(import.meta.url).pathname.split('/').pop());

/**
 * Configuration for canvas rendering
 * @module canvasConfig
 */
export const CANVAS_CONFIG = {
  DEFAULT_BOUNDS: { minX: -100, maxX: 100, minY: -100, maxY: 100 },
  MOBILE_SIZE: 360,
  DESKTOP_SIZE: 800,
  PADDING: { mobile: 30, desktop: 50 },
  TICK_COUNT: { mobile: 10, desktop: 12 },
  TICK_SIZE: { mobile: 3, desktop: 5 },
  FONT_SIZE: { mobile: 10, desktop: 12 },
  LINE_WIDTH: { mobile: 1, desktop: 2 },
  ARROW_LENGTH: { mobile: 5, desktop: 10 },
  ARROW_SPACING_PX: { mobile: 40, desktop: 60 },
  COLORS: {
    AXIS: '#000000',
    RAPID: '#ff0000',
    LINEAR: '#0000ff',
    ARC: '#00ff00',
    RANGE: '#ff00ff',
    BOUND: '#A52A2A'
  }
};