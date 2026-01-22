import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

const LinearGradient = ({
  colors = ['#000', '#fff'],
  start = { x: 0, y: 0 },
  end = { x: 0, y: 1 },
  style,
  children
}) => {
  // Use expo-linear-gradient for native, CSS for web
  if (Platform.OS === 'web') {
    const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI) + 90;
    const gradientStyle = {
      backgroundImage: `linear-gradient(${angle}deg, ${colors.join(', ')})`,
    };

    return (
      <View style={[styles.container, style, gradientStyle]}>
        {children}
      </View>
    );
  }

  return (
    <ExpoLinearGradient
      colors={colors}
      start={start}
      end={end}
      style={[styles.container, style]}
    >
      {children}
    </ExpoLinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    // No flex: 1 here - let parent control sizing
  },
});

export default LinearGradient;
