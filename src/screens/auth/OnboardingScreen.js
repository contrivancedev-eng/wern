import React, { useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  useWindowDimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { GradientBackground, GradientButton, Logo } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { fonts } from '../../utils';

// Slide data — visuals are glassmorphic (translucent + blurred) across all
// slides. No per-slide color accents beyond the theme's glass tones.
const SLIDES = [
  {
    id: 'welcome',
    kind: 'welcome',
    title: 'Welcome to the Future',
    description:
      'Transform your daily walks into rewards while building a safer, more connected community.',
  },
  {
    id: 'earn',
    kind: 'feature',
    title: 'Earn While Walking',
    description: '100 steps = 1 Litty. Every step you take earns real rewards.',
    image: require('../../../assest/img/walk.gif'),
  },
  {
    id: 'refer',
    kind: 'feature',
    title: 'Refer & Earn More',
    description: 'Invite friends and earn bonus rewards together — everyone wins.',
    emoji: '🎁',
  },
  {
    id: 'connect',
    kind: 'feature',
    title: 'Connect Safely',
    description: 'Meet other walkers and build community bonds around you.',
    image: require('../../../assest/img/referral -human.webp'),
  },
  {
    id: 'protect',
    kind: 'feature',
    title: 'Stay Protected',
    description: 'Report issues and help keep your city safe for everyone.',
    emoji: '🛡️',
  },
  {
    id: 'watch',
    kind: 'feature',
    title: 'Smart Watch Connect',
    description: 'Track walks right from your wrist with Wear OS support.',
    emoji: '⌚',
  },
];

const GlassCircle = ({ size, isDarkMode, children, style }) => {
  // A single reusable glassmorphic disc: translucent fill + hairline border
  // + blurred interior. Uses only whites/blacks with alpha, no color accents.
  const tint = isDarkMode ? 'dark' : 'light';
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)',
          borderWidth: 1,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.7)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDarkMode ? 0.35 : 0.12,
          shadowRadius: 20,
          elevation: 6,
        },
        style,
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={40} tint={tint} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
};

const FeatureVisual = ({ slide, isDarkMode }) => {
  const float = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [float]);

  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 8],
  });

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      {/* Outer halo — very subtle, just another glass ring */}
      <GlassCircle size={240} isDarkMode={isDarkMode} style={{ padding: 12 }}>
        <GlassCircle size={200} isDarkMode={isDarkMode}>
          {slide.image ? (
            <Image
              source={slide.image}
              style={{ width: 160, height: 160 }}
              resizeMode="contain"
            />
          ) : (
            <Text style={{ fontSize: 110 }}>{slide.emoji}</Text>
          )}
        </GlassCircle>
      </GlassCircle>
    </Animated.View>
  );
};

const OnboardingScreen = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles(colors, isDarkMode, width),
    [colors, isDarkMode, width]
  );

  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  const goToLogin = () => navigation.navigate('Login');

  const goToNext = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      goToLogin();
    }
  };

  const onMomentumEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  };

  const renderItem = ({ item }) => {
    if (item.kind === 'welcome') {
      return (
        <View style={[styles.slide, { width }]}>
          <GlassCircle size={220} isDarkMode={isDarkMode} style={{ marginBottom: 40 }}>
            <Logo width={120} />
          </GlassCircle>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.description}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.slide, { width }]}>
        <FeatureVisual slide={item} isDarkMode={isDarkMode} />
        <Text style={styles.featureTitle}>{item.title}</Text>
        <Text style={styles.featureDescription}>{item.description}</Text>
      </View>
    );
  };

  const isLast = index === SLIDES.length - 1;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        {/* Top bar — Skip goes straight to Login */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.skipBtn} onPress={goToLogin} hitSlop={10}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          style={{ flex: 1 }}
        />

        {/* Pagination dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>

        {/* Bottom action area */}
        <View style={styles.bottomSection}>
          <GradientButton
            title={isLast ? 'Get Started' : 'Next'}
            onPress={goToNext}
            style={styles.primaryButton}
          />
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signupLink}>
              New user? <Text style={styles.signupLinkAccent}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
};

const createStyles = (colors, isDarkMode, width) =>
  StyleSheet.create({
    container: { flex: 1 },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 20,
      paddingVertical: 8,
    },
    skipBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
      borderWidth: 1,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.7)',
    },
    skipText: {
      color: colors.textWhite,
      fontSize: 13,
      fontWeight: '600',
    },
    slide: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    title: {
      fontSize: fonts.h1,
      fontWeight: '700',
      color: colors.textWhite,
      textAlign: 'center',
      marginBottom: 16,
    },
    subtitle: {
      fontSize: fonts.body,
      color: colors.textLight,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: 8,
    },
    featureTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.textWhite,
      textAlign: 'center',
      marginTop: 40,
      marginBottom: 14,
    },
    featureDescription: {
      fontSize: 15,
      color: colors.textLight,
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: width * 0.78,
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 18,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)',
    },
    dotActive: {
      width: 28,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.95)',
    },
    bottomSection: {
      paddingHorizontal: 20,
      paddingBottom: 24,
      alignItems: 'center',
    },
    primaryButton: {
      width: '100%',
      marginBottom: 14,
    },
    signupLink: {
      color: colors.textLight,
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
      paddingVertical: 8,
    },
    signupLinkAccent: {
      color: colors.textWhite,
      fontWeight: '700',
    },
  });

export default OnboardingScreen;
