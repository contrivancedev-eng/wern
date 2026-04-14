import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Share, Linking, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { BlurView } from 'expo-blur';
import { Icon } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { fonts } from '../../utils';

const API_URL = 'https://www.videosdownloaders.com/firsttrackapi/api/';

const socialLinks = [
  { id: 1, name: 'twitter', image: require('../../../assest/img/twitter.webp') },
  { id: 2, name: 'telegram', image: require('../../../assest/img/telegram.webp') },
  { id: 3, name: 'facebook', image: require('../../../assest/img/facebook.webp') },
  { id: 4, name: 'instagram', image: require('../../../assest/img/insta.webp') },
  { id: 5, name: 'whatsapp', image: require('../../../assest/img/whatsapp.webp') },
  { id: 6, name: 'snapchat', image: require('../../../assest/img/snapchat.webp') },
];

const ReferScreen = ({ onClose }) => {
  const { user, token } = useAuth();
  const referralCode = user?.referal_code || 'WERN-XXX';
  const [showCopied, setShowCopied] = useState(false);
  const [referralUsers, setReferralUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ directReferrals: 0, totalNetwork: 0, totalReferrals: 0 });
  const { colors, isDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

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

  const getReferralMessage = () => {
    return `Join me on WERN and start earning rewards by walking! Use my referral code: ${referralCode}\n\nDownload now: ${PLAY_STORE_URL}`;
  };

  const getReferralLink = () => {
    return PLAY_STORE_URL;
  };

  // Handle social media sharing
  const handleShare = async (platform) => {
    const message = getReferralMessage();
    const link = getReferralLink();
    const encodedMessage = encodeURIComponent(message);
    const encodedLink = encodeURIComponent(link);

    try {
      let url = null;

      switch (platform) {
        case 'whatsapp':
          url = `whatsapp://send?text=${encodedMessage}`;
          break;
        case 'telegram':
          url = `tg://msg?text=${encodedMessage}`;
          break;
        case 'twitter':
          url = `twitter://post?message=${encodedMessage}`;
          break;
        case 'facebook':
          // Facebook doesn't support pre-filled text on mobile, just opens share dialog
          url = `fb://share/?quote=${encodedMessage}`;
          break;
        case 'instagram':
          // Instagram doesn't support direct sharing, copy to clipboard and open app
          await Clipboard.setStringAsync(message);
          Alert.alert(
            'Share on Instagram',
            'Your referral message has been copied! Paste it in your Instagram story or DM.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Instagram',
                onPress: async () => {
                  const instagramUrl = 'instagram://app';
                  const canOpen = await Linking.canOpenURL(instagramUrl);
                  if (canOpen) {
                    await Linking.openURL(instagramUrl);
                  } else {
                    await Linking.openURL('https://instagram.com');
                  }
                }
              },
            ]
          );
          return;
        case 'snapchat':
          // Snapchat doesn't support direct sharing, copy to clipboard and open app
          await Clipboard.setStringAsync(message);
          Alert.alert(
            'Share on Snapchat',
            'Your referral message has been copied! Paste it in your Snapchat chat.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Snapchat',
                onPress: async () => {
                  const snapchatUrl = 'snapchat://app';
                  const canOpen = await Linking.canOpenURL(snapchatUrl);
                  if (canOpen) {
                    await Linking.openURL(snapchatUrl);
                  } else {
                    await Linking.openURL('https://snapchat.com');
                  }
                }
              },
            ]
          );
          return;
        default:
          // Fallback to native share
          await Share.share({
            message: message,
            title: 'Join WERN',
          });
          return;
      }

      // Try to open the app-specific URL
      if (url) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          // Fallback URLs for web if app is not installed
          let fallbackUrl = null;
          switch (platform) {
            case 'whatsapp':
              fallbackUrl = `https://wa.me/?text=${encodedMessage}`;
              break;
            case 'telegram':
              fallbackUrl = `https://t.me/share/url?url=${encodedLink}&text=${encodeURIComponent(`Join me on WERN! Use code: ${referralCode}`)}`;
              break;
            case 'twitter':
              fallbackUrl = `https://twitter.com/intent/tweet?text=${encodedMessage}`;
              break;
            case 'facebook':
              fallbackUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}&quote=${encodedMessage}`;
              break;
          }

          if (fallbackUrl) {
            const canOpenFallback = await Linking.canOpenURL(fallbackUrl);
            if (canOpenFallback) {
              await Linking.openURL(fallbackUrl);
            } else {
              // Final fallback - use native share
              await Share.share({
                message: message,
                title: 'Join WERN',
              });
            }
          } else {
            await Share.share({
              message: message,
              title: 'Join WERN',
            });
          }
        }
      }
    } catch (error) {
      console.log('Share error:', error.message);
      // Fallback to native share on any error
      try {
        await Share.share({
          message: message,
          title: 'Join WERN',
        });
      } catch (shareError) {
        console.log('Native share error:', shareError.message);
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
