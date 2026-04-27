import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';
import GradientButton from './GradientButton';

const API_URL = 'https://www.wernapp.com/api/';
const KEY_STATE = '@wern_review_state';
const TRIGGER_MS = 2 * 24 * 60 * 60 * 1000;

// DEBUG: show popup immediately after login, bypassing the 2-day wait and
// the local submitted/dismissed cache. The server-side "has this user
// already reviewed?" check still applies, so flip this off before shipping.
const DEBUG_SHOW_INSTANTLY = false;

const parseDate = (value) => {
  if (!value) return null;
  // Backend format is "2026-04-24 12:59:17" — Safari/iOS choke on the space,
  // so swap in a T for ISO compatibility.
  const iso = String(value).replace(' ', 'T');
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
};

const getUserId = (user) => user?.id ?? user?.user_id ?? null;

const getRegistrationMs = (user) =>
  parseDate(user?.created_at) ??
  parseDate(user?.registered_at) ??
  parseDate(user?.date_joined) ??
  null;

const hasUserAlreadyReviewed = async (authToken, userId) => {
  if (!authToken || userId == null) return false;
  const res = await fetch(
    `${API_URL}admin-reviews-stats?token=${encodeURIComponent(authToken)}`,
    { headers: { Accept: 'application/json' } }
  );
  const data = await res.json();
  const reviews = data?.data?.reviews;
  if (!Array.isArray(reviews)) return false;
  const uid = String(userId);
  return reviews.some((r) => String(r?.user_id) === uid);
};

const ReviewPromptModal = () => {
  const { colors, isDarkMode } = useTheme();
  const { isAuthenticated, token, user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [star, setStar] = useState(0);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const userId = getUserId(user);
  const registeredAt = getRegistrationMs(user);

  useEffect(() => {
    if (!isAuthenticated || !token || userId == null) return;

    let cancelled = false;
    (async () => {
      try {
        if (!DEBUG_SHOW_INSTANTLY) {
          const state = await AsyncStorage.getItem(KEY_STATE);
          if (state === 'submitted' || state === 'dismissed') return;

          // 2-day rule based on registration date from the backend.
          if (registeredAt == null || Date.now() - registeredAt < TRIGGER_MS) return;
        }

        // Server-side check: user may have submitted from another device.
        const already = await hasUserAlreadyReviewed(token, userId);
        if (cancelled) return;
        if (already) {
          await AsyncStorage.setItem(KEY_STATE, 'submitted');
          return;
        }

        setVisible(true);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, token, userId, registeredAt]);

  const submit = async () => {
    if (!star || submitting) return;
    setSubmitting(true);
    try {
      await fetch(`${API_URL}submit-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          token,
          star: String(star),
          response: response.trim(),
        }),
      });
      await AsyncStorage.setItem(KEY_STATE, 'submitted');
    } catch {} finally {
      setSubmitting(false);
      setVisible(false);
    }
  };

  const dismiss = async () => {
    if (submitting) return;
    try { await AsyncStorage.setItem(KEY_STATE, 'dismissed'); } catch {}
    setVisible(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.card}>
          <TouchableOpacity onPress={dismiss} style={styles.closeBtn} hitSlop={12}>
            <Icon name="close" size={22} color={colors.textLight} />
          </TouchableOpacity>

          <Text style={styles.title}>How's WERN treating you?</Text>
          <Text style={styles.subtitle}>
            Tap a star and share a thought — it really helps us make the app better.
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setStar(i)}
                activeOpacity={0.7}
                hitSlop={6}
              >
                <Icon
                  name={i <= star ? 'star' : 'star-outline'}
                  size={38}
                  color={i <= star ? colors.secondary : colors.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            value={response}
            onChangeText={setResponse}
            placeholder="What could we do better? (optional)"
            placeholderTextColor={colors.inputPlaceholder}
            multiline
            style={styles.input}
            editable={!submitting}
          />

          <GradientButton
            title={submitting ? 'Sending…' : 'Submit'}
            onPress={submit}
            disabled={!star || submitting}
            showArrow={false}
            style={styles.submit}
          />

          <TouchableOpacity onPress={dismiss} disabled={submitting}>
            <Text style={styles.laterText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (colors, isDarkMode) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: isDarkMode ? '#0D4A54' : '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
    zIndex: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  input: {
    backgroundColor: colors.inputBackground,
    color: colors.inputText,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 20,
    fontSize: 15,
  },
  submit: {
    marginBottom: 10,
  },
  laterText: {
    textAlign: 'center',
    color: colors.textLight,
    fontSize: 14,
    paddingVertical: 8,
  },
});

export default ReviewPromptModal;
