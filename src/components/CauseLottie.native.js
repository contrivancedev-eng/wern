import React from 'react';
import LottieView from 'lottie-react-native';

// eslint-disable-next-line no-unused-vars
const CauseLottie = ({ lottieUrl, fallbackIcon, size = 50 }) => {
  return (
    <LottieView
      source={{ uri: lottieUrl }}
      autoPlay
      loop
      style={{ width: size, height: size }}
    />
  );
};

export default CauseLottie;
