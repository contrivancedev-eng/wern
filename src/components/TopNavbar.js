import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, Image, Modal, Switch, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import Logo from './Logo';
import { openDevMenu } from './DevMenu';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { smallScale } from '../utils/responsive';

// Sparkle component for shine effect
const Sparkle = ({ delay, angle, distance }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const translateX = Math.cos(angle) * distance;
  const translateY = Math.sin(angle) * distance;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 8,
        height: 8,
        opacity,
        transform: [
          { translateX },
          { translateY },
          { scale },
        ],
      }}
    >
      <View style={{
        width: 8,
        height: 8,
        backgroundColor: '#FFD700',
        borderRadius: 4,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 4,
      }} />
    </Animated.View>
  );
};

const API_URL = 'https://www.videosdownloaders.com/firsttrackapi/api/';

const TopNavbar = ({ onProfilePress, onReferPress, onLogout, onLittiesPress, onNotificationsPress }) => {
  const insets = useSafeAreaInsets();
  const [showMenu, setShowMenu] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { user, token, litties, walletAnimationTrigger } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Hidden dev-menu trigger: 5 taps on the logo within 2s opens the inspector.
  const logoTapCount = useRef(0);
  const logoTapTimer = useRef(null);
  const handleLogoTap = () => {
    logoTapCount.current += 1;
    if (logoTapTimer.current) clearTimeout(logoTapTimer.current);
    logoTapTimer.current = setTimeout(() => { logoTapCount.current = 0; }, 2000);
    if (logoTapCount.current >= 5) {
      logoTapCount.current = 0;
      openDevMenu();
    }
  };

  // Poll unread notification count every 60s and on mount/auth changes.
  useEffect(() => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { apiFetch } = require('../utils/apiClient');
    const fetchUnread = async () => {
      try {
        const { json } = await apiFetch(
          `${API_URL}get-notifications?token=${token}&limit=1&offset=0`,
          { headers: { Accept: 'application/json' } }
        );
        if (!cancelled && json?.status === true && json?.data) {
          setUnreadCount(json.data.unread_count || 0);
        }
      } catch (e) {
        // Silent
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  // Wallet animations
  const walletScale = useRef(new Animated.Value(1)).current;
  const walletGlow = useRef(new Animated.Value(0)).current;
  const shineRotate = useRef(new Animated.Value(0)).current;
  const shineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (walletAnimationTrigger > 0) {
      // Show sparkles
      setShowSparkles(true);
      setTimeout(() => setShowSparkles(false), 800);

      // Play shine + bounce animation when coins land
      Animated.parallel([
        // Bounce
        Animated.sequence([
          Animated.spring(walletScale, {
            toValue: 1.3,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
          Animated.spring(walletScale, {
            toValue: 1,
            friction: 4,
            tension: 100,
            useNativeDriver: true,
          }),
        ]),
        // Glow pulse
        Animated.sequence([
          Animated.timing(walletGlow, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(walletGlow, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        // Shine rotation
        Animated.sequence([
          Animated.timing(shineOpacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shineRotate, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(shineOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Reset shine rotation for next trigger
        shineRotate.setValue(0);
      });
    }
  }, [walletAnimationTrigger]);

  // Generate sparkle positions (8 sparkles in a circle)
  const sparkleData = Array.from({ length: 8 }, (_, i) => ({
    angle: (i * Math.PI * 2) / 8,
    distance: 28 + Math.random() * 10,
    delay: i * 50,
  }));

  const userImage = user?.user_image;

  const menuItems = [
    { label: 'Profile', icon: 'person', onPress: () => { setShowMenu(false); onProfilePress?.(); } },
    { label: 'Refer & Earn', icon: 'share-social', onPress: () => { setShowMenu(false); onReferPress?.(); } },
    { label: 'Logout', icon: 'arrow-forward', onPress: () => { setShowMenu(false); onLogout?.(); } },
  ];

  return (
    <>
      <View style={[styles.navbar, { paddingTop: insets.top + smallScale(10) }]}>
        <TouchableOpacity
          style={styles.logoContainer}
          onPress={handleLogoTap}
          activeOpacity={1}
        >
          <Logo width={28} />
          <Text
            style={[styles.logoText, { color: colors.textWhite }]}
            maxFontSizeMultiplier={1.1}
          >
            WERN
          </Text>
        </TouchableOpacity>

        <View style={styles.rightSection}>
          <Animated.View
            style={{
              transform: [{ scale: walletScale }],
            }}
          >
            <TouchableOpacity
              style={[styles.littiesContainer, { backgroundColor: colors.cardBackground }]}
              onPress={onLittiesPress}
            >
              {/* Glow effect */}
              <Animated.View
                style={{
                  opacity: walletGlow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.6],
                  }),
                  position: 'absolute',
                  top: -6,
                  left: -6,
                  right: -6,
                  bottom: -6,
                  borderRadius: 26,
                  backgroundColor: '#FFD700',
                  shadowColor: '#FFD700',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 12,
                }}
              />

              {/* Shine rays */}
              <Animated.View
                style={{
                  position: 'absolute',
                  top: -20,
                  left: -20,
                  right: -20,
                  bottom: -20,
                  opacity: shineOpacity,
                  transform: [{
                    rotate: shineRotate.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '180deg'],
                    }),
                  }],
                }}
              >
                {[0, 45, 90, 135].map((rotation) => (
                  <View
                    key={rotation}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: 40,
                      height: 2,
                      marginLeft: -20,
                      marginTop: -1,
                      backgroundColor: '#FFD700',
                      borderRadius: 1,
                      transform: [{ rotate: `${rotation}deg` }],
                      shadowColor: '#FFD700',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 1,
                      shadowRadius: 4,
                    }}
                  />
                ))}
              </Animated.View>

              {/* Sparkles */}
              {showSparkles && (
                <View style={{ position: 'absolute', top: '50%', left: '50%' }}>
                  {sparkleData.map((sparkle, index) => (
                    <Sparkle
                      key={index}
                      angle={sparkle.angle}
                      distance={sparkle.distance}
                      delay={sparkle.delay}
                    />
                  ))}
                </View>
              )}

              <Icon name="wallet" size={18} color={colors.accent} />
              <Text
                style={[styles.littiesText, { color: colors.textWhite }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.1}
              >
                {litties} Litties
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={[
              styles.bellContainer,
              { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
            ]}
            onPress={onNotificationsPress}
            activeOpacity={0.7}
          >
            <Icon
              name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
              size={22}
              color={colors.textWhite}
            />
            {unreadCount > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => setShowMenu(true)}
          >
            <Image
              source={userImage ? { uri: userImage } : require('../../assest/img/no-img.gif')}
              style={styles.avatarImage}
            />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.menuContainer, { top: insets.top + 60 }]}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={item.onPress}
              >
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.menuItem}>
              <Text style={styles.menuItemText}>Dark Mode</Text>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: '#E0E0E0', true: colors.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  navbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: smallScale(20),
    paddingVertical: smallScale(10),
    paddingBottom: smallScale(8),
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    } : {}),
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  littiesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: smallScale(12),
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: smallScale(12),
    flexShrink: 1,
    minWidth: 0,
  },
  littiesText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  bellContainer: {
    width: smallScale(40),
    height: smallScale(40),
    borderRadius: smallScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: smallScale(10),
    flexShrink: 0,
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  avatarContainer: {
    width: smallScale(40),
    height: smallScale(40),
    borderRadius: smallScale(20),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    flexShrink: 0,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuContainer: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 2,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuItemText: {
    fontSize: 13,
    color: '#333333',
  },
});

export default TopNavbar;
