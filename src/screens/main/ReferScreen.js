import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { BlurView } from 'expo-blur';
import Svg, { Rect, G, Image as SvgImage } from 'react-native-svg';
import qrcodeGenerator from 'qrcode-generator';
import RNShare from 'react-native-share';
import { Icon } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { fonts } from '../../utils';

const API_URL = 'https://www.wernapp.com/api/';

const socialLinks = [
  { id: 1, name: 'twitter', image: require('../../../assest/img/twitter.webp') },
  { id: 2, name: 'telegram', image: require('../../../assest/img/telegram.webp') },
  { id: 3, name: 'facebook', image: require('../../../assest/img/facebook.webp') },
  { id: 4, name: 'instagram', image: require('../../../assest/img/insta.webp') },
  { id: 5, name: 'whatsapp', image: require('../../../assest/img/whatsapp.webp') },
  { id: 6, name: 'snapchat', image: require('../../../assest/img/snapchat.webp') },
];

// Clean QR share card — renders the QR matrix from qrcode-generator as
// SVG rects (no async image-based QR library, so the output is always
// complete) with the WERN logo centered on top. Text details are sent
// as a separate message by the share handler, so this PNG stays a
// simple scan target.
const LOGO_SRC = Image.resolveAssetSource(require('../../../assest/img/wern-logo.png'));

const ShareCardSvg = React.memo(function ShareCardSvg({ smartUrl, svgRef }) {
  const { cells, moduleCount } = useMemo(() => {
    const qr = qrcodeGenerator(0, 'M');
    qr.addData(smartUrl);
    qr.make();
    const count = qr.getModuleCount();
    const dark = [];
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) dark.push({ r, c });
      }
    }
    return { cells: dark, moduleCount: count };
  }, [smartUrl]);

  const SIZE = 720;
  const PAD = 40;
  const QR_SIZE = SIZE - PAD * 2;
  const QR_X = PAD;
  const QR_Y = PAD;
  const cell = QR_SIZE / moduleCount;
  const logoBox = QR_SIZE * 0.22;
  const logoX = QR_X + (QR_SIZE - logoBox) / 2;
  const logoY = QR_Y + (QR_SIZE - logoBox) / 2;

  return (
    <Svg ref={svgRef} width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <Rect x={0} y={0} width={SIZE} height={SIZE} fill="#ffffff" rx={24} />
      <G>
        {cells.map(({ r, c }, i) => (
          <Rect
            key={i}
            x={QR_X + c * cell}
            y={QR_Y + r * cell}
            width={cell + 0.5}
            height={cell + 0.5}
            fill="#000000"
          />
        ))}
      </G>
      {/* White backing square so the center logo doesn't corrupt the scan */}
      <Rect x={logoX - 8} y={logoY - 8} width={logoBox + 16} height={logoBox + 16} fill="#ffffff" rx={12} />
      <SvgImage
        x={logoX}
        y={logoY}
        width={logoBox}
        height={logoBox}
        href={LOGO_SRC}
        preserveAspectRatio="xMidYMid meet"
      />
    </Svg>
  );
});

