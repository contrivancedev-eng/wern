import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, Image, Modal, Switch, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import Logo from './Logo';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const TopNavbar = ({ onProfilePress, onReferPress, onLogout, onLittiesPress }) => {
  const insets = useSafeAreaInsets();
  const [showMenu, setShowMenu] = useState(false);
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { user, litties, walletAnimationTrigger } = useAuth();

  // Wallet bounce animation
  const walletScale = useRef(new Animated.Value(1)).current;
  const walletGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (walletAnimationTrigger > 0) {
      // Play bounce animation when coins land
      Animated.sequence([
        // Quick scale up with glow
        Animated.parallel([
          Animated.spring(walletScale, {
            toValue: 1.25,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
          Animated.timing(walletGlow, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        // Bounce back down
        Animated.parallel([
          Animated.spring(walletScale, {
            toValue: 1,
            friction: 4,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.timing(walletGlow, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [walletAnimationTrigger]);

  const userImage = user?.user_image;

  const menuItems = [
    { label: 'Profile', icon: 'person', onPress: () => { setShowMenu(false); onProfilePress?.(); } },
    { label: 'Refer & Earn', icon: 'share-social', onPress: () => { setShowMenu(false); onReferPress?.(); } },
    { label: 'Logout', icon: 'arrow-forward', onPress: () => { setShowMenu(false); onLogout?.(); } },
  ];

  return (
    <>
      <View style={[styles.navbar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.logoContainer}>
          <Logo width={28} />
          <Text style={[styles.logoText, { color: colors.textWhite }]}>WERN</Text>
        </View>

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
              <Animated.View
                style={{
                  opacity: walletGlow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.5],
                  }),
                  position: 'absolute',
                  top: -4,
                  left: -4,
                  right: -4,
                  bottom: -4,
                  borderRadius: 24,
                  backgroundColor: '#FFD700',
                }}
              />
              <Icon name="wallet" size={18} color={colors.accent} />
              <Text style={[styles.littiesText, { color: colors.textWhite }]}>{litties} Litties</Text>
            </TouchableOpacity>
          </Animated.View>

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
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    } : {}),
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  littiesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  littiesText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
