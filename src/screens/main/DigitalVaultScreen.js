import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Modal, Linking, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import { Icon } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { fonts } from '../../utils';

const API_URL = 'https://www.wernapp.com/api/';

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

// Filter categories for dropdown
const filterCategories = [
  { id: 'all', name: 'All', icon: 'star', color: '#f59e0b', categoryId: null },
  { id: 'signup', name: 'Signup', icon: 'person', color: '#3b82f6', categoryId: 1 },
  { id: 'claim', name: 'Claim', icon: 'gift', color: '#f59e0b', categoryId: 2 },
  { id: 'step', name: 'Step', icon: 'walk', color: '#22c55e', categoryId: 3 },
];

const DigitalVaultScreen = () => {
  const [showContactModal, setShowContactModal] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(filterCategories[0]);
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false); // Track if initial load is done
  const [isTransactionsExpanded, setIsTransactionsExpanded] = useState(false);
  const MAX_VISIBLE_TRANSACTIONS = 5;
  const [balanceCard, setBalanceCard] = useState({ available_balance: 0, total_km: 0, total_calories: 0, total_steps: 0 });
  const [displayBalance, setDisplayBalance] = useState(0);
  // Leaderboard — top 10 users by total_steps, fetched from admin-users-list.
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const { colors, isDarkMode } = useTheme();
  const { token, refreshLitties, dataRefreshTrigger } = useAuth();
  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  const contactEmail = 'technical@projectliberte.io';

  // Map earn_category_id to icon
  const getCategoryIcon = (categoryId) => {
    switch (parseInt(categoryId)) {
      case 1: return 'person'; // Sign Up
      case 2: return 'gift';   // Claim
      case 3: return 'walk';   // Step
      default: return 'add';
    }
  };

  // Fetch digital vault data from consolidated API
  // showLoader: only show loading indicator on first load, not on refresh
  const fetchDigitalVaultData = useCallback(async (showLoader = false) => {
    if (!token) return;

    // Only show loader on initial load when we have no data
    if (showLoader && !hasLoadedOnce) {
      setIsLoadingTransactions(true);
    }

    try {
      const response = await fetch(`${API_URL}get-digital-vault-data?token=${token}`);
      const data = await response.json();

      if (data.status === true && data.data) {
        // Store balance card data
        if (data.data.balance_card) {
          setBalanceCard(data.data.balance_card);
          setDisplayBalance(data.data.balance_card.total_available_balance || data.data.balance_card.available_balance || 0);
        }

        // Process recent transactions
        const processedTransactions = (data.data.recent_transactions || []).map(tx => ({
          ...tx,
          categoryId: parseInt(tx.earn_category_id),
          categoryIcon: getCategoryIcon(tx.earn_category_id),
        }));

        setAllTransactions(processedTransactions);
        setTransactions(processedTransactions);
        setSelectedCategory(filterCategories[0]); // Reset to 'All' category
        setHasLoadedOnce(true); // Mark as loaded

        // Refresh litties to update TopNavbar
        refreshLitties();
      }
    } catch (error) {
      console.log('Error fetching digital vault data:', error.message);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [token, refreshLitties, hasLoadedOnce]);

  // Fetch the global leaderboard from admin-users-list. Sorts by
  // total_steps descending and keeps the top 10 entries. Called on
  // mount and screen focus so the board stays reasonably fresh.
  const fetchLeaderboard = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoadingLeaderboard(true);
    try {
      const response = await fetch(`${API_URL}admin-users-list`);
      const data = await response.json();
      if (data?.status === true && Array.isArray(data.data)) {
        const top10 = [...data.data]
          .map((u) => ({
            id: u.id,
            full_name: u.full_name || u.nickname || 'WERN User',
            total_steps: Number(u.total_steps) || 0,
            user_image: u.user_image,
          }))
          .sort((a, b) => b.total_steps - a.total_steps)
          .slice(0, 10);
        setLeaderboard(top10);
      }
    } catch (error) {
      console.log('Error fetching leaderboard:', error.message);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, []);

  // Fetch data on mount - show loader only on first load
  useEffect(() => {
    fetchDigitalVaultData(true); // Show loader on initial mount
    fetchLeaderboard(true);
  }, []);

  // Refetch data when dataRefreshTrigger changes - silent refresh (no loader)
  useEffect(() => {
    if (dataRefreshTrigger > 0) {
      fetchDigitalVaultData(false); // Silent refresh
    }
  }, [dataRefreshTrigger]);

  // Refetch data when screen comes into focus - silent refresh (no loader)
  useFocusEffect(
    useCallback(() => {
      fetchDigitalVaultData(false); // Silent refresh
      fetchLeaderboard(false);
    }, [])
  );

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setShowCategoryDropdown(false);
    setIsTransactionsExpanded(false); // Reset expanded state when filter changes

    if (category.id === 'all') {
      // Show all transactions and total balance
      setTransactions(allTransactions);
      setDisplayBalance(balanceCard.total_available_balance || balanceCard.available_balance || 0);
    } else {
      // Filter transactions by category
      const filtered = allTransactions.filter(tx => tx.categoryId === category.categoryId);
      setTransactions(filtered);

      // Calculate filtered balance from transactions
      const filteredBalance = filtered.reduce((sum, tx) => sum + (parseFloat(tx.points) || 0), 0);
      setDisplayBalance(filteredBalance);
    }
  };

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${contactEmail}`);
  };


  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Earned Litties Card */}
        <View style={styles.earnedCard}>
          <BlurView intensity={15} tint="dark" style={styles.blurContainer}>
            <View style={styles.earnedHeader}>
              <Text style={styles.earnedTitle}>Earned Litties</Text>
              <TouchableOpacity
                style={[styles.coinDropdownButton, { backgroundColor: selectedCategory.color }]}
                onPress={() => setShowCategoryDropdown(true)}
              >
                <Icon name={selectedCategory.icon} size={14} color="#FFFFFF" />
                <Text style={styles.coinDropdownText}>{selectedCategory.name}</Text>
                <Icon name="chevron-down" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.earnedSubtitle}>through Walk and Earn</Text>

            <View style={styles.littiesRow}>
              <View style={styles.balanceContainer}>
                <Text style={styles.balanceNumber}>{displayBalance}</Text>
                <Text style={styles.balanceCoinName}> Litties</Text>
              </View>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatNumber(balanceCard.total_km)}</Text>
                  <Text style={styles.statLabel}>Km</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatNumber(balanceCard.total_calories)}</Text>
                  <Text style={styles.statLabel}>Calories</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatNumber(balanceCard.total_steps)}</Text>
                  <Text style={styles.statLabel}>Steps</Text>
                </View>
              </View>
            </View>
          </BlurView>
        </View>

        {/* Other Transactions Section */}
        <Text style={styles.sectionTitle}>Other Transactions</Text>

        <View style={styles.transactionsList}>
          {isLoadingTransactions ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#22c55e" />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="history" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            <>
              {(isTransactionsExpanded ? transactions : transactions.slice(0, MAX_VISIBLE_TRANSACTIONS)).map((transaction, index, displayedTransactions) => (
                <View
                  key={transaction.id || index}
                  style={[
                    styles.transactionItem,
                    index < displayedTransactions.length - 1 && styles.transactionBorder
                  ]}
                >
                  <View style={[
                    styles.transactionIcon,
                    transaction.categoryId === 1 && { backgroundColor: '#3b82f6' },
                    transaction.categoryId === 2 && { backgroundColor: '#f59e0b' },
                    transaction.categoryId === 3 && { backgroundColor: '#22c55e' },
                  ]}>
                    <Icon name={transaction.categoryIcon || 'add'} size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle}>
                      {transaction.category_name || 'Transaction'}
                    </Text>
                    <Text style={styles.transactionDescription}>
                      {transaction.description}
                      {transaction.time_ago && ` • ${transaction.time_ago}`}
                    </Text>
                  </View>
                  <View style={styles.transactionAmountContainer}>
                    <Text style={styles.transactionAmount}>
                      {transaction.points ? parseFloat(transaction.points).toFixed(1) : '0.0'}
                    </Text>
                    <Text style={styles.transactionCurrency}>Litties</Text>
                  </View>
                </View>
              ))}

              {/* View All / Collapse Button */}
              {transactions.length > MAX_VISIBLE_TRANSACTIONS && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => setIsTransactionsExpanded(!isTransactionsExpanded)}
                >
                  <Text style={styles.viewAllText}>
                    {isTransactionsExpanded ? 'Show less' : `View all (${transactions.length - MAX_VISIBLE_TRANSACTIONS})`}
                  </Text>
                  <Icon
                    name={isTransactionsExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={isDarkMode ? '#FFFFFF' : '#1a1a1a'}
                  />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Leaderboard — top 10 walkers globally. First three get
            gold / silver / bronze badges instead of rank numbers. */}
        <Text style={styles.sectionTitle}>Leaderboard</Text>
        <View style={styles.leaderboardList}>
          {isLoadingLeaderboard && leaderboard.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#22c55e" />
              <Text style={styles.loadingText}>Loading leaderboard...</Text>
            </View>
          ) : leaderboard.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="trophy" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No leaderboard data yet</Text>
            </View>
          ) : (
            leaderboard.map((entry, index) => {
              // Gold / silver / bronze metadata for the top three.
              const badgeMeta = index === 0
                ? { color: '#f59e0b', icon: 'trophy' }
                : index === 1
                  ? { color: '#9ca3af', icon: 'medal' }
                  : index === 2
                    ? { color: '#b45309', icon: 'medal' }
                    : null;

              return (
                <View
                  key={entry.id || index}
                  style={[
                    styles.leaderboardItem,
                    index < leaderboard.length - 1 && styles.leaderboardBorder,
                  ]}
                >
                  {badgeMeta ? (
                    <View style={[styles.leaderboardBadge, { backgroundColor: badgeMeta.color }]}>
                      <Icon name={badgeMeta.icon} size={18} color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={styles.leaderboardRankNumber}>
                      <Text style={styles.leaderboardRankText}>{index + 1}</Text>
                    </View>
                  )}
                  <Text style={styles.leaderboardName} numberOfLines={1}>
                    {entry.full_name}
                  </Text>
                  <View style={styles.leaderboardStepsContainer}>
                    <Text style={styles.leaderboardStepsValue}>
                      {formatNumber(entry.total_steps)}
                    </Text>
                    <Text style={styles.leaderboardStepsLabel}>steps</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Help & Customer Support Card */}
        <View style={styles.supportCard}>
          <View style={styles.supportContent}>
            <Image
              source={require('../../../assest/img/ph.webp')}
              style={styles.supportIcon}
              resizeMode="contain"
            />
            <View style={styles.supportTextContainer}>
              <Text style={styles.supportTitle}>Help & Customer Support</Text>
              <Text style={styles.supportDescription}>
                Register a complaint or get quick help on queries related to WERN
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.contactButton} onPress={() => setShowContactModal(true)}>
            <Text style={styles.contactButtonText}>Contact Us</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Contact Us Modal */}
      <Modal
        visible={showContactModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contact Us</Text>
              <TouchableOpacity onPress={() => setShowContactModal(false)} style={styles.closeButton}>
                <Icon name="close" size={24} color={isDarkMode ? '#FFFFFF' : colors.textWhite} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>We're here to help! Reach out to us via:</Text>

            {/* Email */}
            <TouchableOpacity style={styles.contactItem} onPress={handleEmailPress}>
              <View style={styles.contactIconContainer}>
                <Icon name="mail" size={24} color={isDarkMode ? '#FFFFFF' : '#1a1a1a'} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{contactEmail}</Text>
              </View>
              <Icon
                name="arrow-forward"
                size={20}
                color={isDarkMode ? 'rgba(255,255,255,0.5)' : colors.textMuted}
              />
            </TouchableOpacity>

            <Text style={styles.modalFooter}>Available Mon-Fri, 9AM - 6PM EST</Text>
          </View>
        </View>
      </Modal>

      {/* Category Selector Dropdown Modal */}
      <Modal
        visible={showCategoryDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryDropdown(false)}
        >
          <View style={styles.dropdownContent}>
            <Text style={styles.dropdownTitle}>Filter By</Text>
            {filterCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.dropdownItem,
                  selectedCategory.id === category.id && styles.dropdownItemSelected
                ]}
                onPress={() => handleCategorySelect(category)}
              >
                <View style={[styles.dropdownIconContainer, { backgroundColor: category.color }]}>
                  <Icon name={category.icon} size={16} color="#FFFFFF" />
                </View>
                <Text style={styles.dropdownItemText}>{category.name}</Text>
                {selectedCategory.id === category.id && (
                  <Icon name="checkmark" size={18} color="#22c55e" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  // Earned Litties Card
  earnedCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  blurContainer: {
    padding: 20,
    backgroundColor: 'rgba(249, 249, 249, 0.1)',
  },
  earnedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  earnedTitle: {
    fontSize: fonts.h4,
    fontWeight: '700',
    color: colors.textWhite,
  },
  coinDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
  },
  coinDropdownText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  earnedSubtitle: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 14,
  },
  littiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textWhite,
  },
  balanceCoinName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textWhite,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 14,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  // Section Title
  sectionTitle: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.textWhite,
    marginBottom: 14,
  },
  // Transactions List
  transactionsList: {
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  transactionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
    marginBottom: 3,
  },
  transactionDescription: {
    fontSize: 12,
    color: colors.textLight,
    lineHeight: 16,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textWhite,
  },
  transactionCurrency: {
    fontSize: 11,
    color: colors.textLight,
  },
  // Leaderboard
  leaderboardList: {
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  leaderboardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  leaderboardBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  leaderboardRankNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  leaderboardRankText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textLight,
  },
  leaderboardName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
    marginRight: 10,
  },
  leaderboardStepsContainer: {
    alignItems: 'flex-end',
  },
  leaderboardStepsValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textWhite,
  },
  leaderboardStepsLabel: {
    fontSize: 11,
    color: colors.textLight,
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textLight,
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textMuted,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? '#FFFFFF' : '#1a1a1a',
    marginRight: 6,
  },
  // Support Card
  supportCard: {
    backgroundColor: isDarkMode ? 'rgba(0, 90, 100, 0.85)' : '#EAF5F7',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : colors.cardBorder,
  },
  supportContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  supportIcon: {
    width: 70,
    height: 70,
    marginRight: 16,
  },
  supportTextContainer: {
    flex: 1,
  },
  supportTitle: {
    fontSize: fonts.h4,
    fontWeight: '700',
    color: colors.textWhite,
    marginBottom: 5,
  },
  supportDescription: {
    fontSize: 12,
    color: colors.textLight,
    lineHeight: 16,
  },
  contactButton: {
    backgroundColor: '#f5c842',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  bottomPadding: {
    height: 20,
  },
  // Contact Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: isDarkMode ? '#0a5a5a' : '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : colors.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: fonts.h2,
    fontWeight: '700',
    color: colors.textWhite,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5c842',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textWhite,
  },
  modalFooter: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
  // Coin Dropdown Modal
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  dropdownContent: {
    width: '100%',
    backgroundColor: isDarkMode ? '#0a5a5a' : '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : colors.cardBorder,
  },
  dropdownTitle: {
    fontSize: fonts.h4,
    fontWeight: '700',
    color: colors.textWhite,
    textAlign: 'center',
    marginBottom: 12,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dropdownIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textWhite,
  },
});

export default DigitalVaultScreen;
