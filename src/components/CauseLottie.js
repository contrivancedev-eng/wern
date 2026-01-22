import React from 'react';
import Icon from './Icon';

// Web fallback - shows an icon instead of Lottie animation
const CauseLottie = ({ fallbackIcon, size = 50 }) => {
  return <Icon name={fallbackIcon || 'leaf'} size={size * 0.8} color="#22c55e" />;
};

export default CauseLottie;
