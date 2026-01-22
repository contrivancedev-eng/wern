export const onboardingFeatures = [
  {
    id: 1,
    icon: 'wallet',
    title: 'Earn While Walking',
    description: '100 steps = 1 Litty',
    color: '#FF6B6B',
  },
  {
    id: 2,
    icon: 'share-social',
    title: 'Refer & Earn More',
    description: 'Invite friends and earn bonus rewards together',
    color: '#4ECDC4',
  },
  {
    id: 3,
    icon: 'people',
    title: 'Connect Safely',
    description: 'Meet other walkers and build community bonds',
    color: '#45B7D1',
  },
  {
    id: 4,
    icon: 'shield-checkmark',
    title: 'Stay Protected',
    description: 'Report issues and help keep your city safe',
    color: '#FF8C42',
  },
];

export const bannerData = [
  {
    id: 1,
    image: require('../../assest/img/slider-1.png'),
    title: 'Kids Walk for Labubu',
  },
  {
    id: 2,
    image: require('../../assest/img/slider-2.png'),
    title: 'Walk Challenge',
  },
  {
    id: 3,
    image: require('../../assest/img/slider-3.png'),
    title: 'Summer Steps',
  },
  {
    id: 4,
    image: require('../../assest/img/slider-4.png'),
    title: 'Community Walk',
  },
  {
    id: 5,
    image: require('../../assest/img/slider-5.png'),
    title: 'Weekend Rewards',
  },
];

export const productData = [
  {
    id: 1,
    type: 'video',
    video: require('../../assest/video/apple-watch.mp4'),
    title: 'Apple Watch Series 10',
    litties: 50000,
  },
  {
    id: 2,
    type: 'image',
    image: require('../../assest/img/offer2.webp'),
    title: 'Special Offer',
    litties: 100000,
  },
];

export const dailyRewards = [
  { day: 1, litties: 0, completed: true },
  { day: 2, litties: 5, completed: false, current: true },
  { day: 3, litties: 10, completed: false },
  { day: 4, litties: 10, completed: false },
  { day: 5, litties: 15, completed: false },
  { day: 6, litties: 15, completed: false },
  { day: 7, litties: 20, completed: false },
];

export const countryCodes = [
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+82', country: 'KR', flag: '🇰🇷' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
  { code: '+55', country: 'BR', flag: '🇧🇷' },
];
