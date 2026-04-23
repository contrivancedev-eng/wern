// Global connectivity indicator.
//
// Renders three states on top of every screen:
//   1. Offline  — red banner, info icon opens a modal listing the
//                 features that degrade without internet.
//   2. Syncing  — amber banner shown briefly (~4s) when the device
//                 just came back online, while queued events flush.
//   3. Online   — hidden.
//
// Listens to NetInfo (`@react-native-community/netinfo`) and works in
// both dark and light mode via ThemeContext.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import Icon from './Icon';
import { useTheme } from '../context/ThemeContext';

// Features that silently stop working (or produce stale data) when
// the device loses internet. Shown in the info modal so users know
// what to expect. Keep this in sync with the real flows — if we add
// a new online-only feature, append it here.
const OFFLINE_LIMITATIONS = [
  { icon: 'walk', title: 'Step rewards', detail: 'Steps keep counting on your device, but the server won\'t confirm them or credit Litties until you\'re back online.' },
  { icon: 'gift', title: 'Daily check-in', detail: 'Claiming your daily reward needs a live connection. It will unlock automatically when you reconnect.' },
  { icon: 'sunny-outline', title: 'Weather', detail: 'Current conditions in the walk screen are fetched live and will show stale values offline.' },
  { icon: 'notifications-outline', title: 'Notifications', detail: 'New in-app messages and push notifications arrive only when connected.' },
  { icon: 'trophy', title: 'Leaderboard', detail: 'The top walkers list in the Vault won\'t refresh until you\'re online again.' },
  { icon: 'people', title: 'Referrals', detail: 'Inviting friends, copying codes, and viewing your network requires an internet connection.' },
];

const OfflineBanner = () => {
  const [state, setState] = useState({ isConnected: true, wasOffline: false });
  const [showSyncing, setShowSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const wasOfflineRef = useRef(false);
  const syncTimer = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDarkMode, insets), [colors, isDarkMode, insets]);

  useEffect(() => {
    const sub = NetInfo.addEventListener((next) => {
      // `isInternetReachable` can be null briefly on startup. Treat
      // null as "probably online" to avoid false offline banners.
      const online = !!next.isConnected && next.isInternetReachable !== false;

      if (!online) {
        wasOfflineRef.current = true;
        setState({ isConnected: false, wasOffline: true });
      } else if (wasOfflineRef.current) {
        // Just came back online — show the syncing banner briefly,
        // then hide. The actual queue flush is handled by
        // WalkingContext's NetInfo listener separately.
        setShowSyncing(true);
        setState({ isConnected: true, wasOffline: true });
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => {
          setShowSyncing(false);
          wasOfflineRef.current = false;
        }, 4000);
      } else {
        setState({ isConnected: true, wasOffline: false });
      }
    });
    return () => {
      sub();
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, []);

  // Slide the banner in/out smoothly when visibility changes.
  useEffect(() => {
    const visible = !state.isConnected || showSyncing;
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [state.isConnected, showSyncing, slideAnim]);

  const visible = !state.isConnected || showSyncing;
  if (!visible) return null;

  const isSyncing = state.isConnected && showSyncing;

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          isSyncing ? styles.syncContainer : styles.offlineContainer,
          {
            transform: [{
              translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }),
            }],
            opacity: slideAnim,
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.row}>
          <Icon
            name={isSyncing ? 'cloud' : 'cloud-outline'}
            size={18}
            color="#ffffff"
          />
          <Text style={styles.text} numberOfLines={2}>
            {isSyncing
              ? 'Back online — syncing your walk…'
              : 'You are offline. Some features are limited.'}
          </Text>
          {!isSyncing && (
            <TouchableOpacity
              onPress={() => setShowDetails(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="information-circle" size={20} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <Modal
        visible={showDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetails(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowDetails(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalCard}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <Icon name="cloud-outline" size={22} color={colors.textWhite || '#ffffff'} />
              <Text style={styles.modalTitle}>What doesn't work offline</Text>
              <TouchableOpacity onPress={() => setShowDetails(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={22} color={colors.textWhite || '#ffffff'} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Your step count keeps running on your device. Everything below needs a connection:
            </Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {OFFLINE_LIMITATIONS.map((item) => (
                <View key={item.title} style={styles.item}>
                  <View style={styles.itemIcon}>
                    <Icon name={item.icon} size={18} color={colors.textWhite || '#ffffff'} />
                  </View>
                  <View style={styles.itemBody}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemDetail}>{item.detail}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <Text style={styles.modalFooter}>
              Everything will sync automatically as soon as you're back online.
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const createStyles = (colors, isDarkMode, insets) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: (insets?.top || 0) + 8,
    paddingBottom: 10,
    paddingHorizontal: 14,
    zIndex: 9999,
    elevation: 12,
  },
  offlineContainer: {
    backgroundColor: '#dc2626',
  },
  syncContainer: {
    backgroundColor: '#d97706',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '78%',
    borderRadius: 18,
    padding: 20,
    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: isDarkMode ? '#ffffff' : '#0f172a',
  },
  modalSubtitle: {
    fontSize: 13,
    color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.7)',
    marginBottom: 14,
    lineHeight: 18,
  },
  modalScroll: {
    marginBottom: 14,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  },
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: isDarkMode ? 'rgba(220,38,38,0.25)' : 'rgba(220,38,38,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? '#ffffff' : '#0f172a',
    marginBottom: 2,
  },
  itemDetail: {
    fontSize: 12,
    lineHeight: 16,
    color: isDarkMode ? 'rgba(255,255,255,0.65)' : 'rgba(15,23,42,0.65)',
  },
  modalFooter: {
    fontSize: 12,
    textAlign: 'center',
    color: isDarkMode ? 'rgba(255,255,255,0.55)' : 'rgba(15,23,42,0.55)',
    fontStyle: 'italic',
  },
});

export default OfflineBanner;