const ReferScreen = ({ onClose }) => {
  const { user, token } = useAuth();
  const referralCode = user?.referal_code || 'WERN-XXX';
  const [showCopied, setShowCopied] = useState(false);
  const [referralUsers, setReferralUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ directReferrals: 0, totalNetwork: 0, totalReferrals: 0 });
  const { colors, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  // Ref on the off-screen QR — we render it hidden so that toDataURL
  // works when the user triggers a share. Ref is how react-native-qrcode-svg
  // exposes the underlying SVG's toDataURL.
  const qrRef = useRef(null);

  useEffect(() => {
    fetchReferralHistory();
  }, [token]);

  const fetchReferralHistory = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}get-refferal-users-history?token=${token}`);
      const data = await response.json();

      if (data.status === true && data.data) {
        const directReferrals = data.data.direct_referrals || [];
        setReferralUsers(directReferrals);

        // Use API provided counts
        setStats({
          directReferrals: data.data.direct_count || 0,
          totalNetwork: data.data.total_network_count || data.data.direct_count || 0,
          totalReferrals: data.data.direct_count || 0,
        });
      }
    } catch (error) {
      console.log('Error fetching referral history:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(referralCode);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  // Generate referral link and message
  const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.wern.app&hl=en_IN';
  const APP_STORE_URL = 'https://apps.apple.com/in/app/wern-walk-track-empower/id6761259828';
  // Smart-redirect page hosted on wernapp.com: detects the visitor's OS
  // (iPhone → App Store, Android → Play Store, desktop → choose page).
  // This is the URL encoded into the QR code so a single scan works on
  // both platforms.
  const SMART_DOWNLOAD_URL = 'https://wernapp.com/get-app.html';

  const getReferralMessage = () => {
    return `Join me on WERN and start earning rewards by walking! Use my referral code: ${referralCode}\n\nDownload: ${SMART_DOWNLOAD_URL}\n\nAndroid: ${PLAY_STORE_URL}\n\niOS: ${APP_STORE_URL}`;
  };

  // Platforms that only accept a single URL (Facebook "u=", Telegram "url=")
  // get the smart-redirect URL so the landing page can route to the
  // recipient's native store.
  const getReferralLink = () => {
    return SMART_DOWNLOAD_URL;
  };

  // Export the off-screen composite SVG to a PNG file in the cache
  // directory. react-native-svg's Svg component exposes toDataURL via
  // a callback; wrap it in a promise so handleShare can await. The
  // 150ms settle delay gives SvgImage's async asset load time to
  // finish before we snapshot — without it the logo occasionally
  // comes back missing on first tap.
  const buildQrImageUri = () =>
    new Promise((resolve, reject) => {
      const svg = qrRef.current;
      if (!svg?.toDataURL) {
        reject(new Error('Share card ref not ready'));
        return;
      }
      setTimeout(() => {
        svg.toDataURL(async (base64) => {
          try {
            const fileUri = `${FileSystem.cacheDirectory}wern-referral-card.png`;
            await FileSystem.writeAsStringAsync(fileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            resolve(fileUri);
          } catch (e) {
            reject(e);
          }
        });
      }, 150);
    });

  // Map our social icon id to react-native-share's Social enum so the
  // chosen app opens directly with both QR image and text prefilled.
  const RNSHARE_SOCIAL = {
    whatsapp: RNShare.Social.WHATSAPP,
    telegram: RNShare.Social.TELEGRAM,
    twitter: RNShare.Social.TWITTER,
    facebook: RNShare.Social.FACEBOOK,
    instagram: RNShare.Social.INSTAGRAM,
    snapchat: RNShare.Social.SNAPCHAT,
  };

  // Unified share — react-native-share delivers both the QR image and
  // the full referral text together to the target app, on iOS and
  // Android alike. Tries to open the specific app first; falls back
  // to the system share sheet if that app isn't installed, and to a
  // text-only OS share if all else fails.
  const handleShare = async (platform) => {
    const message = getReferralMessage();
    try {
      const fileUri = await buildQrImageUri();
      const url = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;
      const social = RNSHARE_SOCIAL[platform];

      if (social) {
        try {
          await RNShare.shareSingle({
            social,
            message,
            url,
            type: 'image/png',
            title: 'Join WERN',
            failOnCancel: false,
          });
          return;
        } catch (singleErr) {
          console.log('shareSingle failed, falling back to share sheet:', singleErr?.message);
        }
      }

      await RNShare.open({
        message,
        url,
        type: 'image/png',
        title: 'Join WERN',
        subject: 'Join WERN',
        failOnCancel: false,
      });
    } catch (error) {
      if (error?.message && !error.message.toLowerCase().includes('user did not share')) {
        console.log('Share error:', error.message);
      }
      try {
        await Share.share({ message, title: 'Join WERN' });
      } catch (shareError) {
        console.log('Native share fallback error:', shareError?.message);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Copied Toast */}
        {showCopied && (
          <View style={styles.copiedToast}>
            <Icon name="checkmark-circle" size={18} color="#4ade80" />
            <Text style={styles.copiedText}>Referral code copied!</Text>
          </View>
        )}

        {/* Signup & Referral Card */}
        <View style={styles.referralCard}>
          <BlurView intensity={15} tint="dark" style={styles.referralCardBlur}>
            <View style={styles.cardContent}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardLabel}>Signup & Referral</Text>
                <Text style={styles.cardValue}>10 Litties</Text>
                <View style={styles.totalReferralRow}>
                  <Icon name="person" size={16} color={colors.textWhite} />
                  <Text style={styles.totalReferralText}>{String(stats.totalReferrals).padStart(2, '0')} Total Referral</Text>
                </View>
                <Text style={styles.cardSubtext}>Copy & Share your referral link</Text>
              </View>
              <Image
                source={require('../../../assest/img/referral-banner-icon.webp')}
                style={styles.bannerIcon}
                resizeMode="contain"
              />
            </View>

            {/* Referral Code Input */}
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>{referralCode}</Text>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Image
              source={require('../../../assest/img/referral -coins.webp')}
              style={styles.statIcon}
              resizeMode="contain"
            />
            <BlurView intensity={15} tint="dark" style={styles.statBlur}>
              <Text style={styles.statValue}>{stats.directReferrals}</Text>
              <Text style={styles.statLabel}>Direct Referrals</Text>
            </BlurView>
          </View>

          <View style={styles.statCard}>
            <Image
              source={require('../../../assest/img/referral -human.webp')}
              style={styles.statIcon}
              resizeMode="contain"
            />
            <BlurView intensity={15} tint="dark" style={styles.statBlur}>
              <Text style={styles.statValue}>{stats.totalNetwork}</Text>
              <Text style={styles.statLabel}>Total Network</Text>
            </BlurView>
          </View>
        </View>

        {/* Share Section */}
        <Text style={styles.sectionTitle}>Share Your Referral link Via.</Text>
        <View style={styles.socialRow}>
          {socialLinks.map((social) => (
            <TouchableOpacity
              key={social.id}
              style={styles.socialButton}
              onPress={() => handleShare(social.name)}
              activeOpacity={0.7}
            >
              <Image source={social.image} style={styles.socialIcon} resizeMode="contain" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Hidden composite — WERN logo + heading + referral code + QR +
            full download URLs baked into a single SVG. When the user
            triggers a share, we call toDataURL on this SVG to get one
            PNG that already contains every piece of info the user
            wants to send. This is the only way to deliver text + QR
            in one share on Expo Go Android (native file share can't
            carry text; clipboard paste is the only alternative). */}
        <View style={styles.qrHidden} pointerEvents="none">
          <ShareCardSvg smartUrl={SMART_DOWNLOAD_URL} svgRef={qrRef} />
        </View>

        {/* Referral Network Tree */}
        <Text style={styles.sectionTitle}>Your Referral Network Tree</Text>
        <View style={styles.networkTreeContainer}>
          <BlurView intensity={15} tint="dark" style={styles.networkTreeBlur}>
            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.loadingText}>Loading referrals...</Text>
              </View>
            ) : referralUsers.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Icon
                    name="link-outline"
                    size={40}
                    color={isDarkMode ? 'rgba(255,255,255,0.5)' : colors.textMuted}
                  />
                </View>
                <Text style={styles.emptyText}>No referrals yet</Text>
                <Text style={styles.emptySubtext}>Share your code to start earning!</Text>
              </View>
            ) : (
              <View style={styles.referralList}>
                {referralUsers.map((referral, index) => (
                  <View key={referral.id || index} style={styles.referralItem}>
                    <View style={styles.referralAvatar}>
                      {referral.user_image ? (
                        <Image source={{ uri: referral.user_image }} style={styles.avatarImage} />
                      ) : (
                        <Icon name="person" size={24} color={colors.textWhite} />
                      )}
                    </View>
                    <View style={styles.referralInfo}>
                      <Text style={styles.referralName}>{referral.full_name || 'User'}</Text>
                      <Text style={styles.referralDate}>Joined {formatDate(referral.created_at)}</Text>
                    </View>
                    <View style={styles.referralBadge}>
                      <Icon name="checkmark-circle" size={16} color="#4ade80" />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </BlurView>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
    backgroundColor: 'transparent',
  },
  // Copied Toast
  copiedToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 16,
    alignSelf: 'center',
  },
  copiedText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Referral Card
  referralCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  referralCardBlur: {
    padding: 20,
    backgroundColor: 'rgba(249, 249, 249, 0.1)',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardLeft: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: fonts.h1,
    fontWeight: '700',
    color: colors.textWhite,
    marginBottom: 8,
  },
  totalReferralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalReferralText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
    marginLeft: 6,
  },
  cardSubtext: {
    fontSize: 12,
    color: colors.textLight,
  },
  bannerIcon: {
    width: 100,
    height: 100,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 30,
    paddingLeft: 20,
    paddingRight: 4,
    paddingVertical: 4,
  },
  codeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  copyButton: {
    backgroundColor: '#f5c842',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 25,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  // Stats Cards
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    marginTop: 30,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statBlur: {
    width: '100%',
    paddingTop: 45,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(249, 249, 249, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0, 0, 0, 0.1)',
  },
  statIcon: {
    width: 70,
    height: 70,
    marginTop: -35,
    marginBottom: -35,
    zIndex: 10,
  },
  statValue: {
    fontSize: fonts.h1,
    fontWeight: '700',
    color: colors.textWhite,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textLight,
  },
  // Section Title
  sectionTitle: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.textWhite,
    marginBottom: 16,
  },
  // Social Links
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: isDarkMode ? 'rgba(249, 249, 249, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIcon: {
    width: 28,
    height: 28,
  },
  // Off-screen QR — hidden but still mounted so its ref can export PNG
  // data when the user triggers a share. Positioned far off-screen so
  // it doesn't affect layout; opacity 0 guards against any layout glitch.
  qrHidden: {
    position: 'absolute',
    left: -10000,
    top: -10000,
    opacity: 0,
  },
  // Network Tree
  networkTreeContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  networkTreeBlur: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: 'rgba(249, 249, 249, 0.1)',
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textLight,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  // Loading State
  loadingState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 12,
  },
  // Referral List
  referralList: {
    width: '100%',
  },
  referralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  referralAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  referralInfo: {
    flex: 1,
    marginLeft: 12,
  },
  referralName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textWhite,
  },
  referralDate: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  referralBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomPadding: {
    height: 20,
  },
});

export default ReferScreen;
