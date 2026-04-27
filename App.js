import React from 'react';
import { Text, TextInput, StyleSheet, Dimensions, PixelRatio } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation';
import { WalkingProvider, ThemeProvider, AuthProvider, WeatherProvider } from './src/context';
import DevMenu from './src/components/DevMenu';
import OfflineBanner from './src/components/OfflineBanner';
import ReviewPromptModal from './src/components/ReviewPromptModal';

// ==========================================================================
// Global font scaling based on *physical* pixel width, not dp width.
// DP width changes with Android display-zoom; physical pixels don't — so
// S23 Ultra stays recognized as a big phone regardless of user zoom.
//
//   S23 Ultra / Pro Max                ~1440 px wide → 1.00 (unchanged)
//   6.5–6.7" typical mid-high phones   ~1080 px wide → ~0.83 (17% smaller)
//   6.1" smaller iPhones               ~1170 px wide → ~0.90
//   5.5" older / compact phones         ~750 px wide → 0.75 (floor)
// ==========================================================================
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PX_WIDTH = SCREEN_WIDTH * PixelRatio.get();

// Threshold sits between the S23 Ultra (~1440 px wide) and typical
// 6.3" phones like the Redmi Note 7 (~1080 px wide). The gap lets the
// big flagships stay at factor 1.00 while anything around or below
// 1080 physical px shrinks.
//   S23 Ultra / Pro Max (≥ ~1290 px)   → 1.00 (unchanged)
//   1180–1250 px (iPhone 14 Pro)       → 0.94–0.99 (barely changed)
//   1080 px (Redmi Note 7, most 6.1")  → 0.86
//   720 px (older compact phones)       → 0.80 (floor)
const LARGE_PX = 1250;
const SMALL_FLOOR = 0.80;
const smallPhoneScale = PX_WIDTH >= LARGE_PX
  ? 1
  : Math.max(SMALL_FLOOR, PX_WIDTH / LARGE_PX);

// Cap OS-level font scaling regardless of device size.
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.maxFontSizeMultiplier = 1.1;
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.maxFontSizeMultiplier = 1.1;

// Monkey-patch StyleSheet.create so every style object with a
// numeric fontSize / lineHeight is automatically reduced on small phones.
// This is more reliable than patching Text.render in newer RN versions.
if (smallPhoneScale < 1) {
  const originalCreate = StyleSheet.create;
  StyleSheet.create = function patchedCreate(styles) {
    if (!styles || typeof styles !== 'object') return originalCreate(styles);
    const scaled = {};
    for (const key in styles) {
      const style = styles[key];
      if (style && typeof style === 'object') {
        const copy = { ...style };
        if (typeof copy.fontSize === 'number') {
          copy.fontSize = Math.round(copy.fontSize * smallPhoneScale);
        }
        if (typeof copy.lineHeight === 'number') {
          copy.lineHeight = Math.round(copy.lineHeight * smallPhoneScale);
        }
        scaled[key] = copy;
      } else {
        scaled[key] = style;
      }
    }
    return originalCreate(scaled);
  };
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <WeatherProvider>
            <WalkingProvider>
              <AppNavigator />
              <OfflineBanner />
              <ReviewPromptModal />
              <DevMenu />
            </WalkingProvider>
          </WeatherProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
