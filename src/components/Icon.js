import React from 'react';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';

// Map icon names to Ionicons/FontAwesome5 names
const iconMap = {
  'walk': { set: 'FontAwesome5', name: 'walking' },
  'arrow-back': { set: 'Ionicons', name: 'arrow-back' },
  'arrow-forward': { set: 'Ionicons', name: 'arrow-forward' },
  'wallet': { set: 'Ionicons', name: 'wallet' },
  'wallet-outline': { set: 'Ionicons', name: 'wallet-outline' },
  'share-social': { set: 'Ionicons', name: 'share-social' },
  'people': { set: 'Ionicons', name: 'people' },
  'people-outline': { set: 'Ionicons', name: 'people-outline' },
  'link-outline': { set: 'Ionicons', name: 'link-outline' },
  'checkmark-circle': { set: 'Ionicons', name: 'checkmark-circle' },
  'lock': { set: 'Ionicons', name: 'lock-closed' },
  'camera': { set: 'Ionicons', name: 'camera' },
  'image': { set: 'Ionicons', name: 'image' },
  'shield-checkmark': { set: 'Ionicons', name: 'shield-checkmark' },
  'eye-outline': { set: 'Ionicons', name: 'eye-outline' },
  'eye-off-outline': { set: 'Ionicons', name: 'eye-off-outline' },
  'checkmark': { set: 'Ionicons', name: 'checkmark' },
  'chevron-down': { set: 'Ionicons', name: 'chevron-down' },
  'chevron-up': { set: 'Ionicons', name: 'chevron-up' },
  'bar-chart': { set: 'Ionicons', name: 'bar-chart' },
  'bar-chart-outline': { set: 'Ionicons', name: 'bar-chart-outline' },
  'stats-chart': { set: 'Ionicons', name: 'stats-chart' },
  'stats-chart-outline': { set: 'Ionicons', name: 'stats-chart-outline' },
  'calendar': { set: 'Ionicons', name: 'calendar' },
  'calendar-outline': { set: 'Ionicons', name: 'calendar-outline' },
  'time-outline': { set: 'Ionicons', name: 'time-outline' },
  'footsteps': { set: 'Ionicons', name: 'footsteps' },
  'flame': { set: 'Ionicons', name: 'flame' },
  'navigate': { set: 'Ionicons', name: 'navigate' },
  'information-circle': { set: 'Ionicons', name: 'information-circle' },
  'home': { set: 'Ionicons', name: 'home' },
  'home-outline': { set: 'Ionicons', name: 'home-outline' },
  'notifications-outline': { set: 'Ionicons', name: 'notifications-outline' },
  'person': { set: 'Ionicons', name: 'person' },
  'person-outline': { set: 'Ionicons', name: 'person-outline' },
  'partly-sunny': { set: 'Ionicons', name: 'partly-sunny' },
  'star': { set: 'Ionicons', name: 'star' },
  'arrow-up-circle': { set: 'Ionicons', name: 'arrow-up-circle' },
  'arrow-down-circle': { set: 'Ionicons', name: 'arrow-down-circle' },
  'swap-horizontal': { set: 'Ionicons', name: 'swap-horizontal' },
  'cafe': { set: 'Ionicons', name: 'cafe' },
  'film': { set: 'Ionicons', name: 'film' },
  'gift': { set: 'Ionicons', name: 'gift' },
  'arrow-up': { set: 'Ionicons', name: 'arrow-up' },
  'arrow-down': { set: 'Ionicons', name: 'arrow-down' },
  'close': { set: 'Ionicons', name: 'close' },
  'menu': { set: 'Ionicons', name: 'menu' },
  'settings': { set: 'Ionicons', name: 'settings' },
  'add': { set: 'Ionicons', name: 'add' },
  'remove': { set: 'Ionicons', name: 'remove' },
  'phone': { set: 'Ionicons', name: 'call' },
  'mail': { set: 'Ionicons', name: 'mail' },
  'lock': { set: 'Ionicons', name: 'lock-closed' },
  'coins': { set: 'FontAwesome5', name: 'coins' },
  'chart': { set: 'Ionicons', name: 'stats-chart' },
  'trophy': { set: 'Ionicons', name: 'trophy' },
  'handshake': { set: 'FontAwesome5', name: 'handshake' },
  'card': { set: 'Ionicons', name: 'card' },
  'qrcode': { set: 'Ionicons', name: 'qr-code' },
  'history': { set: 'Ionicons', name: 'time' },
  'exchange': { set: 'Ionicons', name: 'swap-horizontal' },
  'sunny': { set: 'Ionicons', name: 'sunny' },
  'sunny-outline': { set: 'Ionicons', name: 'sunny-outline' },
  'cloud': { set: 'Ionicons', name: 'cloud' },
  'cloud-outline': { set: 'Ionicons', name: 'cloud-outline' },
  'cloudy': { set: 'Ionicons', name: 'cloudy' },
  'cloudy-outline': { set: 'Ionicons', name: 'cloudy-outline' },
  'cloudy-night': { set: 'Ionicons', name: 'cloudy-night' },
  'cloudy-night-outline': { set: 'Ionicons', name: 'cloudy-night-outline' },
  'rainy': { set: 'Ionicons', name: 'rainy' },
  'rainy-outline': { set: 'Ionicons', name: 'rainy-outline' },
  'thunderstorm': { set: 'Ionicons', name: 'thunderstorm' },
  'thunderstorm-outline': { set: 'Ionicons', name: 'thunderstorm-outline' },
  'snow': { set: 'Ionicons', name: 'snow' },
  'snow-outline': { set: 'Ionicons', name: 'snow-outline' },
  'moon': { set: 'Ionicons', name: 'moon' },
  'moon-outline': { set: 'Ionicons', name: 'moon-outline' },
  'flag': { set: 'Ionicons', name: 'flag' },
  'flag-outline': { set: 'Ionicons', name: 'flag-outline' },
  'water': { set: 'Ionicons', name: 'water' },
  'leaf': { set: 'Ionicons', name: 'leaf' },
  'stop': { set: 'Ionicons', name: 'stop' },
  'battery-charging': { set: 'Ionicons', name: 'battery-charging' },
  'notifications': { set: 'Ionicons', name: 'notifications' },
  'fitness': { set: 'Ionicons', name: 'fitness' },
  'location': { set: 'Ionicons', name: 'location' },
  'location-outline': { set: 'Ionicons', name: 'location-outline' },
  'ellipse-outline': { set: 'Ionicons', name: 'ellipse-outline' },
  'close-circle': { set: 'Ionicons', name: 'close-circle' },
  'search': { set: 'Ionicons', name: 'search' },
  'search-outline': { set: 'Ionicons', name: 'search-outline' },
};

const Icon = ({ name, size = 24, color = '#FFFFFF', style }) => {
  const iconConfig = iconMap[name] || { set: 'Ionicons', name: 'ellipse' };

  if (iconConfig.set === 'FontAwesome5') {
    return <FontAwesome5 name={iconConfig.name} size={size} color={color} style={style} />;
  }

  if (iconConfig.set === 'MaterialIcons') {
    return <MaterialIcons name={iconConfig.name} size={size} color={color} style={style} />;
  }

  return <Ionicons name={iconConfig.name} size={size} color={color} style={style} />;
};

export default Icon;
