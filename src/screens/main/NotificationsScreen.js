import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useAuth } from '../../context';
import Icon from '../../components/Icon';
import GradientBackground from '../../components/GradientBackground';
import { apiFetch } from '../../utils/apiClient';

const API_URL = 'https://www.videosdownloaders.com/firsttrackapi/api/';

const formatTime = (createdAt) => {
  if (!createdAt) return '';
  const d = new Date(createdAt.replace(' ', 'T'));
  if (isNaN(d.getTime())) return createdAt;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
};

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const { colors, isDarkMode } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNotifications = useCallback(async (showLoader = false) => {
    if (!token) return;
    if (showLoader) setIsLoading(true);
    try {
      const { json } = await apiFetch(
        `${API_URL}get-notifications?token=${token}&limit=50&offset=0`,
        { headers: { Accept: 'application/json' } }
      );
      if (json?.status === true && json?.data) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unread_count || 0);
      }
    } catch (e) {
      console.log('Error fetching notifications:', e.message);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications(false);
    setIsRefreshing(false);
  };

  const markRead = async (id) => {
    if (!token) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      const fd = new FormData();
      fd.append('token', token);
      fd.append('id', String(id));
      await apiFetch(`${API_URL}mark-notification-read`, {
        method: 'POST',
        body: fd,
        headers: { Accept: 'application/json' },
      });
    } catch (e) {
      console.log('mark-read failed:', e.message);
    }
  };

  const markAllRead = async () => {
    if (!token || unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      const fd = new FormData();
      fd.append('token', token);
      fd.append('all', '1');
      await apiFetch(`${API_URL}mark-notification-read`, {
        method: 'POST',
        body: fd,
        headers: { Accept: 'application/json' },
      });
    } catch (e) {
      console.log('mark-all-read failed:', e.message);
    }
  };

  const styles = makeStyles(colors, isDarkMode);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.is_read && styles.cardUnread]}
      onPress={() => !item.is_read && markRead(item.id)}
      activeOpacity={0.8}
    >
      <View style={styles.cardIconWrap}>
        <Icon name="notifications" size={20} color={colors.secondary} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title || 'Notification'}
          </Text>
          {!item.is_read ? <View style={styles.unreadDot} /> : null}
        </View>
        {item.body ? (
          <Text style={styles.cardBody} numberOfLines={3}>
            {item.body}
          </Text>
        ) : null}
        <Text style={styles.cardTime}>{formatTime(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <GradientBackground showBlob={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={22} color={colors.textWhite} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity
            style={[styles.markAllBtn, unreadCount === 0 && { opacity: 0.4 }]}
            onPress={markAllRead}
            disabled={unreadCount === 0}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.secondary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.center}>
            <Icon name="notifications-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: Math.max(insets.bottom, 20) + 20,
            }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={colors.secondary}
              />
            }
          />
        )}
      </View>
    </GradientBackground>
  );
};

const makeStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.cardBorder,
    },
    backBtn: { padding: 4, marginRight: 8 },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: colors.textWhite,
    },
    markAllBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    markAllText: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { marginTop: 12, color: colors.textLight, fontSize: 14 },
    card: {
      flexDirection: 'row',
      padding: 12,
      marginBottom: 10,
      borderRadius: 12,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardUnread: {
      borderColor: colors.secondary,
      backgroundColor: isDarkMode
        ? 'rgba(245, 166, 35, 0.08)'
        : 'rgba(245, 166, 35, 0.12)',
    },
    cardIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDarkMode
        ? 'rgba(245, 166, 35, 0.15)'
        : 'rgba(245, 166, 35, 0.18)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textWhite,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.secondary,
      marginLeft: 8,
    },
    cardBody: {
      marginTop: 4,
      fontSize: 13,
      color: colors.textLight,
      lineHeight: 18,
    },
    cardTime: {
      marginTop: 6,
      fontSize: 11,
      color: colors.textMuted,
    },
  });

export default NotificationsScreen;
