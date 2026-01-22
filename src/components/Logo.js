import React from 'react';
import { View, StyleSheet } from 'react-native';
import WernLogo from '../../assest/img/wern-logo.svg';

const Logo = ({ width = 120, height, style }) => {
  const aspectRatio = 561.6 / 529.92;
  const calculatedHeight = height || width / aspectRatio;

  return (
    <View style={[styles.container, style]}>
      <WernLogo width={width} height={calculatedHeight} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Logo;
