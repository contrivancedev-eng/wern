import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import LinearGradient from './LinearGradient';
import { useTheme } from '../context/ThemeContext';

const GradientBackground = ({ children, showBlob = true }) => {
  const { colors, isDarkMode } = useTheme();

  return (
    <LinearGradient
      colors={colors.backgroundGradient}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {showBlob && (
        <View style={[styles.blobContainer, { opacity: isDarkMode ? 1 : 0.55 }]}>
          <Image
            source={require('../../assest/img/body-bg-blob.webp')}
            style={styles.blob}
            resizeMode="contain"
          />
        </View>
      )}
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blobContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    opacity: 1,
  },
  blob: {
    width: '100%',
    aspectRatio: 1,
  },
});

export default GradientBackground;
