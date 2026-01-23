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

// Font size presets for common use cases
export const fonts = {
  // Titles
  h1: responsiveFont(28, 24, 34),      // Main screen titles
  h2: responsiveFont(22, 18, 26),      // Section titles
  h3: responsiveFont(18, 16, 22),      // Card titles
  h4: responsiveFont(16, 14, 18),      // Subsection titles

  // Body text
  body: responsiveFont(14, 12, 16),
  bodySmall: responsiveFont(12, 11, 14),
  caption: responsiveFont(11, 10, 12),

  // Special
  button: responsiveFont(16, 14, 18),
  label: responsiveFont(12, 10, 14),
};

// Export screen dimensions for convenience
export { SCREEN_WIDTH, SCREEN_HEIGHT, widthScale, heightScale, scale };
