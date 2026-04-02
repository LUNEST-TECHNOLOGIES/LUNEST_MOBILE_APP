import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import SkeletonPlaceholder from './SkeletonPlaceholder';

const { width } = Dimensions.get('window');

/**
 * BookingFormSkeleton - Loading state for booking form
 */
export const BookingFormSkeleton = () => (
  <View style={styles.container}>
    {/* Property Summary Card */}
    <SkeletonPlaceholder>
      <View style={styles.propertyCard}>
        <View style={styles.propertyImage} />
        <View style={styles.propertyInfo}>
          <View style={styles.propertyTitle} />
          <View style={styles.propertyLocation} />
        </View>
      </View>
    </SkeletonPlaceholder>

    {/* Date Selection Section */}
    <SkeletonPlaceholder>
      <View style={styles.sectionTitle} />
    </SkeletonPlaceholder>
    <View style={styles.datesRow}>
      <SkeletonPlaceholder>
        <View style={styles.dateBox} />
      </SkeletonPlaceholder>
      <SkeletonPlaceholder>
        <View style={styles.arrow} />
      </SkeletonPlaceholder>
      <SkeletonPlaceholder>
        <View style={styles.dateBox} />
      </SkeletonPlaceholder>
    </View>

    {/* Guest Selection */}
    <SkeletonPlaceholder>
      <View style={styles.sectionTitle} />
    </SkeletonPlaceholder>
    <SkeletonPlaceholder>
      <View style={styles.guestSelector} />
    </SkeletonPlaceholder>

    {/* Price Breakdown */}
    <SkeletonPlaceholder>
      <View style={styles.sectionTitle} />
    </SkeletonPlaceholder>
    <View style={styles.priceBreakdown}>
      <View style={styles.priceRow}>
        <SkeletonPlaceholder><View style={styles.priceLabel} /></SkeletonPlaceholder>
        <SkeletonPlaceholder><View style={styles.priceValue} /></SkeletonPlaceholder>
      </View>
      <View style={styles.priceRow}>
        <SkeletonPlaceholder><View style={styles.priceLabel} /></SkeletonPlaceholder>
        <SkeletonPlaceholder><View style={styles.priceValue} /></SkeletonPlaceholder>
      </View>
      <View style={styles.priceRow}>
        <SkeletonPlaceholder><View style={styles.priceLabel} /></SkeletonPlaceholder>
        <SkeletonPlaceholder><View style={styles.priceValue} /></SkeletonPlaceholder>
      </View>
      <View style={styles.divider} />
      <View style={styles.priceRow}>
        <SkeletonPlaceholder><View style={styles.totalLabel} /></SkeletonPlaceholder>
        <SkeletonPlaceholder><View style={styles.totalValue} /></SkeletonPlaceholder>
      </View>
    </View>

    {/* Payment Button */}
    <SkeletonPlaceholder>
      <View style={styles.payButton} />
    </SkeletonPlaceholder>
  </View>
);

/**
 * PaymentMethodSkeleton - Loading state for payment method selection
 */
export const PaymentMethodSkeleton = () => (
  <View style={styles.container}>
    {/* Balance Card */}
    <SkeletonPlaceholder>
      <View style={styles.balanceCard}>
        <View style={styles.balanceLabel} />
        <View style={styles.balanceAmount} />
      </View>
    </SkeletonPlaceholder>

    {/* Payment Options */}
    <SkeletonPlaceholder>
      <View style={styles.sectionTitle} />
    </SkeletonPlaceholder>
    <View style={styles.paymentOptions}>
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonPlaceholder key={i}>
          <View style={styles.paymentOption} />
        </SkeletonPlaceholder>
      ))}
    </View>

    {/* Add New Card Button */}
    <SkeletonPlaceholder>
      <View style={styles.addCardButton} />
    </SkeletonPlaceholder>
  </View>
);

/**
 * WalletSkeleton - Loading state for wallet screen
 */
export const WalletSkeleton = () => (
  <View style={styles.container}>
    {/* Balance Section */}
    <SkeletonPlaceholder>
      <View style={styles.walletBalanceCard}>
        <View style={styles.walletLabel} />
        <View style={styles.walletAmount} />
        <View style={styles.walletActions}>
          <View style={styles.actionButton} />
          <View style={styles.actionButton} />
        </View>
      </View>
    </SkeletonPlaceholder>

    {/* Transactions Header */}
    <View style={styles.transactionsHeader}>
      <SkeletonPlaceholder><View style={styles.transactionsTitle} /></SkeletonPlaceholder>
      <SkeletonPlaceholder><View style={styles.filterButton} /></SkeletonPlaceholder>
    </View>

    {/* Transaction Items */}
    {Array.from({ length: 5 }).map((_, i) => (
      <SkeletonPlaceholder key={i}>
        <View style={styles.transactionItem}>
          <View style={styles.transactionIcon} />
          <View style={styles.transactionInfo}>
            <View style={styles.transactionTitle} />
            <View style={styles.transactionDate} />
          </View>
          <View style={styles.transactionAmount} />
        </View>
      </SkeletonPlaceholder>
    ))}
  </View>
);

