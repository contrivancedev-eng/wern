import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Icon, Toast } from '../../components';
import { useTheme, useAuth, useWalking } from '../../context';
import { fonts } from '../../utils';

const API_URL = 'https://www.videosdownloaders.com/firsttrackapi/api/';
const activityLevels = ['Beginner', 'Intermediate', 'Advanced'];

// Format large numbers (1000 -> 1k, 10000 -> 10k, etc.)
const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  const n = Number(num);
  if (isNaN(n)) return '0';

  if (n >= 1000000) {
    return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return Math.round(n).toString();
};

// ─── Connected Devices Section ───────────────────────────────────
const DevicesSection = ({
  styles, isDarkMode, colors, devicesExpanded, setDevicesExpanded,
  connectedWatch, isScanning, availableDevices, hasScanned,
  syncSteps, setSyncSteps, syncHeartRate, setSyncHeartRate,
  syncWalkControl, setSyncWalkControl,
  handleScanForDevices, handleConnectDevice, handleDisconnect, handleManualConnect,
  onCodeGenerated,
}) => {
  const [showManualCode, setShowManualCode] = React.useState(false);
  const [pairingCode, setPairingCode] = React.useState('');
  const [codeExpiry, setCodeExpiry] = React.useState(0);
  const codeTimerRef = React.useRef(null);

  const generateCode = React.useCallback(() => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setPairingCode(code);
    if (onCodeGenerated) onCodeGenerated(code);
    setCodeExpiry(300); // 5 minutes
    if (codeTimerRef.current) clearInterval(codeTimerRef.current);
    codeTimerRef.current = setInterval(() => {
      setCodeExpiry((prev) => {
        if (prev <= 1) { clearInterval(codeTimerRef.current); setPairingCode(''); if (onCodeGenerated) onCodeGenerated(null); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  React.useEffect(() => {
    if (showManualCode && !pairingCode) generateCode();
    return () => { if (codeTimerRef.current) clearInterval(codeTimerRef.current); };
  }, [showManualCode]);

  const formatExpiry = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const SyncToggle = ({ value, onToggle, label, icon, desc }) => (
    <View style={styles.wSync}>
      <View style={styles.wSyncLeft}>
        <View style={[styles.wSyncIcon, { backgroundColor: value ? 'rgba(34,197,94,0.1)' : isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
          <Icon name={icon} size={16} color={value ? '#22C55E' : (isDarkMode ? 'rgba(255,255,255,0.3)' : '#9CA3AF')} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.wSyncLabel}>{label}</Text>
          <Text style={styles.wSyncDesc}>{desc}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.wToggle, value && styles.wToggleOn]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.wToggleThumb, value && styles.wToggleThumbOn]} />
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (!connectedWatch) {
      return (
        <View>
          {/* Hero Empty State */}
          <View style={styles.wEmptyHero}>
            <View style={styles.wEmptyIconRing}>
              <View style={styles.wEmptyIconInner}>
                <Icon name="watch" size={28} color={isDarkMode ? 'rgba(255,255,255,0.6)' : '#003B4C'} />
              </View>
            </View>
            <Text style={styles.wEmptyTitle}>Connect Your Watch</Text>
            <Text style={styles.wEmptyDesc}>
              Sync steps automatically, control walks, and see live stats right on your wrist.
            </Text>
          </View>

          {/* Scan Button — green */}
          <LinearGradient
            colors={['#22C55E', '#16A34A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.wScanGradient}
          >
            <TouchableOpacity
              style={styles.wScanBtn}
              onPress={handleScanForDevices}
              disabled={isScanning}
              activeOpacity={0.8}
            >
              {isScanning ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.wScanText}>Searching nearby...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon
                    name={hasScanned ? 'refresh' : 'bluetooth'}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.wScanText}>
                    {hasScanned ? 'Scan Again' : 'Scan for Devices'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </LinearGradient>

          {/* Found Devices */}
          {availableDevices.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text style={styles.wFoundLabel}>Found {availableDevices.length} device{availableDevices.length > 1 ? 's' : ''}</Text>
              {availableDevices.map((device, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.wDeviceCard}
                  onPress={() => handleConnectDevice(device)}
                  activeOpacity={0.7}
                >
                  <View style={styles.wDeviceCardIcon}>
                    <Icon
                      name={device.type === 'apple_watch' ? 'logo-apple' : 'watch'}
                      size={22}
                      color={isDarkMode ? '#fff' : '#003B4C'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.wDeviceCardName}>{device.name}</Text>
                    <Text style={styles.wDeviceCardType}>
                      {device.type === 'apple_watch' ? 'Apple Watch' : 'Wear OS'}
                    </Text>
                  </View>
                  <View style={styles.wPairBtn}>
                    <Text style={styles.wPairBtnText}>Pair</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Empty state — scan completed but nothing found */}
          {hasScanned && !isScanning && availableDevices.length === 0 && (
            <View style={styles.wEmptyResults}>
              <View style={styles.wEmptyIcon}>
                <Icon
                  name="search-outline"
                  size={22}
                  color={isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280'}
                />
              </View>
              <Text style={styles.wEmptyResultsTitle}>No devices found</Text>
              <Text style={styles.wEmptyResultsHint}>
                Make sure your watch is powered on, paired via the Wear OS / Galaxy Wearable app, and has WERN installed.
              </Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.wDivider}>
            <View style={styles.wDividerLine} />
            <Text style={styles.wDividerText}>or</Text>
            <View style={styles.wDividerLine} />
          </View>

          {/* Manual Connect */}
          <TouchableOpacity
            style={styles.wManualBtn}
            onPress={() => setShowManualCode(!showManualCode)}
            activeOpacity={0.7}
          >
            <Icon name="keypad" size={18} color={isDarkMode ? 'rgba(255,255,255,0.85)' : '#374151'} />
            <Text style={styles.wManualText}>Enter pairing code manually</Text>
            <Icon name={showManualCode ? 'chevron-up' : 'chevron-down'} size={14} color={isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280'} />
          </TouchableOpacity>

          {/* Manual Code Display Section */}
          {showManualCode && (
            <View style={styles.wCodeSection}>
              <Text style={styles.wCodeInstructions}>
                Open WERN on your smartwatch and enter this code to pair.
              </Text>
              <View style={styles.wCodeDisplay}>
                <Text style={styles.wCodeDigits}>{pairingCode || '--- ---'}</Text>
              </View>
              {codeExpiry > 0 ? (
                <Text style={styles.wCodeExpiry}>Code expires in {formatExpiry(codeExpiry)}</Text>
              ) : (
                <Text style={[styles.wCodeExpiry, { color: '#EF4444' }]}>Code expired</Text>
              )}
              <TouchableOpacity
                style={styles.wCodeRefresh}
                onPress={generateCode}
                activeOpacity={0.7}
              >
                <Icon name="refresh" size={14} color={isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280'} />
                <Text style={styles.wCodeRefreshText}>{codeExpiry > 0 ? 'Generate new code' : 'Get new code'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Supported Devices */}
          <View style={styles.wSupported}>
            <Text style={styles.wSupportedTitle}>Supported devices</Text>
            <Text style={styles.wSupportedList}>Apple Watch 4+ {'\u2022'} Galaxy Watch 4+ {'\u2022'} Pixel Watch {'\u2022'} Wear OS 3+</Text>
          </View>
        </View>
      );
    }

    // ─── Connected State ───
    return (
      <View>
        {/* Device Card with gradient accent */}
        <View style={styles.wConnectedCard}>
          <LinearGradient
            colors={['rgba(34,197,94,0.12)', 'rgba(34,197,94,0.02)']}
            style={styles.wConnectedGradient}
          >
            <View style={styles.wConnectedTop}>
              <View style={styles.wConnectedIcon}>
                <Icon
                  name={connectedWatch.type === 'apple_watch' ? 'logo-apple' : 'watch'}
                  size={26}
                  color="#22C55E"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.wConnectedName}>{connectedWatch.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <View style={styles.wPulseDot} />
                  <Text style={styles.wConnectedStatusText}>Connected & syncing</Text>
                </View>
              </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.wStatsRow}>
              <View style={styles.wStatItem}>
                <Icon name="battery-charging" size={14} color="#22C55E" />
                <Text style={styles.wStatVal}>{connectedWatch.battery != null ? connectedWatch.battery + '%' : '--'}</Text>
                <Text style={styles.wStatLabel}>Battery</Text>
              </View>
              <View style={styles.wStatDivider} />
              <View style={styles.wStatItem}>
                <Icon name="wifi" size={14} color="#0D9488" />
                <Text style={styles.wStatVal}>Strong</Text>
                <Text style={styles.wStatLabel}>Signal</Text>
              </View>
              <View style={styles.wStatDivider} />
              <View style={styles.wStatItem}>
                <Icon name="sync" size={14} color="#F59E0B" />
                <Text style={styles.wStatVal}>Now</Text>
                <Text style={styles.wStatLabel}>Last sync</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Sync Preferences */}
        <Text style={styles.wSectionLabel}>Sync Preferences</Text>
        <View style={styles.wSyncGroup}>
          <SyncToggle value={syncSteps} onToggle={() => setSyncSteps(!syncSteps)} label="Step counting" desc="Count steps from watch sensors" icon="footsteps" />
          <SyncToggle value={syncHeartRate} onToggle={() => setSyncHeartRate(!syncHeartRate)} label="Heart rate" desc="Monitor during walks" icon="heart" />
          <SyncToggle value={syncWalkControl} onToggle={() => setSyncWalkControl(!syncWalkControl)} label="Walk control" desc="Start & stop walks from watch" icon="play" />
        </View>

        {/* Disconnect */}
        <TouchableOpacity
          style={styles.wDisconnectBtn}
          onPress={handleDisconnect}
          activeOpacity={0.7}
        >
          <Icon name="close" size={14} color="#EF4444" />
          <Text style={styles.wDisconnectText}>Disconnect device</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const header = (
    <TouchableOpacity
      style={styles.accordionHeader}
      onPress={() => setDevicesExpanded(!devicesExpanded)}
    >
      <View style={styles.accordionHeaderLeft}>
        <Icon name="watch" size={24} color={isDarkMode ? 'rgba(255,255,255,0.7)' : colors.textMuted} />
        <Text style={styles.accordionTitle}>Connected Devices</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {connectedWatch && <View style={styles.wPulseDot} />}
        <Icon
          name={devicesExpanded ? 'chevron-down' : 'arrow-forward'}
          size={20}
          color={isDarkMode ? 'rgba(255,255,255,0.5)' : colors.textMuted}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.accordionCard}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={15} tint="dark" style={styles.accordionBlur}>
          {header}
          {devicesExpanded && <View style={styles.accordionContent}>{renderContent()}</View>}
        </BlurView>
      ) : (
        <View style={styles.accordionBlurAndroid}>
          {header}
          {devicesExpanded && <View style={styles.accordionContent}>{renderContent()}</View>}
        </View>
      )}
    </View>
  );
};

const ProfileScreen = () => {
  const { colors, isDarkMode } = useTheme();
  const { user, token, refreshUserDetails, triggerDataRefresh } = useAuth();
  const { stepCount } = useWalking();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [personalGoalExpanded, setPersonalGoalExpanded] = useState(false);
  const [accountSettingsExpanded, setAccountSettingsExpanded] = useState(false);
  const [personalInfoExpanded, setPersonalInfoExpanded] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [isSavingPersonalInfo, setIsSavingPersonalInfo] = useState(false);

  // Notification settings (5 toggles from the backend)
  const [notificationsExpanded, setNotificationsExpanded] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    daily_goal_reminder: true,
    achievement_notification: true,
    weekly_progress_report: true,
    tier_status_updates: true,
    community_challenges: true,
  });
  const [dailyStepGoal, setDailyStepGoal] = useState('8000');
  const [activityLevel, setActivityLevel] = useState('Intermediate');
  const [showActivityDropdown, setShowActivityDropdown] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [showStreakInfoModal, setShowStreakInfoModal] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.user_image || null);
  const [weeklyGoal, setWeeklyGoal] = useState('5');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [monthlySteps, setMonthlySteps] = useState({});
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  // Transaction history state
  const [transactionHistory, setTransactionHistory] = useState(null);
  const [transactionsByDate, setTransactionsByDate] = useState({});
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);
  const [showDayDetailsModal, setShowDayDetailsModal] = useState(false);
  const [selectedDayHourlyData, setSelectedDayHourlyData] = useState(Array(24).fill(0));
  const hourlyScrollRef = useRef(null);
  const mainScrollRef = useRef(null);

  // Historical goals state - maps date strings to goal values
  const [historicalGoals, setHistoricalGoals] = useState({});

  // Connected Devices / Wearable state
  const [devicesExpanded, setDevicesExpanded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [connectedWatch, setConnectedWatch] = useState(null);
  const [syncSteps, setSyncSteps] = useState(true);
  const [syncHeartRate, setSyncHeartRate] = useState(true);
  const [syncWalkControl, setSyncWalkControl] = useState(true);
  const activePairingCode = useRef(null);

  // Month navigation state
  const [viewingDate, setViewingDate] = useState(new Date());

  // Local daily step log
  const [dailyStepLog, setDailyStepLog] = useState({});

  // Per-day breakdown fetched from the server (survives reinstall).
  // Shape: { "2026-04-13": { steps, kilometre, kcal, litres } }
  const [apiMonthlyBreakdown, setApiMonthlyBreakdown] = useState({});

  // Tracks the in-flight hourly breakdown request so we can abort it if
  // the user taps another date before it finishes.
  const hourlyAbortRef = useRef(null);

  // Fetch the server's per-day breakdown for the month currently being
  // viewed. Replaces the @wern_daily_step_log local cache so the calendar
  // survives app reinstalls.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const month = String(viewingDate.getMonth() + 1).padStart(2, '0');
    const year = String(viewingDate.getFullYear());
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { apiFetch } = require('../../utils/apiClient');
    (async () => {
      try {
        const { json } = await apiFetch(
          `${API_URL}get-step-transection-list?token=${token}&filter=monthly&month=${month}&year=${year}`,
          { headers: { Accept: 'application/json' } }
        );
        if (cancelled) return;
        if (json?.status === true && Array.isArray(json?.data?.buckets)) {
          const map = {};
          json.data.buckets.forEach((b) => {
            if (!b?.date) return;
            const steps = Number(b.total_steps) || 0;
            map[b.date] = {
              steps,
              kilometre: Number(b.total_km) || 0,
              kcal: Number(b.total_kcal) || 0,
              // New endpoint doesn't return litres — derive locally (2.5L per 10k).
              litres: +(steps * 0.00025).toFixed(2),
            };
          });
          setApiMonthlyBreakdown(map);
        }
      } catch (e) {
        console.log('Monthly breakdown fetch failed:', e?.message);
      }
    })();
    return () => { cancelled = true; };
  }, [token, viewingDate]);

  // Load connected device & sync preferences from storage
  useEffect(() => {
    const loadDeviceState = async () => {
      try {
        const [watchData, syncPrefs] = await Promise.all([
          AsyncStorage.getItem('wern_connected_watch'),
          AsyncStorage.getItem('wern_sync_prefs'),
        ]);
        if (watchData) setConnectedWatch(JSON.parse(watchData));
        if (syncPrefs) {
          const prefs = JSON.parse(syncPrefs);
          setSyncSteps(prefs.syncSteps ?? true);
          setSyncHeartRate(prefs.syncHeartRate ?? true);
          setSyncWalkControl(prefs.syncWalkControl ?? true);
        }
      } catch (e) {
        console.log('[Devices] Failed to load state:', e);
      }
    };
    loadDeviceState();
  }, []);

  // Persist sync preferences when they change
  useEffect(() => {
    if (connectedWatch) {
      AsyncStorage.setItem('wern_sync_prefs', JSON.stringify({
        syncSteps, syncHeartRate, syncWalkControl,
      }));
    }
  }, [syncSteps, syncHeartRate, syncWalkControl, connectedWatch]);

  // Listen for watch pairing code and auto-connect
  useEffect(() => {
    let unsubscribe;
    try {
      const WearableService = require('../../services/WearableService').default;
      if (WearableService.isAvailable) {
        unsubscribe = WearableService.onWatchData((data) => {
          // Watch sent a pairing code - validate it
          if (data.pairingCode && activePairingCode.current) {
            const watchCode = data.pairingCode.replace(/\s/g, '');
            const phoneCode = activePairingCode.current.replace(/\s/g, '');
            if (watchCode === phoneCode) {
              // Codes match - auto connect the watch
              const watchInfo = {
                name: data.deviceName || 'Smartwatch',
                type: 'wearos',
                id: 'paired-' + watchCode,
                battery: data.battery || null,
                connectedAt: new Date().toISOString(),
              };
              setConnectedWatch(watchInfo);
              AsyncStorage.setItem('wern_connected_watch', JSON.stringify(watchInfo));
              showToast('Watch paired successfully!', 'success');
              // Send confirmation back
              WearableService.validatePairingCode(watchCode);
            }
          }
          // Watch sent step data during a walk
          if (data.source === 'watch' && data.stepCount) {
            // Steps from watch will be handled by WalkingContext
            console.log('[Devices] Watch steps:', data.stepCount);
          }
        });
      }
    } catch (_) {}
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Wearable handlers - real native module calls.
  // The native `connectedNodes` call returns almost instantly (it's a
  // cached lookup, not a live Bluetooth scan), so the spinner would flash
  // too briefly to read. We enforce a minimum 1.8s scan duration to give
  // clear visual feedback that something is happening.
  const handleScanForDevices = async () => {
    setIsScanning(true);
    setAvailableDevices([]);
    setHasScanned(false);

    const MIN_SCAN_MS = 1800;
    const startedAt = Date.now();
    let devices = [];
    try {
      const WearableService = require('../../services/WearableService').default;
      if (WearableService.isAvailable) {
        devices = (await WearableService.scanForDevices()) || [];
      }
    } catch (e) {
      console.log('[Devices] Scan error:', e);
    }

    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_SCAN_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_SCAN_MS - elapsed));
    }

    setAvailableDevices(devices);
    setIsScanning(false);
    setHasScanned(true);
  };

  const handleConnectDevice = async (device) => {
    try {
      const watchData = {
        ...device,
        battery: device.battery || null,
        connectedAt: new Date().toISOString(),
      };
      setConnectedWatch(watchData);
      setAvailableDevices([]);
      await AsyncStorage.setItem('wern_connected_watch', JSON.stringify(watchData));

      // Notify native module - establish connection and send initial state
      try {
        const WearableService = require('../../services/WearableService').default;
        if (WearableService.isAvailable) {
          await WearableService.connectDevice(device.id);
          WearableService.syncToWatch({ isWalking: false, activeCause: 1, dailyGoal: 10000 });
        }
      } catch (_) {}

      showToast(`${device.name} connected!`, 'success');
    } catch (e) {
      showToast('Failed to connect. Try again.', 'error');
    }
  };

  const handleDisconnect = async () => {
    try {
      const WearableService = require('../../services/WearableService').default;
      if (WearableService.isAvailable) {
        WearableService.syncToWatch({ disconnect: true });
        await WearableService.disconnectDevice();
      }
    } catch (_) {}

    setConnectedWatch(null);
    await AsyncStorage.removeItem('wern_connected_watch');
    await AsyncStorage.removeItem('wern_sync_prefs');
    setSyncSteps(true);
    setSyncHeartRate(true);
    setSyncWalkControl(true);
    showToast('Device disconnected', 'success');
  };

  const handleManualConnect = () => {
    // Manual connect is handled in the DevicesSection component via pairing code display
  };

  // Scroll to input when focused
  const scrollToInput = (yOffset) => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ y: yOffset, animated: true });
    }
  };

  const showToast = (message, type = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'error' });
  };

  // Get today's date string for storage key
  const getTodayDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Load historical goals from AsyncStorage
  const loadHistoricalGoals = useCallback(async () => {
    const userId = user?.id || user?.user_id;
    if (!userId) return;

    try {
      const goalsKey = `historicalGoals_${userId}`;
      const stored = await AsyncStorage.getItem(goalsKey);
      if (stored) {
        setHistoricalGoals(JSON.parse(stored));
      }
    } catch (error) {
      console.log('Error loading historical goals:', error.message);
    }
  }, [user]);

  // Save goal to AsyncStorage for a specific date
  const saveGoalForDate = useCallback(async (goal, dateString = null) => {
    const userId = user?.id || user?.user_id;
    if (!userId) return;

    try {
      const goalsKey = `historicalGoals_${userId}`;
      const stored = await AsyncStorage.getItem(goalsKey);
      const goals = stored ? JSON.parse(stored) : {};

      // Save goal for the specified date (or today if not specified)
      const date = dateString || getTodayDateString();
      goals[date] = parseInt(goal) || 8000;

      await AsyncStorage.setItem(goalsKey, JSON.stringify(goals));
      setHistoricalGoals(goals);
    } catch (error) {
      console.log('Error saving goal for date:', error.message);
    }
  }, [user]);

  // Load daily step log from local storage
  const loadDailyStepLog = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('@wern_daily_step_log');
      if (stored) {
        setDailyStepLog(JSON.parse(stored));
      }
    } catch (error) {
      console.log('Error loading daily step log:', error.message);
    }
  }, []);

  // Fetch step transaction history
  const fetchTransactionHistory = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}get-step-transection-history?token=${token}`);
      const data = await response.json();

      if (data.status === true && data.data) {
        setTransactionHistory(data.data);

        // Group transactions by date
        if (data.data.transactions) {
          const grouped = {};
          data.data.transactions.forEach((transaction) => {
            const date = transaction.is_date;
            if (!grouped[date]) {
              grouped[date] = {
                transactions: [],
                totalSteps: 0,
                totalKm: 0,
                totalKcal: 0,
              };
            }
            grouped[date].transactions.push(transaction);
            grouped[date].totalSteps += parseInt(transaction.steps) || 0;
            grouped[date].totalKm += parseFloat(transaction.kilometre) || 0;
            grouped[date].totalKcal += parseFloat(transaction.kcal) || 0;
          });
          setTransactionsByDate(grouped);
        }
      }
    } catch (error) {
      console.log('Error fetching transaction history:', error.message);
    }
  }, [token]);

  // Fetch all profile data from consolidated API
  const fetchProfileData = useCallback(async () => {
    if (!token) return;

    setIsLoadingProfile(true);
    try {
      const response = await fetch(`${API_URL}get-profile-data?token=${token}`);
      const data = await response.json();

      if (data.status === true && data.data) {
        // Extract goal data
        if (data.data.goal) {
          const fetchedGoal = String(data.data.goal.daily_step_goal || '8000');
          setDailyStepGoal(fetchedGoal);
          setActivityLevel(data.data.goal.activity_level || 'Intermediate');
          setWeeklyGoal(String(data.data.goal.weekly_goal || '5'));
        }

        // Extract monthly steps data
        if (data.data.monthly_steps && data.data.monthly_steps.daily_steps) {
          setMonthlySteps(data.data.monthly_steps.daily_steps);
        }
      }
    } catch (error) {
      console.log('Error fetching profile data:', error.message);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [token]);

  // Save user goals to API
  const saveUserGoals = async () => {
    if (!token) return;

    // Validate Daily Step Goal (minimum 1000)
    const stepGoalValue = parseInt(dailyStepGoal) || 0;
    if (stepGoalValue < 1000) {
      showToast('Daily Step Goal must be at least 1000 steps.');
      return;
    }

    // Validate Target Active Days (min 1, max 31)
    const activeDaysValue = parseInt(weeklyGoal) || 0;
    if (activeDaysValue < 1 || activeDaysValue > 31) {
      showToast('Target Active Days must be between 1 and 31.');
      return;
    }

    setIsSavingGoals(true);
    try {
      const response = await fetch(`${API_URL}save-user-goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          daily_step_goal: parseInt(dailyStepGoal) || 8000,
          activity_level: activityLevel,
          weekly_goal: parseInt(weeklyGoal) || 5,
        }),
      });

      const data = await response.json();

      if (data.status === true) {
        showToast('Goals saved successfully!', 'success');
        // Save goal to AsyncStorage for today's date (for historical tracking)
        await saveGoalForDate(dailyStepGoal);
        // Trigger data refresh so other screens (like WalkScreen) get updated goal
        triggerDataRefresh();
      } else {
        showToast(data.message || 'Failed to save goals.');
      }
    } catch (error) {
      console.log('Error saving user goals:', error.message);
      showToast('Failed to save goals. Please try again.');
    } finally {
      setIsSavingGoals(false);
    }
  };

  // Change password API
  const handleChangePassword = async () => {
    if (!token) return;

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New password and confirm password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch(`${API_URL}change-password-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          old_password: oldPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();

      if (data.status === true) {
        showToast('Password changed successfully!', 'success');
        // Clear password fields
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(data.message || 'Failed to change password.');
      }
    } catch (error) {
      console.log('Error changing password:', error.message);
      showToast('Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Fetch fresh profile data and user details on mount
  useEffect(() => {
    if (token) {
      fetchProfileData();
      fetchTransactionHistory();
      loadHistoricalGoals();
      loadDailyStepLog();
      // Refresh user details from API to get fresh data (not from local storage)
      refreshUserDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Save today's live steps to daily step log whenever stepCount changes
  useEffect(() => {
    if (stepCount > 0) {
      const today = new Date();
      const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const km = ((stepCount * 0.75) / 1000).toFixed(2);
      const kcalVal = Math.round(stepCount * 0.05);
      const goal = parseInt(dailyStepGoal) || 8000;

      // Throttle: only save if steps increased meaningfully
      AsyncStorage.getItem('@wern_daily_step_log').then(stored => {
        const log = stored ? JSON.parse(stored) : {};
        const existing = log[dateKey]?.steps || 0;
        if (stepCount > existing) {
          log[dateKey] = { steps: stepCount, km: parseFloat(km), kcal: kcalVal, goal };
          AsyncStorage.setItem('@wern_daily_step_log', JSON.stringify(log));
          setDailyStepLog(log);
        }
      }).catch(() => {});
    }
  }, [stepCount, dailyStepGoal]);

  // Keep personal info fields in sync with the auth user whenever
  // it refreshes (e.g. after a successful update or token refresh).
  useEffect(() => {
    setFullName(user?.full_name || '');
    setNickname(user?.nickname || '');
    setPhoneNumber(user?.phone_number || '');
  }, [user?.full_name, user?.nickname, user?.phone_number]);

  // Save personal info via the update-user-image endpoint
  // (backend was extended to accept full_name / nickname / phone_number
  // in the same multipart request).
  const savePersonalInfo = async () => {
    if (!token) return;

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      showToast('Name cannot be empty.', 'warning');
      return;
    }

    setIsSavingPersonalInfo(true);
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('full_name', trimmedName);
      formData.append('nickname', nickname.trim());
      formData.append('phone_number', phoneNumber.trim());

      const response = await fetch(`${API_URL}update-user-image`, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
      });
      const data = await response.json();

      if (data.status === true) {
        await refreshUserDetails();
        showToast('Profile updated successfully!', 'success');
        setPersonalInfoExpanded(false);
      } else {
        showToast(data.message || 'Failed to update profile.');
      }
    } catch (error) {
      console.log('Error saving personal info:', error.message);
      showToast('Failed to update profile. Please try again.');
    } finally {
      setIsSavingPersonalInfo(false);
    }
  };

  // Fetch notification settings once when the token becomes available.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}get-notification-settings?token=${token}`, {
          headers: { Accept: 'application/json' },
        });
        const json = await res.json();
        if (!cancelled && json?.status === true && json?.data) {
          setNotificationSettings({
            daily_goal_reminder: !!json.data.daily_goal_reminder,
            achievement_notification: !!json.data.achievement_notification,
            weekly_progress_report: !!json.data.weekly_progress_report,
            tier_status_updates: !!json.data.tier_status_updates,
            community_challenges: !!json.data.community_challenges,
          });
        }
      } catch (e) {
        console.log('Error fetching notification settings:', e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Flip a single toggle and send only that field to the server.
  const toggleNotificationSetting = async (key) => {
    if (!token) return;
    const nextValue = !notificationSettings[key];
    setNotificationSettings((prev) => ({ ...prev, [key]: nextValue }));
    try {
      const fd = new FormData();
      fd.append('token', token);
      fd.append(key, nextValue ? '1' : '0');
      const res = await fetch(`${API_URL}update-notification-settings`, {
        method: 'POST',
        body: fd,
        headers: { Accept: 'application/json' },
      });
      const json = await res.json();
      if (json?.status !== true) {
        // Revert on server failure
        setNotificationSettings((prev) => ({ ...prev, [key]: !nextValue }));
        showToast(json?.message || 'Failed to update notification settings.');
      }
    } catch (e) {
      setNotificationSettings((prev) => ({ ...prev, [key]: !nextValue }));
      showToast('Network error. Please try again.');
    }
  };

  // Upload image to API
  const uploadUserImage = async (imageAsset) => {
    console.log('uploadUserImage called');
    if (!token || !imageAsset?.uri) {
      console.log('Missing token or uri');
      return;
    }

    setIsUploadingImage(true);
    try {
      const fileUri = imageAsset.uri;
      const filename = fileUri.split('/').pop() || `profile_${Date.now()}.jpg`;
      const mimeType = imageAsset.mimeType || 'image/jpeg';

      // Create FormData
      const formData = new FormData();
      formData.append('token', token);
      formData.append('user_image', {
        uri: fileUri,
        name: filename,
        type: mimeType,
      });

      console.log('Calling API:', `${API_URL}update-user-image`);

      // Use AbortController for timeout (60 seconds for large images)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${API_URL}update-user-image`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      console.log('API response:', JSON.stringify(data));

      if (data.status === true) {
        setProfileImage(fileUri);
        await refreshUserDetails();
        showToast('Profile picture updated successfully!', 'success');
      } else {
        showToast(data.message || 'Failed to update profile picture.');
      }
    } catch (error) {
      console.log('Error uploading image:', error.message);
      showToast('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const pickImageFromGallery = async () => {
    console.log('pickImageFromGallery called');
    setShowImagePickerModal(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Media library permission status:', status);
      if (status !== 'granted') {
        showToast('We need camera roll permissions to change your profile picture.', 'warning');
        return;
      }

      console.log('Launching image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Reduced quality for faster upload
      });

      console.log('Image picker result:', JSON.stringify(result));
      if (!result.canceled && result.assets[0]) {
        console.log('Selected image asset:', JSON.stringify(result.assets[0]));
        // Upload the selected image to API (pass full asset for mimeType)
        await uploadUserImage(result.assets[0]);
      } else {
        console.log('Image selection canceled or no asset');
      }
    } catch (error) {
      console.log('Error in pickImageFromGallery:', error.message);
      showToast('Error selecting image: ' + error.message);
    }
  };

  const takePhoto = async () => {
    console.log('takePhoto called');
    setShowImagePickerModal(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);
      if (status !== 'granted') {
        showToast('We need camera permissions to take a photo.', 'warning');
        return;
      }

      console.log('Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Reduced quality for faster upload
      });

      console.log('Camera result:', JSON.stringify(result));
      if (!result.canceled && result.assets[0]) {
        console.log('Captured image asset:', JSON.stringify(result.assets[0]));
        // Upload the photo to API (pass full asset for mimeType)
        await uploadUserImage(result.assets[0]);
      } else {
        console.log('Camera canceled or no asset');
      }
    } catch (error) {
      console.log('Error in takePhoto:', error.message);
      showToast('Error taking photo: ' + error.message);
    }
  };

  // Generate calendar data from local daily step log (with API fallback)
  const calendarData = useMemo(() => {
    const today = new Date();
    const viewYear = viewingDate.getFullYear();
    const viewMonth = viewingDate.getMonth();
    const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
    const currentDay = today.getDate();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const currentGoal = parseInt(dailyStepGoal) || 8000;

    const data = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Priority: server monthly breakdown → server monthlySteps → local cache.
      // For today we additionally merge in the live stepCount so the UI stays
      // responsive between server syncs. This ordering means the calendar
      // survives app reinstalls (server is the source of truth).
      const apiEntry = apiMonthlyBreakdown[dateKey];
      const localEntry = dailyStepLog[dateKey];
      const isToday = isCurrentMonth && day === currentDay;
      const apiSteps = apiEntry?.steps || 0;
      const serverOrLocalSteps = apiSteps || monthlySteps[dateKey] || localEntry?.steps || 0;
      const steps = isToday
        ? Math.max(stepCount, serverOrLocalSteps)
        : serverOrLocalSteps;

      // Use goal from local log, then historical goals, then current goal
      const goalSteps = localEntry?.goal || historicalGoals[dateKey] || currentGoal;

      let status;
      if (isCurrentMonth && day > currentDay) {
        status = 'upcoming';
      } else if (isCurrentMonth && day === currentDay) {
        status = steps >= goalSteps ? 'completed' : 'current';
      } else if (!isCurrentMonth && viewYear > today.getFullYear()) {
        status = 'upcoming';
      } else if (!isCurrentMonth && viewYear === today.getFullYear() && viewMonth > today.getMonth()) {
        status = 'upcoming';
      } else if (steps >= goalSteps) {
        status = 'completed';
      } else if (steps > 0) {
        status = 'missed';
      } else {
        // No data at all for past days
        status = 'missed';
      }

      data.push({ day, status, steps, goalSteps });
    }
    return data;
  }, [monthlySteps, dailyStepGoal, historicalGoals, dailyStepLog, apiMonthlyBreakdown, viewingDate, stepCount]);

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const renderStatusIcon = (status) => {
    if (status === 'completed') {
      return (
        <View style={[styles.statusIcon, styles.completedIcon]}>
          <Icon name="checkmark" size={14} color="#FFFFFF" />
        </View>
      );
    } else if (status === 'current') {
      return (
        <View style={[styles.statusIcon, styles.currentIcon]}>
          <Icon name="footsteps" size={12} color="#FFFFFF" />
        </View>
      );
    } else if (status === 'missed') {
      return (
        <View style={[styles.statusIcon, styles.missedIcon]}>
          <Icon name="close" size={14} color="#FFFFFF" />
        </View>
      );
    } else {
      return (
        <View style={[styles.statusIcon, styles.upcomingIcon]}>
          <Icon
            name="lock"
            size={12}
            color={isDarkMode ? 'rgba(255,255,255,0.5)' : colors.textMuted}
          />
        </View>
      );
    }
  };

  // Get viewing month name (short and long)
  const viewingMonthShort = useMemo(() => {
    return viewingDate.toLocaleDateString('en-US', { month: 'short' });
  }, [viewingDate]);

  const viewingMonthLong = useMemo(() => {
    return viewingDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [viewingDate]);

  const isCurrentMonth = useMemo(() => {
    const today = new Date();
    return viewingDate.getFullYear() === today.getFullYear() && viewingDate.getMonth() === today.getMonth();
  }, [viewingDate]);

  // Calculate streak count (consecutive completed days ending at today or last day of viewing month)
  const streakCount = useMemo(() => {
    const today = new Date();
    let lastDay;
    if (isCurrentMonth) {
      lastDay = today.getDate();
    } else {
      lastDay = new Date(viewingDate.getFullYear(), viewingDate.getMonth() + 1, 0).getDate();
    }
    let streak = 0;

    // Count from last relevant day backwards
    for (let i = lastDay - 1; i >= 0; i--) {
      const dayData = calendarData[i];
      if (dayData && dayData.status === 'completed') {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [calendarData, isCurrentMonth, viewingDate]);

  // Month navigation handlers
  const goToPreviousMonth = () => {
    setViewingDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    const today = new Date();
    const next = new Date(viewingDate.getFullYear(), viewingDate.getMonth() + 1, 1);
    // Don't go beyond current month
    if (next.getFullYear() < today.getFullYear() ||
        (next.getFullYear() === today.getFullYear() && next.getMonth() <= today.getMonth())) {
      setViewingDate(next);
    }
  };

  // Handle date click for details
  const handleDateClick = (day) => {
    if (!day || day.status === 'upcoming') return;

    const dateKey = `${viewingDate.getFullYear()}-${String(viewingDate.getMonth() + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
    const dayData = transactionsByDate[dateKey];

    // Seed with whatever we can derive locally from transactions (shown
    // immediately while the API response loads).
    const hourlySteps = Array(24).fill(0);
    if (dayData?.transactions) {
      dayData.transactions.forEach((transaction) => {
        if (transaction.event_time) {
          const eventDate = new Date(transaction.event_time);
          const hour = eventDate.getHours();
          hourlySteps[hour] += parseInt(transaction.steps) || 0;
        }
      });
    }
    setSelectedDayHourlyData(hourlySteps);

    // Fetch authoritative per-hour breakdown from the server. The response
    // returns `breakdown[]` with entries like:
    //   { "hour": "2025-12-19 13:00", "steps": 370, ... }
    if (token) {
      // Abort any earlier in-flight hourly request so rapid date taps
      // don't cause an older response to overwrite a newer one.
      if (hourlyAbortRef.current) hourlyAbortRef.current.abort();
      const controller = new AbortController();
      hourlyAbortRef.current = controller;

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { apiFetch } = require('../../utils/apiClient');
      apiFetch(
        `${API_URL}get-step-transection-list?token=${token}&filter=hourly&date=${dateKey}`,
        { headers: { Accept: 'application/json' }, signal: controller.signal }
      )
        .then(({ json }) => {
          if (json?.status !== true || !json?.data) return;
          const hours = Array(24).fill(0);

          if (Array.isArray(json.data.buckets)) {
            json.data.buckets.forEach((b) => {
              const h = Number(b?.hour);
              if (Number.isFinite(h) && h >= 0 && h < 24) {
                hours[h] = Number(b?.total_steps) || 0;
              }
            });
          }

          setSelectedDayHourlyData(hours);

          // Only auto-scroll if there's actually activity that day.
          const maxSteps = Math.max(...hours);
          if (maxSteps > 0 && hourlyScrollRef.current) {
            const peak = hours.indexOf(maxSteps);
            const scrollPosition = Math.max(0, peak * 32 - 80);
            hourlyScrollRef.current?.scrollTo({ x: scrollPosition, animated: true });
          }
        })
        .catch((e) => {
          if (e?.name !== 'AbortError') {
            console.log('Hourly breakdown fetch failed:', e?.message);
          }
        });
    }

    // For today, calculate km/kcal from live steps
    const today = new Date();
    const isTodayDate = isCurrentMonth && day.day === today.getDate();
    const liveSteps = day.steps;
    const liveKm = (liveSteps * 0.75) / 1000;
    const liveKcal = Math.round(liveSteps * 0.05);

    setSelectedDayDetails({
      date: dateKey,
      day: day.day,
      month: viewingDate.toLocaleDateString('en-US', { month: 'long' }),
      year: viewingDate.getFullYear(),
      status: day.status,
      steps: liveSteps,
      goalSteps: day.goalSteps,
      totalSteps: isTodayDate ? liveSteps : (dayData?.totalSteps || liveSteps),
      totalKm: isTodayDate ? liveKm : (dayData?.totalKm || liveKm),
      totalKcal: isTodayDate ? liveKcal : (dayData?.totalKcal || liveKcal),
      transactions: dayData?.transactions,
    });
    setShowDayDetailsModal(true);

    // Auto-scroll to hour with most steps after modal opens
    setTimeout(() => {
      const maxStepsHour = hourlySteps.indexOf(Math.max(...hourlySteps));
      if (maxStepsHour >= 0 && hourlyScrollRef.current) {
        const scrollPosition = Math.max(0, (maxStepsHour * 32) - 80);
        hourlyScrollRef.current?.scrollTo({ x: scrollPosition, animated: true });
      }
    }, 300);
  };

  // Get cause name by ID
  const getCauseName = (categoryId) => {
    const causes = {
      1: 'Forest Restoration',
      2: 'Clean Water',
      3: 'Food Security',
      4: "Women's Empowerment",
      5: 'Kids Walk for Labubu',
    };
    return causes[categoryId] || 'Walking';
  };

  // Format time from event_time
  const formatTime = (eventTime) => {
    if (!eventTime) return '';
    const date = new Date(eventTime);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Group calendar into weeks (starting from Sunday)
  const getCalendarWeeks = () => {
    const weeks = [];
    let currentWeek = [];

    // Calculate the start day of the viewing month (0 = Sunday, 6 = Saturday)
    const firstDayOfMonth = new Date(viewingDate.getFullYear(), viewingDate.getMonth(), 1);
    const startDay = firstDayOfMonth.getDay();

    // Add empty cells for days before the 1st
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null);
    }

    calendarData.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    // Fill remaining days in last week
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
    >
      <ScrollView
        ref={mainScrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            <Image
              source={profileImage ? { uri: profileImage } : require('../../../assest/img/no-img.gif')}
              style={styles.avatar}
            />
            {isUploadingImage && (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => setShowImagePickerModal(true)}
              disabled={isUploadingImage}
            >
              <Icon name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* User Info */}
        <Text style={styles.userName}>
          {user?.full_name || 'User'}
          {user?.nickname ? ` (${user.nickname})` : ''}
        </Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
        {user?.phone_number ? (
          <Text style={styles.userEmail}>{user.phone_number}</Text>
        ) : null}

        {/* Tier Card */}
        <View style={styles.tierCard}>
          <LinearGradient
            colors={['rgba(205, 127, 50, 0.8)', 'rgba(139, 90, 43, 0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tierGradient}
          >
            <View style={styles.tierContent}>
              <View style={styles.tierLeft}>
                <Text style={styles.tierLabel}>{user?.tier_details?.current_tier?.replace(' Tier', '') || 'Bronze'}</Text>
                <Text style={styles.tierTitle}>Tier</Text>
                <Image
                  source={require('../../../assest/img/bronze-tier.webp')}
                  style={styles.tierBadge}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.tierRight}>
                <View style={styles.tierProgressHeader}>
                  <Text style={styles.tierProgressLabel}>{user?.tier_details?.current_tier?.replace(' Tier', '') || 'Bronze'}</Text>
                  <Text style={styles.tierProgressValue}>
                    {user?.tier_details?.total_earn_points || 0}/{(user?.tier_details?.total_earn_points || 0) + (user?.tier_details?.points_needed_for_next_tier || 1000)}
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${Math.min(100, ((user?.tier_details?.total_earn_points || 0) / ((user?.tier_details?.total_earn_points || 0) + (user?.tier_details?.points_needed_for_next_tier || 1000))) * 100)}%` }]} />
                </View>
                <Text style={styles.tierTimeRemaining}>Points: {user?.tier_details?.total_earn_points?.toLocaleString() || 0}</Text>
                <Text style={styles.tierDescription}>
                  Earn {user?.tier_details?.points_needed_for_next_tier?.toLocaleString() || '1,000'} more points to reach {user?.tier_details?.next_tier || 'Silver Tier'}.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Walking Streak */}
        <View style={styles.streakCard}>
          <BlurView intensity={15} tint="dark" style={styles.streakBlur}>
            <View style={styles.streakHeader}>
              <View style={styles.streakLeft}>
                <View style={styles.flameContainer}>
                  <Icon name="flame" size={24} color="#f97316" />
                </View>
                <View style={styles.streakTextContainer}>
                  <Text style={styles.streakNumber}>{streakCount}</Text>
                  <Text style={styles.streakLabel}> Your {viewingMonthShort} walking streak</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.helpButton}
                onPress={() => setShowStreakInfoModal(true)}
              >
                <Icon
                  name="information-circle"
                  size={24}
                  color={isDarkMode ? 'rgba(255,255,255,0.4)' : colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Monthly Totals Summary - calculated from local data + API + live steps */}
            {(() => {
              const today = new Date();
              const viewYear = viewingDate.getFullYear();
              const viewMonth = viewingDate.getMonth();
              const isCurrMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
              let totalSteps = 0;
              let totalKm = 0;
              let totalKcal = 0;
              const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
              for (let d = 1; d <= daysInMonth; d++) {
                const dk = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isToday = isCurrMonth && d === today.getDate();
                const apiEntry = apiMonthlyBreakdown[dk];
                const localEntry = dailyStepLog[dk];

                if (isToday) {
                  // Live stepCount takes over for today (responsive updates).
                  const daySteps = Math.max(
                    stepCount,
                    apiEntry?.steps || 0,
                    localEntry?.steps || 0,
                    monthlySteps[dk] || 0
                  );
                  totalSteps += daySteps;
                  totalKm += (daySteps * 0.75) / 1000;
                  totalKcal += Math.round(daySteps * 0.05);
                } else if (apiEntry) {
                  // Server breakdown is the source of truth for past days.
                  totalSteps += apiEntry.steps || 0;
                  totalKm += apiEntry.kilometre || 0;
                  totalKcal += apiEntry.kcal || 0;
                } else if (localEntry) {
                  totalSteps += localEntry.steps || 0;
                  totalKm += parseFloat(localEntry.km) || 0;
                  totalKcal += localEntry.kcal || 0;
                } else if (monthlySteps[dk]) {
                  const s = monthlySteps[dk];
                  totalSteps += s;
                  totalKm += (s * 0.75) / 1000;
                  totalKcal += Math.round(s * 0.05);
                }
              }
              return (
                <View style={styles.totalsSummary}>
                  <View style={styles.totalItem}>
                    <Icon name="footsteps" size={18} color="#22c55e" />
                    <Text style={styles.totalValue}>{formatNumber(totalSteps)}</Text>
                    <Text style={styles.totalLabel}>Total Steps</Text>
                  </View>
                  <View style={styles.totalDivider} />
                  <View style={styles.totalItem}>
                    <Icon name="walk" size={18} color="#3b82f6" />
                    <Text style={styles.totalValue}>{totalKm.toFixed(2)}</Text>
                    <Text style={styles.totalLabel}>Total Km</Text>
                  </View>
                  <View style={styles.totalDivider} />
                  <View style={styles.totalItem}>
                    <Icon name="flame" size={18} color="#f97316" />
                    <Text style={styles.totalValue}>{formatNumber(totalKcal)}</Text>
                    <Text style={styles.totalLabel}>Total Kcal</Text>
                  </View>
                </View>
              );
            })()}

            {/* Month Navigation */}
            <View style={styles.monthNavigation}>
              <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthNavButton}>
                <Icon name="arrow-back" size={22} color={isDarkMode ? '#FFFFFF' : colors.textWhite} />
              </TouchableOpacity>
              <Text style={styles.monthNavTitle}>{viewingMonthLong}</Text>
              <TouchableOpacity
                onPress={goToNextMonth}
                style={[styles.monthNavButton, isCurrentMonth && styles.monthNavButtonDisabled]}
                disabled={isCurrentMonth}
              >
                <Icon name="arrow-forward" size={22} color={isCurrentMonth ? 'rgba(255,255,255,0.2)' : (isDarkMode ? '#FFFFFF' : colors.textWhite)} />
              </TouchableOpacity>
            </View>

            {/* Calendar */}
            <View style={styles.calendar}>
              {/* Week days header */}
              <View style={styles.weekDaysRow}>
                {weekDays.map((day, index) => (
                  <Text key={index} style={styles.weekDayLabel}>{day}</Text>
                ))}
              </View>

              {/* Calendar grid - now clickable */}
              {getCalendarWeeks().map((week, weekIndex) => (
                <View key={weekIndex} style={styles.calendarRow}>
                  {week.map((day, dayIndex) => (
                    <TouchableOpacity
                      key={dayIndex}
                      style={styles.calendarCell}
                      onPress={() => handleDateClick(day)}
                      disabled={!day || day.status === 'upcoming'}
                      activeOpacity={0.7}
                    >
                      {day ? (
                        <>
                          {renderStatusIcon(day.status)}
                          <Text style={styles.calendarDay}>{day.day.toString().padStart(2, '0')}</Text>
                        </>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            {/* Tap hint */}
            <Text style={styles.tapHint}>Tap on a date to view details</Text>

            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.statusIcon, styles.completedIcon, styles.legendIcon]}>
                  <Icon name="checkmark" size={12} color="#FFFFFF" />
                </View>
                <Text style={styles.legendText}>Completed</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.statusIcon, styles.currentIcon, styles.legendIcon]}>
                  <Icon name="footsteps" size={10} color="#FFFFFF" />
                </View>
                <Text style={styles.legendText}>Today</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.statusIcon, styles.missedIcon, styles.legendIcon]}>
                  <Icon name="close" size={12} color="#FFFFFF" />
                </View>
                <Text style={styles.legendText}>Missed</Text>
              </View>
            </View>
          </BlurView>
        </View>

        {/* Personal Information Accordion */}
        {(() => {
          const renderPersonalInfoContent = () => (
            <View style={styles.accordionContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your name"
                  placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(17,17,17,0.4)'}
                  onFocus={() => scrollToInput(600)}
                  returnKeyType="next"
                  maxLength={60}
                  editable={true}
                  underlineColorAndroid="transparent"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nickname <Text style={styles.inputHint}>(optional)</Text></Text>
                <TextInput
                  style={styles.input}
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder="Enter a nickname"
                  placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(17,17,17,0.4)'}
                  onFocus={() => scrollToInput(650)}
                  returnKeyType="next"
                  maxLength={40}
                  editable={true}
                  underlineColorAndroid="transparent"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number <Text style={styles.inputHint}>(optional)</Text></Text>
                <TextInput
                  style={styles.input}
                  value={phoneNumber}
                  onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9+\-\s]/g, ''))}
                  placeholder="e.g. +1 555 123 4567"
                  placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(17,17,17,0.4)'}
                  keyboardType="phone-pad"
                  onFocus={() => scrollToInput(700)}
                  returnKeyType="done"
                  maxLength={20}
                  editable={true}
                  underlineColorAndroid="transparent"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, isSavingPersonalInfo && styles.saveButtonDisabled]}
                onPress={savePersonalInfo}
                disabled={isSavingPersonalInfo}
              >
                {isSavingPersonalInfo ? (
                  <ActivityIndicator size="small" color="#1a1a1a" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          );

          const header = (
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setPersonalInfoExpanded(!personalInfoExpanded)}
            >
              <View style={styles.accordionHeaderLeft}>
                <Icon
                  name="person"
                  size={24}
                  color={isDarkMode ? 'rgba(255,255,255,0.7)' : colors.textMuted}
                />
                <Text style={styles.accordionTitle}>Personal Information</Text>
              </View>
              <Icon
                name={personalInfoExpanded ? 'chevron-down' : 'arrow-forward'}
                size={20}
                color={isDarkMode ? 'rgba(255,255,255,0.5)' : colors.textMuted}
              />
            </TouchableOpacity>
          );

          return (
            <View style={styles.accordionCard}>
              {Platform.OS === 'ios' ? (
                <BlurView intensity={15} tint="dark" style={styles.accordionBlur}>
                  {header}
                  {personalInfoExpanded && renderPersonalInfoContent()}
                </BlurView>
              ) : (
                <View style={styles.accordionBlurAndroid}>
                  {header}
                  {personalInfoExpanded && renderPersonalInfoContent()}
                </View>
              )}
            </View>
          );
        })()}

        {/* Notification Settings Accordion */}
        {(() => {
          const rows = [
            { key: 'daily_goal_reminder', label: 'Daily Goal Reminders' },
            { key: 'achievement_notification', label: 'Achievement Notifications' },
            { key: 'weekly_progress_report', label: 'Weekly Progress Report' },
            { key: 'tier_status_updates', label: 'Tier Status Updates' },
            { key: 'community_challenges', label: 'Community Challenges' },
          ];

          const renderNotificationContent = () => (
            <View style={styles.accordionContent}>
              {rows.map((row) => (
                <View key={row.key} style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>{row.label}</Text>
                  <Switch
                    value={!!notificationSettings[row.key]}
                    onValueChange={() => toggleNotificationSetting(row.key)}
                    trackColor={{
                      false: isDarkMode ? 'rgba(255,255,255,0.2)' : '#D1D5DB',
                      true: colors.accent,
                    }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              ))}
            </View>
          );

          const header = (
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setNotificationsExpanded(!notificationsExpanded)}
            >
              <View style={styles.accordionHeaderLeft}>
                <Icon
                  name="notifications"
                  size={24}
                  color={isDarkMode ? 'rgba(255,255,255,0.7)' : colors.textMuted}
                />
                <Text style={styles.accordionTitle}>Notifications</Text>
              </View>
              <Icon
                name={notificationsExpanded ? 'chevron-down' : 'arrow-forward'}
                size={20}
                color={isDarkMode ? 'rgba(255,255,255,0.5)' : colors.textMuted}
              />
            </TouchableOpacity>
          );

          return (
            <View style={styles.accordionCard}>
              {Platform.OS === 'ios' ? (
                <BlurView intensity={15} tint="dark" style={styles.accordionBlur}>
                  {header}
                  {notificationsExpanded && renderNotificationContent()}
                </BlurView>
              ) : (
                <View style={styles.accordionBlurAndroid}>
                  {header}
                  {notificationsExpanded && renderNotificationContent()}
                </View>
              )}
            </View>
          );
        })()}

        {/* Personal Goal Accordion */}
        <View style={styles.accordionCard}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={15} tint="dark" style={styles.accordionBlur}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setPersonalGoalExpanded(!personalGoalExpanded)}
              >
                <View style={styles.accordionHeaderLeft}>
                  <Icon
                    name="navigate"
                    size={24}
                    color={isDarkMode ? 'rgba(255,255,255,0.7)' : colors.textMuted}
                  />
                  <Text style={styles.accordionTitle}>Personal Goal</Text>
                </View>
                <Icon
                  name={personalGoalExpanded ? 'chevron-down' : 'arrow-forward'}
                  size={20}
                  color={isDarkMode ? 'rgba(255,255,255,0.5)' : colors.textMuted}
                />
              </TouchableOpacity>

              {personalGoalExpanded && (
                <View style={styles.accordionContent}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Daily Step Goal <Text style={styles.inputHint}>(min: 1000)</Text></Text>
                    <TextInput
                      style={styles.input}
                      value={dailyStepGoal}
                      onChangeText={(text) => setDailyStepGoal(text.replace(/[^0-9]/g, ''))}
                      placeholder="8000"
                      placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(17,17,17,0.4)'}
                      keyboardType="numeric"
                      onFocus={() => scrollToInput(700)}
                      returnKeyType="done"
                      maxLength={6}
                      editable={true}
                      selectTextOnFocus={true}
                      underlineColorAndroid="transparent"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Activity Level</Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setShowActivityDropdown(true)}
                    >
                      <Text style={styles.dropdownButtonText}>{activityLevel}</Text>
                      <Icon
                        name="chevron-down"
                        size={20}
                        color={isDarkMode ? 'rgba(255,255,255,0.7)' : colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Target Active Days <Text style={styles.inputHint}>(1-31)</Text></Text>
                    <TextInput
                      style={styles.input}
                      value={weeklyGoal}
                      onChangeText={(text) => setWeeklyGoal(text.replace(/[^0-9]/g, ''))}
                      placeholder="5"
                      placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(17,17,17,0.4)'}
                      keyboardType="numeric"
                      onFocus={() => scrollToInput(800)}
                      returnKeyType="done"
                      maxLength={2}
                      editable={true}
                      selectTextOnFocus={true}
                      underlineColorAndroid="transparent"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.saveButton, isSavingGoals && styles.saveButtonDisabled]}
                    onPress={saveUserGoals}
                    disabled={isSavingGoals}
                  >
                    {isSavingGoals ? (
                      <ActivityIndicator size="small" color="#1a1a1a" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Goals</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </BlurView>
          ) : (
            <View style={styles.accordionBlurAndroid}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setPersonalGoalExpanded(!personalGoalExpanded)}
              >
                <View style={styles.accordionHeaderLeft}>
                  <Icon
                    name="navigate"
                    size={24}
                    color={isDarkMode ? 'rgba(255,255,255,0.7)' : colors.textMuted}
                  />
                  <Text style={styles.accordionTitle}>Personal Goal</Text>
                </View>
                <Icon
                  name={personalGoalExpanded ? 'chevron-down' : 'arrow-forward'}
                  size={20}
                  color={isDarkMode ? 'rgba(255,255,255,0.5)' : colors.textMuted}
                />
              </TouchableOpacity>

              {personalGoalExpanded && (
                <View style={styles.accordionContent}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Daily Step Goal <Text style={styles.inputHint}>(min: 1000)</Text></Text>
                    <TextInput
                      style={styles.input}
                      value={dailyStepGoal}
                      onChangeText={(text) => setDailyStepGoal(text.replace(/[^0-9]/g, ''))}
                      placeholder="8000"
                      placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(17,17,17,0.4)'}
                      keyboardType="numeric"
                      onFocus={() => scrollToInput(700)}
                      returnKeyType="done"
                      maxLength={6}
                      editable={true}
                      selectTextOnFocus={true}
                      underlineColorAndroid="transparent"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Activity Level</Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setShowActivityDropdown(true)}
                    >
                      <Text style={styles.dropdownButtonText}>{activityLevel}</Text>
                      <Icon
                        name="chevron-down"
                        size={20}
                        color={isDarkMode ? 'rgba(255,255,255,0.7)' : colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Target Active Days <Text style={styles.inputHint}>(1-31)</Text></Text>
                    <TextInput
                      style={styles.input}
                      value={weeklyGoal}
                      onChangeText={(text) => setWeeklyGoal(text.replace(/[^0-9]/g, ''))}
                      placeholder="5"
                      placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(17,17,17,0.4)'}
                      keyboardType="numeric"
                      onFocus={() => scrollToInput(800)}
                      returnKeyType="done"
                      maxLength={2}
                      editable={true}
                      selectTextOnFocus={true}
                      underlineColorAndroid="transparent"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.saveButton, isSavingGoals && styles.saveButtonDisabled]}
                    onPress={saveUserGoals}
                    disabled={isSavingGoals}
                  >
                    {isSavingGoals ? (
                      <ActivityIndicator size="small" color="#1a1a1a" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Goals</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Account Settings Accordion */}
        <View style={styles.accordionCard}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={15} tint="dark" style={styles.accordionBlur}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setAccountSettingsExpanded(!accountSettingsExpanded)}
              >
                <View style={styles.accordionHeaderLeft}>
                  <Icon
                    name="settings"
                    size={24}
                    color={isDarkMode ? 'rgba(255,255,255,0.7)' : colors.textMuted}
                  />
                  <Text style={styles.accordionTitle}>Account Settings</Text>
                </View>
                <Icon
                  name={accountSettingsExpanded ? 'chevron-down' : 'arrow-forward'}
                  size={20}
                  color={isDarkMode ? 'rgba(255,255,255,0.5)' : colors.textMuted}
                />
              </TouchableOpacity>

              {accountSettingsExpanded && (
                <View style={styles.accordionContent}>
                  <Text style={styles.sectionLabel}>Change Password</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Old Password</Text>
                    <TextInput
                      style={styles.input}
                      value={oldPassword}
                      onChangeText={setOldPassword}
                      placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(17,17,17,0.4)'}
                      secureTextEntry
                      onFocus={() => scrollToInput(900)}
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(17,17,17,0.4)'}
                      secureTextEntry
                      onFocus={() => scrollToInput(1000)}
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Confirm Password</Text>
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(17,17,17,0.4)'}
                      secureTextEntry
                      onFocus={() => scrollToInput(1100)}
                      returnKeyType="done"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.saveButton, isChangingPassword && styles.saveButtonDisabled]}
                    onPress={handleChangePassword}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <ActivityIndicator size="small" color="#1a1a1a" />
                    ) : (
                      <Text style={styles.saveButtonText}>Change Password</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </BlurView>
          ) : (
            <View style={styles.accordionBlurAndroid}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setAccountSettingsExpanded(!accountSettingsExpanded)}
              >
                <View style={styles.accordionHeaderLeft}>
                  <Icon
                    name="settings"
                    size={24}
                    color={isDarkMode ? 'rgba(255,255,255,0.7)' : colors.textMuted}
                  />
                  <Text style={styles.accordionTitle}>Account Settings</Text>
                </View>
                <Icon
                  name={accountSettingsExpanded ? 'chevron-down' : 'arrow-forward'}
                  size={20}
                  color={isDarkMode ? 'rgba(255,255,255,0.5)' : colors.textMuted}
                />
              </TouchableOpacity>

              {accountSettingsExpanded && (
                <View style={styles.accordionContent}>
                  <Text style={styles.sectionLabel}>Change Password</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Old Password</Text>
                    <TextInput
                      style={styles.input}
                      value={oldPassword}
                      onChangeText={setOldPassword}
                      placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(17,17,17,0.4)'}
                      secureTextEntry
                      onFocus={() => scrollToInput(900)}
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(17,17,17,0.4)'}
                      secureTextEntry
                      onFocus={() => scrollToInput(1000)}
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Confirm Password</Text>
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(17,17,17,0.4)'}
                      secureTextEntry
                      onFocus={() => scrollToInput(1100)}
                      returnKeyType="done"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.saveButton, isChangingPassword && styles.saveButtonDisabled]}
                    onPress={handleChangePassword}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <ActivityIndicator size="small" color="#1a1a1a" />
                    ) : (
                      <Text style={styles.saveButtonText}>Change Password</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Connected Devices / Wearable Section */}
        <DevicesSection
          styles={styles}
          isDarkMode={isDarkMode}
          colors={colors}
          devicesExpanded={devicesExpanded}
          setDevicesExpanded={setDevicesExpanded}
          connectedWatch={connectedWatch}
          isScanning={isScanning}
          availableDevices={availableDevices}
          hasScanned={hasScanned}
          syncSteps={syncSteps}
          setSyncSteps={setSyncSteps}
          syncHeartRate={syncHeartRate}
          setSyncHeartRate={setSyncHeartRate}
          syncWalkControl={syncWalkControl}
          setSyncWalkControl={setSyncWalkControl}
          handleScanForDevices={handleScanForDevices}
          handleConnectDevice={handleConnectDevice}
          handleDisconnect={handleDisconnect}
          handleManualConnect={handleManualConnect}
          onCodeGenerated={(code) => { activePairingCode.current = code; }}
        />

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Activity Level Dropdown Modal */}
      <Modal
        visible={showActivityDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActivityDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowActivityDropdown(false)}
        >
          <View style={styles.dropdownModal}>
            {activityLevels.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.dropdownOption,
                  activityLevel === level && styles.dropdownOptionSelected,
                ]}
                onPress={() => {
                  setActivityLevel(level);
                  setShowActivityDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    activityLevel === level && styles.dropdownOptionTextSelected,
                  ]}
                >
                  {level}
                </Text>
                {activityLevel === level && (
                  <Icon name="checkmark" size={18} color="#f5c842" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowImagePickerModal(false)}
        >
          <View style={styles.imagePickerModal}>
            <Text style={styles.imagePickerTitle}>Change Profile Photo</Text>

            <TouchableOpacity style={styles.imagePickerOption} onPress={takePhoto}>
              <Icon name="camera" size={24} color={colors.textWhite} />
              <Text style={styles.imagePickerOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.imagePickerOption} onPress={pickImageFromGallery}>
              <Icon name="image" size={24} color={colors.textWhite} />
              <Text style={styles.imagePickerOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.imagePickerCancel}
              onPress={() => setShowImagePickerModal(false)}
            >
              <Text style={styles.imagePickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Streak Info Modal */}
      <Modal
        visible={showStreakInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStreakInfoModal(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowStreakInfoModal(false)}
        >
          <View style={styles.streakInfoModal}>
            <View style={styles.streakInfoHeader}>
              <Icon name="flame" size={32} color="#f97316" />
              <Text style={styles.streakInfoTitle}>Walking Streak</Text>
            </View>

            <Text style={styles.streakInfoText}>
              Your walking streak shows how many consecutive days you've reached your daily step goal this month.
            </Text>

            <View style={styles.streakInfoItem}>
              <View style={[styles.statusIcon, styles.completedIcon]}>
                <Icon name="checkmark" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.streakInfoItemText}>
                <Text style={styles.streakInfoBold}>Completed: </Text>
                You reached your daily step goal
              </Text>
            </View>

            <View style={styles.streakInfoItem}>
              <View style={[styles.statusIcon, styles.missedIcon]}>
                <Icon name="close" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.streakInfoItemText}>
                <Text style={styles.streakInfoBold}>Missed: </Text>
                You didn't reach your goal that day
              </Text>
            </View>

            <View style={styles.streakInfoItem}>
              <View style={[styles.statusIcon, styles.upcomingIcon]}>
                <Icon
                  name="lock"
                  size={12}
                  color={isDarkMode ? 'rgba(255,255,255,0.5)' : colors.textMuted}
                />
              </View>
              <Text style={styles.streakInfoItemText}>
                <Text style={styles.streakInfoBold}>Upcoming: </Text>
                Future days yet to be completed
              </Text>
            </View>

            <Text style={styles.streakInfoTip}>
              Maintain a streak of 7+ days to earn bonus Litties!
            </Text>

            <TouchableOpacity
              style={styles.streakInfoButton}
              onPress={() => setShowStreakInfoModal(false)}
            >
              <Text style={styles.streakInfoButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Day Details Modal */}
      <Modal
        visible={showDayDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDayDetailsModal(false)}
      >
        <View style={styles.dayDetailsOverlay}>
          <View style={styles.dayDetailsModal}>
            {/* Header */}
            <View style={styles.dayDetailsHeader}>
              <View>
                <Text style={styles.dayDetailsDate}>
                  {selectedDayDetails?.month} {selectedDayDetails?.day}, {selectedDayDetails?.year}
                </Text>
                <View style={styles.dayDetailsStatusRow}>
                  {renderStatusIcon(selectedDayDetails?.status)}
                  <Text style={styles.dayDetailsStatusText}>
                    {selectedDayDetails?.status === 'completed' ? 'Goal Completed' :
                     selectedDayDetails?.status === 'current' ? 'In Progress' : 'Missed'}
                  </Text>
                </View>
                <Text style={styles.dayDetailsGoalText}>
                  Goal: {selectedDayDetails?.goalSteps?.toLocaleString() || '8,000'} steps
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dayDetailsCloseBtn}
                onPress={() => setShowDayDetailsModal(false)}
              >
                <Icon name="close" size={24} color={colors.textWhite} />
              </TouchableOpacity>
            </View>

            {/* Day Summary */}
            <View style={styles.daySummary}>
              <View style={styles.daySummaryItem}>
                <Icon name="footsteps" size={20} color="#22c55e" />
                <Text style={styles.daySummaryValue}>
                  {formatNumber(selectedDayDetails?.totalSteps || selectedDayDetails?.steps || 0)}
                </Text>
                <Text style={styles.daySummaryLabel}>Steps</Text>
              </View>
              <View style={styles.daySummaryDivider} />
              <View style={styles.daySummaryItem}>
                <Icon name="walk" size={20} color="#3b82f6" />
                <Text style={styles.daySummaryValue}>
                  {selectedDayDetails?.totalKm?.toFixed(2) || '0.00'}
                </Text>
                <Text style={styles.daySummaryLabel}>Km</Text>
              </View>
              <View style={styles.daySummaryDivider} />
              <View style={styles.daySummaryItem}>
                <Icon name="flame" size={20} color="#f97316" />
                <Text style={styles.daySummaryValue}>
                  {formatNumber(selectedDayDetails?.totalKcal || 0)}
                </Text>
                <Text style={styles.daySummaryLabel}>Kcal</Text>
              </View>
            </View>

            {/* Hourly Activity Graph */}
            <Text style={styles.activityTitle}>Hourly Activity</Text>
            <View style={styles.hourlyGraphContainer}>
              {selectedDayHourlyData.some(steps => steps > 0) ? (
                <>
                  <ScrollView
                    ref={hourlyScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.hourlyBarsScrollContent}
                  >
                    {selectedDayHourlyData.map((steps, hour) => {
                      const maxSteps = Math.max(...selectedDayHourlyData, 100);
                      const barHeight = maxSteps > 0 ? (steps / maxSteps) * 100 : 0;
                      const hasSteps = steps > 0;

                      return (
                        <View key={hour} style={styles.hourlyBarColumn}>
                          <Text style={styles.hourlyBarValue}>
                            {steps > 0 ? steps : ''}
                          </Text>
                          <View style={styles.hourlyBarWrapper}>
                            <LinearGradient
                              colors={hasSteps ? ['#22c55e', '#16a34a'] : ['transparent', 'transparent']}
                              style={[
                                styles.hourlyBar,
                                { height: Math.max(barHeight, steps > 0 ? 4 : 0) }
                              ]}
                            />
                          </View>
                          <Text style={styles.hourlyBarLabel}>
                            {hour === 0 ? '12am' :
                             hour === 12 ? '12pm' :
                             hour < 12 ? `${hour}am` : `${hour - 12}pm`}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                  {/* Legend */}
                  <View style={styles.hourlyLegend}>
                    <View style={styles.hourlyLegendItem}>
                      <View style={[styles.hourlyLegendDot, { backgroundColor: '#22c55e' }]} />
                      <Text style={styles.hourlyLegendText}>Steps per hour</Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.noActivityContainer}>
                  <Icon name="bar-chart-outline" size={48} color={colors.textMuted} />
                  <Text style={styles.noActivityText}>No activity recorded for this day</Text>
                </View>
              )}
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.dayDetailsButton}
              onPress={() => setShowDayDetailsModal(false)}
            >
              <Text style={styles.dayDetailsButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 120,
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  // Avatar
  avatarContainer: {
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#0891b2',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0891b2',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // User Info
  userName: {
    fontSize: fonts.h2,
    fontWeight: '700',
    color: colors.textWhite,
    textAlign: 'center',
    marginTop: 12,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  // Tier Card
  tierCard: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tierGradient: {
    padding: 16,
  },
  tierContent: {
    flexDirection: 'row',
  },
  tierLeft: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.2)',
  },
  tierLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tierTitle: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tierBadge: {
    width: 60,
    height: 60,
    marginTop: 8,
  },
  tierRight: {
    flex: 1,
    paddingLeft: 16,
  },
  tierProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierProgressLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tierProgressValue: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#22d3ee',
    borderRadius: 4,
  },
  tierTimeRemaining: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 10,
  },
  tierDescription: {
    fontSize: 12,
    // Tier card uses a dark bronze gradient in both themes, so the text
    // must stay white in light mode too for readable contrast.
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
    lineHeight: 16,
  },
  // Streak Card
  streakCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  streakBlur: {
    padding: 16,
    backgroundColor: 'rgba(249, 249, 249, 0.1)',
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flameContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 12,
  },
  streakNumber: {
    fontSize: fonts.h2,
    fontWeight: '700',
    color: colors.textWhite,
  },
  streakLabel: {
    fontSize: 14,
    color: colors.textWhite,
  },
  helpButton: {
    padding: 4,
  },
  // Month Navigation
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  monthNavButton: {
    padding: 8,
  },
  monthNavButtonDisabled: {
    opacity: 0.3,
  },
  monthNavTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textWhite,
  },
  // Calendar
  calendar: {
    marginBottom: 16,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  calendarRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarCell: {
    flex: 1,
    alignItems: 'center',
  },
  calendarDay: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  statusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedIcon: {
    backgroundColor: '#22c55e',
  },
  missedIcon: {
    backgroundColor: '#ef4444',
  },
  currentIcon: {
    backgroundColor: '#f97316',
    overflow: 'hidden',
  },
  upcomingIcon: {
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0, 0, 0, 0.08)',
  },
  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  legendText: {
    fontSize: 12,
    color: colors.textLight,
    marginLeft: 6,
  },
  // Accordion
  accordionCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  accordionBlur: {
    backgroundColor: 'rgba(249, 249, 249, 0.1)',
  },
  accordionBlurAndroid: {
    backgroundColor: 'rgba(249, 249, 249, 0.15)',
    padding: 0,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
    marginLeft: 12,
  },
  accordionContent: {
    padding: 16,
    paddingTop: 0,
  },
  sectionLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  themeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  themeToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.textWhite,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: isDarkMode ? 'rgba(255,255,255,0.5)' : colors.textMuted,
    fontWeight: '400',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: isDarkMode ? 0 : 1,
    borderColor: isDarkMode ? 'transparent' : '#D0D5DD',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.textWhite,
    zIndex: 10,
    minHeight: 48,
  },
  saveButton: {
    backgroundColor: '#f5c842',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 32,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    color: isDarkMode ? 'rgba(255,255,255,0.9)' : colors.textMuted,
    marginRight: 12,
  },
  bottomPadding: {
    height: 150,
  },
  // ─── Connected Devices Styles ───
  wEmptyHero: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 18,
  },
  wEmptyIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,59,76,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  wEmptyIconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,59,76,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wEmptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: isDarkMode ? '#fff' : colors.text,
    marginBottom: 6,
  },
  wEmptyDesc: {
    fontSize: 13,
    color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 10,
  },
  wScanGradient: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  wScanBtn: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wScanText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  wFoundLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: isDarkMode ? 'rgba(255,255,255,0.55)' : '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  wDeviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB',
    marginBottom: 8,
    gap: 12,
  },
  wDeviceCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,59,76,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wDeviceCardName: {
    fontSize: 14,
    fontWeight: '650',
    color: isDarkMode ? '#fff' : colors.text,
  },
  wDeviceCardType: {
    fontSize: 11.5,
    color: isDarkMode ? 'rgba(255,255,255,0.55)' : '#9CA3AF',
    marginTop: 1,
  },
  wPairBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  wPairBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  wDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  wDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
  },
  wDividerText: {
    fontSize: 12,
    color: isDarkMode ? 'rgba(255,255,255,0.45)' : '#9CA3AF',
    fontWeight: '500',
  },
  wManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#D1D5DB',
    borderStyle: 'dashed',
  },
  wManualText: {
    fontSize: 13,
    color: isDarkMode ? 'rgba(255,255,255,0.85)' : '#374151',
    fontWeight: '600',
  },
  wCodeSection: {
    marginTop: 12,
    marginHorizontal: 2,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB',
    alignItems: 'center',
  },
  wCodeInstructions: {
    fontSize: 13,
    color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#4B5563',
    lineHeight: 19,
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  wEmptyResults: {
    marginTop: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
  },
  wEmptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  wEmptyResultsTitle: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700',
    color: isDarkMode ? '#fff' : colors.text,
  },
  wEmptyResultsHint: {
    marginTop: 4,
    fontSize: 12,
    color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  wCodeDisplay: {
    backgroundColor: isDarkMode ? 'rgba(0,59,76,0.15)' : 'rgba(0,59,76,0.06)',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderWidth: 1.5,
    borderColor: isDarkMode ? 'rgba(0,59,76,0.25)' : 'rgba(0,59,76,0.1)',
    borderStyle: 'dashed',
  },
  wCodeDigits: {
    fontSize: 32,
    fontWeight: '800',
    color: isDarkMode ? '#fff' : '#003B4C',
    letterSpacing: 6,
    textAlign: 'center',
  },
  wCodeExpiry: {
    fontSize: 11,
    color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF',
    marginTop: 12,
  },
  wCodeRefresh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  wCodeRefreshText: {
    fontSize: 12,
    color: isDarkMode ? 'rgba(255,255,255,0.45)' : '#6B7280',
    fontWeight: '500',
  },
  wSupported: {
    marginTop: 18,
    alignItems: 'center',
  },
  wSupportedTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: isDarkMode ? 'rgba(255,255,255,0.2)' : '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  wSupportedList: {
    fontSize: 11,
    color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#D1D5DB',
    textAlign: 'center',
    lineHeight: 16,
  },
  // Connected state
  wConnectedCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.12)',
  },
  wConnectedGradient: {
    padding: 18,
  },
  wConnectedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  wConnectedIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: isDarkMode ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wConnectedName: {
    fontSize: 16,
    fontWeight: '700',
    color: isDarkMode ? '#fff' : colors.text,
  },
  wPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  wConnectedStatusText: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '600',
  },
  wStatsRow: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  wStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  wStatVal: {
    fontSize: 14,
    fontWeight: '700',
    color: isDarkMode ? '#fff' : colors.text,
  },
  wStatLabel: {
    fontSize: 10,
    color: isDarkMode ? 'rgba(255,255,255,0.55)' : '#9CA3AF',
    fontWeight: '500',
  },
  wStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
  },
  wSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
  wSyncGroup: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB',
  },
  wSync: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
  },
  wSyncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  wSyncIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wSyncLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: isDarkMode ? 'rgba(255,255,255,0.8)' : colors.text,
  },
  wSyncDesc: {
    fontSize: 11,
    color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF',
    marginTop: 1,
  },
  wToggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.18)' : '#D1D5DB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  wToggleOn: {
    backgroundColor: '#22C55E',
  },
  wToggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  wToggleThumbOn: {
    alignSelf: 'flex-end',
  },
  wDisconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: isDarkMode ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)',
  },
  wDisconnectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  // Dropdown styles
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#FFFFFF',
    borderRadius: 12,
    borderWidth: isDarkMode ? 0 : 1,
    borderColor: isDarkMode ? 'transparent' : '#D0D5DD',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: colors.textWhite,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModal: {
    backgroundColor: '#1a3a40',
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dropdownOptionSelected: {
    backgroundColor: 'rgba(245, 200, 66, 0.1)',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: colors.textWhite,
  },
  dropdownOptionTextSelected: {
    color: '#f5c842',
    fontWeight: '600',
  },
  // Image Picker Modal styles
  imagePickerModal: {
    backgroundColor: '#1a3a40',
    borderRadius: 16,
    width: '100%',
    maxWidth: 300,
    padding: 20,
  },
  imagePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: 20,
  },
  imagePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  imagePickerOptionText: {
    fontSize: 16,
    color: colors.textWhite,
    marginLeft: 16,
  },
  imagePickerCancel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  imagePickerCancelText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  // Streak Info Modal styles
  streakInfoModal: {
    backgroundColor: isDarkMode ? '#1a3a40' : '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    padding: 24,
  },
  streakInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  streakInfoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textWhite,
    marginLeft: 10,
  },
  streakInfoText: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  streakInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  streakInfoItemText: {
    fontSize: 14,
    color: colors.textLight,
    marginLeft: 12,
    flex: 1,
  },
  streakInfoBold: {
    fontWeight: '700',
    color: colors.textWhite,
  },
  streakInfoTip: {
    fontSize: 13,
    color: isDarkMode ? '#f5c842' : '#0891b2',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  streakInfoButton: {
    backgroundColor: '#f5c842',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  streakInfoButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  // Totals Summary
  totalsSummary: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textWhite,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  totalDivider: {
    width: 1,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
  },
  // Tap hint
  tapHint: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  // Day Details Modal
  dayDetailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  dayDetailsModal: {
    backgroundColor: isDarkMode ? '#1a3a40' : '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  dayDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  dayDetailsDate: {
    fontSize: fonts.h2,
    fontWeight: '700',
    color: colors.textWhite,
  },
  dayDetailsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dayDetailsStatusText: {
    fontSize: 14,
    color: colors.textLight,
    marginLeft: 8,
  },
  dayDetailsGoalText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  dayDetailsCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Day Summary
  daySummary: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  daySummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  daySummaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textWhite,
    marginTop: 6,
  },
  daySummaryLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  daySummaryDivider: {
    width: 1,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
    marginHorizontal: 8,
  },
  // Activity List
  activityTitle: {
    fontSize: fonts.h4,
    fontWeight: '600',
    color: colors.textWhite,
    marginBottom: 12,
  },
  activityList: {
    maxHeight: 250,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    marginLeft: 12,
    flex: 1,
  },
  activityCause: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  activitySteps: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
  },
  activityKm: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  noActivityContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noActivityText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 12,
    textAlign: 'center',
  },
  // Hourly Graph styles
  hourlyGraphContainer: {
    marginBottom: 16,
  },
  hourlyBarsScrollContent: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  hourlyBarColumn: {
    alignItems: 'center',
    width: 28,
    marginHorizontal: 2,
  },
  hourlyBarValue: {
    fontSize: 8,
    color: colors.textMuted,
    height: 14,
    textAlign: 'center',
  },
  hourlyBarWrapper: {
    height: 100,
    width: 16,
    justifyContent: 'flex-end',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  hourlyBar: {
    width: '100%',
    borderRadius: 4,
  },
  hourlyBarLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 4,
  },
  hourlyLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  hourlyLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hourlyLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  hourlyLegendText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  dayDetailsButton: {
    backgroundColor: '#f5c842',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 16,
  },
  dayDetailsButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
});

export default ProfileScreen;
