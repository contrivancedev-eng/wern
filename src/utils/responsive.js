import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 14 Pro / standard design width)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// Scale factor based on screen width
const widthScale = SCREEN_WIDTH / BASE_WIDTH;
const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;

// Use the smaller scale to ensure content fits on all devices
const scale = Math.min(widthScale, heightScale);

/**
 * Normalize font size based on screen dimensions
 * @param {number} size - The base font size (designed for 390px width)
 * @returns {number} - Scaled font size
 */
export const normalize = (size) => {
  const newSize = size * widthScale;

  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }

  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
};

/**
 * Responsive font size with min/max bounds
 * @param {number} size - The base font size
 * @param {number} minSize - Minimum font size (optional)
 * @param {number} maxSize - Maximum font size (optional)
 * @returns {number} - Scaled and bounded font size
 */
export const responsiveFont = (size, minSize = null, maxSize = null) => {
  let scaledSize = normalize(size);

  if (minSize !== null && scaledSize < minSize) {
    scaledSize = minSize;
  }

  if (maxSize !== null && scaledSize > maxSize) {
    scaledSize = maxSize;
  }

  return scaledSize;
};

/**
 * Scale a dimension based on screen width
 * @param {number} size - The base size
 * @returns {number} - Scaled size
 */
export const scaleWidth = (size) => {
  return Math.round(size * widthScale);
};

/**
 * Scale a dimension based on screen height
 * @param {number} size - The base size
 * @returns {number} - Scaled size
 */
export const scaleHeight = (size) => {
  return Math.round(size * heightScale);
};

/**
 * Moderate scale - less aggressive scaling for elements that shouldn't scale too much
 * @param {number} size - The base size
 * @param {number} factor - Scale factor (0-1, default 0.5)
 * @returns {number} - Moderately scaled size
 */
export const moderateScale = (size, factor = 0.5) => {
  return Math.round(size + (scaleWidth(size) - size) * factor);
};

/**
 * Small-phone-only scale. Uses *physical* pixel width so it stays
 * stable when the user changes Android display zoom. Big phones
 * (S23 Ultra / Pro Max ~1440 px wide) are unchanged; mid phones
 * (6.1–6.5" ~1080 px wide) shrink to ~83%; very small phones floor at 75%.
 * @param {number} size - The base size
 * @returns {number} - Scaled size
 */
const PHYS_LARGE = 1250;
const PHYS_FLOOR = 0.80;
const physWidth = SCREEN_WIDTH * PixelRatio.get();
export const smallScale = (size) => {
  if (physWidth >= PHYS_LARGE) return size;
  const factor = Math.max(PHYS_FLOOR, physWidth / PHYS_LARGE);
  return Math.round(size * factor);
};

// Font size presets. Design is targeted at ~390dp width. On smaller
// phones responsiveFont scales the value down (floored by min); on
// larger phones it grows slightly (capped by max).
export const fonts = {
  h1: responsiveFont(28, 22, 30),
  h2: responsiveFont(22, 17, 24),
  h3: responsiveFont(18, 14, 20),
  h4: responsiveFont(16, 13, 17),

  body: responsiveFont(14, 11, 15),
  bodySmall: responsiveFont(12, 10, 13),
  caption: responsiveFont(11, 9, 12),

  button: responsiveFont(16, 13, 17),
  label: responsiveFont(12, 9, 13),
};

// Export screen dimensions for convenience
export { SCREEN_WIDTH, SCREEN_HEIGHT, widthScale, heightScale, scale };