/**
 * ProfileSkeleton - Loading state for profile screen
 */
export const ProfileSkeleton = () => (
  <View style={styles.container}>
    {/* Header */}
    <View style={styles.profileHeader}>
      <SkeletonPlaceholder>
        <View style={styles.profileAvatar} />
      </SkeletonPlaceholder>
      <SkeletonPlaceholder>
        <View style={styles.profileName} />
      </SkeletonPlaceholder>
      <SkeletonPlaceholder>
        <View style={styles.profileEmail} />
      </SkeletonPlaceholder>
    </View>

    {/* Stats Row */}
    <View style={styles.statsRow}>
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonPlaceholder key={i}>
          <View style={styles.statBox}>
            <View style={styles.statValue} />
            <View style={styles.statLabel} />
          </View>
        </SkeletonPlaceholder>
      ))}
    </View>

    {/* Menu Items */}
    <View style={styles.menuSection}>
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonPlaceholder key={i}>
          <View style={styles.menuItem}>
            <View style={styles.menuIcon} />
            <View style={styles.menuText} />
            <View style={styles.menuArrow} />
          </View>
        </SkeletonPlaceholder>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  // Booking form styles
  propertyCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  propertyImage: {
    width: 80,
    height: 80,
    backgroundColor: '#E1E9EE',
    borderRadius: 8,
  },
  propertyInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
    gap: 8,
  },
  propertyTitle: {
    width: '80%',
    height: 18,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  propertyLocation: {
    width: '60%',
    height: 14,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  sectionTitle: {
    width: 120,
    height: 18,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
    marginBottom: 12,
    marginTop: 8,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dateBox: {
    width: (width - 80) / 2,
    height: 60,
    backgroundColor: '#E1E9EE',
    borderRadius: 8,
  },
  arrow: {
    width: 24,
    height: 24,
    backgroundColor: '#E1E9EE',
    borderRadius: 12,
  },
  guestSelector: {
    width: '100%',
    height: 56,
    backgroundColor: '#E1E9EE',
    borderRadius: 8,
    marginBottom: 24,
  },
  priceBreakdown: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    width: 100,
    height: 16,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  priceValue: {
    width: 80,
    height: 16,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E1E9EE',
    marginVertical: 8,
  },
  totalLabel: {
    width: 80,
    height: 20,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  totalValue: {
    width: 100,
    height: 20,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  payButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#E1E9EE',
    borderRadius: 12,
  },
  // Payment method styles
  balanceCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  balanceLabel: {
    width: 100,
    height: 16,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  balanceAmount: {
    width: 150,
    height: 32,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  paymentOptions: {
    gap: 12,
    marginBottom: 24,
  },
  paymentOption: {
    width: '100%',
    height: 72,
    backgroundColor: '#E1E9EE',
    borderRadius: 12,
  },
  addCardButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#E1E9EE',
    borderRadius: 12,
  },
  // Wallet styles
  walletBalanceCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  walletLabel: {
    width: 100,
    height: 14,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  walletAmount: {
    width: 180,
    height: 40,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  walletActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  actionButton: {
    width: 120,
    height: 40,
    backgroundColor: '#E1E9EE',
    borderRadius: 20,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionsTitle: {
    width: 100,
    height: 20,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  filterButton: {
    width: 60,
    height: 32,
    backgroundColor: '#E1E9EE',
    borderRadius: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E1E9EE',
  },
  transactionInfo: {
    flex: 1,
    gap: 6,
  },
  transactionTitle: {
    width: '70%',
    height: 16,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  transactionDate: {
    width: 80,
    height: 12,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  transactionAmount: {
    width: 80,
    height: 18,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  // Profile styles
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E1E9EE',
  },
  profileName: {
    width: 150,
    height: 22,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  profileEmail: {
    width: 200,
    height: 14,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
    marginBottom: 24,
  },
  statBox: {
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    width: 40,
    height: 24,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  statLabel: {
    width: 60,
    height: 12,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  menuSection: {
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 12,
  },
  menuIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#E1E9EE',
  },
  menuText: {
    flex: 1,
    height: 18,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  menuArrow: {
    width: 20,
    height: 20,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
});

export default {
  BookingFormSkeleton,
  PaymentMethodSkeleton,
  WalletSkeleton,
  ProfileSkeleton,
};
