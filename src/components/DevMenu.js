// In-app network inspector — Chrome Network-tab-style view for API calls.
// Flip DEV_MENU_ENABLED to false before shipping a release to hide it.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  subscribe,
  getEntries,
  clearEntries,
} from '../utils/networkLogger';

export const DEV_MENU_ENABLED = false;

// Imperative opener — the mounted DevMenu registers its setState here so
// other parts of the app (e.g. a hidden logo-tap trigger) can open it.
let openerRef = null;
export const openDevMenu = () => {
  if (!DEV_MENU_ENABLED) return;
  openerRef?.();
};

const fmtTime = (ts) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const statusColor = (status) => {
  if (status == null) return '#9ca3af';
  if (status === 0) return '#ef4444';
  if (status >= 500) return '#ef4444';
  if (status >= 400) return '#f59e0b';
  if (status >= 200 && status < 300) return '#22c55e';
  return '#9ca3af';
};

const shortUrl = (url) => {
  try {
    const u = String(url).replace(/^https?:\/\/[^/]+/, '');
    return u.length > 80 ? u.slice(0, 80) + '…' : u;
  } catch {
    return String(url);
  }
};

const DevMenu = () => {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState(getEntries());
  const [selectedId, setSelectedId] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => subscribe((list) => setEntries([...list])), []);

  useEffect(() => {
    openerRef = () => setOpen(true);
    return () => { openerRef = null; };
  }, []);

  const selected = useMemo(
    () => entries.find((e) => e.id === selectedId) || null,
    [entries, selectedId]
  );

  if (!DEV_MENU_ENABLED) return null;

  return (
    <>
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent={false}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0b1220" />
        <SafeAreaView style={styles.modal} edges={['top', 'bottom', 'left', 'right']}>
          <View style={[styles.header, Platform.OS === 'android' && { paddingTop: insets.top + 8 }]}>
            <Text style={styles.title}>Network ({entries.length})</Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={clearEntries} style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setSelectedId(null); setOpen(false); }}
                style={styles.headerBtn}
              >
                <Text style={styles.headerBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>

          {selected ? (
            <DetailView entry={selected} onBack={() => setSelectedId(null)} />
          ) : (
            <ScrollView style={{ flex: 1 }}>
              {entries.length === 0 && (
                <Text style={styles.empty}>No API calls yet. Use the app.</Text>
              )}
              {entries.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={styles.row}
                  onPress={() => setSelectedId(e.id)}
                >
                  <View style={[styles.statusPill, { backgroundColor: statusColor(e.status) }]}>
                    <Text style={styles.statusText}>
                      {e.status == null ? '…' : e.status === 0 ? 'ERR' : e.status}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowMethod}>
                      {e.method}  <Text style={styles.rowMeta}>{fmtTime(e.startedAt)} · {e.durationMs ?? '…'}ms</Text>
                    </Text>
                    <Text style={styles.rowUrl} numberOfLines={2}>{shortUrl(e.url)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
};

// Kept for backwards-compat — bubble styles are no longer rendered.

const DetailView = ({ entry, onBack }) => {
  const render = (v) => {
    if (v == null) return <Text style={styles.code}>—</Text>;
    if (typeof v === 'string') return <Text style={styles.code}>{v}</Text>;
    return <Text style={styles.code}>{JSON.stringify(v, null, 2)}</Text>;
  };

  return (
    <ScrollView style={{ flex: 1, padding: 12 }}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Back to list</Text>
      </TouchableOpacity>

      <Section label="General">
        <Text style={styles.kv}><Text style={styles.k}>Method: </Text>{entry.method}</Text>
        <Text style={styles.kv}><Text style={styles.k}>Status: </Text>{entry.status ?? '(pending)'}</Text>
        <Text style={styles.kv}><Text style={styles.k}>Duration: </Text>{entry.durationMs ?? '…'} ms</Text>
        <Text style={styles.kv}><Text style={styles.k}>Time: </Text>{new Date(entry.startedAt).toLocaleString()}</Text>
        <Text style={styles.kv}><Text style={styles.k}>URL: </Text>{entry.url}</Text>
      </Section>

      {entry.requestHeaders && (
        <Section label="Request Headers">{render(entry.requestHeaders)}</Section>
      )}

      <Section label="Request Body / Form Data">{render(entry.requestBody)}</Section>

      {entry.error && (
        <Section label="Error">
          <Text style={[styles.code, { color: '#ef4444' }]}>{entry.error}</Text>
        </Section>
      )}

      <Section label="Response">{render(entry.responseBody)}</Section>
    </ScrollView>
  );
};

const Section = ({ label, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionLabel}>{label}</Text>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 12,
    bottom: 120,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(17,24,39,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 10,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  badge: {
    position: 'absolute',
    top: -4, right: -4,
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: '#ef4444',
    paddingHorizontal: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  modal: { flex: 1, backgroundColor: '#0b1220' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#1f2937',
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  headerBtnText: { color: '#60a5fa', fontWeight: '600' },

  empty: { color: '#9ca3af', padding: 24, textAlign: 'center' },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#1f2937',
  },
  statusPill: {
    minWidth: 44, height: 24, borderRadius: 6,
    paddingHorizontal: 6, marginRight: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  rowMethod: { color: '#e5e7eb', fontWeight: '700', fontSize: 13 },
  rowMeta: { color: '#9ca3af', fontWeight: '400' },
  rowUrl: { color: '#93c5fd', fontSize: 12, marginTop: 2 },

  backBtn: { paddingVertical: 8, marginBottom: 8 },
  backBtnText: { color: '#60a5fa', fontWeight: '600' },

  section: { marginBottom: 14 },
  sectionLabel: { color: '#9ca3af', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  sectionBody: { backgroundColor: '#111827', padding: 10, borderRadius: 8 },

  kv: { color: '#e5e7eb', fontSize: 12, marginBottom: 3, fontFamily: 'Courier' },
  k: { color: '#9ca3af' },
  code: { color: '#e5e7eb', fontSize: 11, fontFamily: 'Courier' },
});

export default DevMenu;
