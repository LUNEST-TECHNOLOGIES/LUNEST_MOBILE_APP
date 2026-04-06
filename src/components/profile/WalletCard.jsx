import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { formatAmount } from '../../utils/currency';
import Skeleton from '../common/Skeleton';

/**
 * Download/Add Icon
 */
const AddFundsIcon = ({ size = 18, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5V19M5 12H19"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Withdraw Icon
 */
const WithdrawIcon = ({ size = 18, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 19V5M12 5L5 12M12 5L19 12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Chevron Right Icon
 */
const ChevronRightIcon = ({ size = 14, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18L15 12L9 6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Copy Icon
 */
const CopyIcon = ({ size = 17, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 9H11C9.89543 9 9 9.89543 9 11V20C9 21.1046 9.89543 22 11 22H20C21.1046 22 22 21.1046 22 20V11C22 9.89543 21.1046 9 20 9Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Eye Icon (for showing balance)
 */
const EyeIcon = ({ size = 17, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Eye Off Icon (for hiding balance)
 */
const EyeOffIcon = ({ size = 17, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.94 17.94C16.2306 19.243 14.1491 19.9649 12 20C5 20 1 12 1 12C2.24389 9.68192 3.96914 7.65663 6.06 6.06M9.9 4.24C10.5883 4.07888 11.2931 3.99834 12 4C19 4 23 12 23 12C22.393 13.1356 21.6691 14.2047 20.84 15.19M14.12 14.12C13.8454 14.4148 13.5141 14.6512 13.1462 14.8151C12.7782 14.9791 12.3809 15.0673 11.9781 15.0744C11.5753 15.0815 11.1752 15.0074 10.8016 14.8565C10.4281 14.7056 10.0887 14.4811 9.80385 14.1962C9.51897 13.9113 9.29439 13.5719 9.14351 13.1984C8.99262 12.8248 8.91853 12.4247 8.92563 12.0219C8.93274 11.6191 9.02091 11.2218 9.18488 10.8538C9.34884 10.4859 9.58525 10.1546 9.88 9.88"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M1 1L23 23"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Checkmark Icon for copied toast
 */
const CheckIcon = ({ size = 16, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17L4 12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Wallet Card Component
 * Displays wallet balance with add funds and withdraw options
 */
const WalletCard = ({
  balance = 1200000,
  currency = '₦',
  accountNumber = '1234567890',
  onAddFunds,
  onWithdraw,
  onViewTransactions,
  onCopyAccount,
  isLoading = false,
}) => {
  const { width } = useWindowDimensions();
  const containerWidth = Math.min(width - 40, 400);
  
  // State for balance visibility and copy toast
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const formatBalance = (amount) => {
    return formatAmount(amount);
  };

  const toggleBalanceVisibility = () => {
    setIsBalanceVisible(!isBalanceVisible);
  };

  const handleCopyAccount = async () => {
    try {
      await Clipboard.setStringAsync(accountNumber);
      setShowCopiedToast(true);
      setTimeout(() => {
        setShowCopiedToast(false);
      }, 1500);
      // Also call the passed handler if provided
      if (onCopyAccount) {
        onCopyAccount();
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  return (
    <View style={[styles.container, { width: containerWidth }]}>
      {/* Copied Toast */}
      {showCopiedToast && (
        <View style={styles.copiedToast}>
          <CheckIcon size={16} color="#FFFFFF" />
          <Text style={styles.copiedToastText}>Copied!</Text>
        </View>
      )}

      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.balanceLabelRow}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <TouchableOpacity onPress={toggleBalanceVisibility} activeOpacity={0.7}>
            {isBalanceVisible ? <EyeIcon size={17} /> : <EyeOffIcon size={17} />}
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.viewTransactions}
          onPress={onViewTransactions}
          activeOpacity={0.7}
        >
          <Text style={styles.viewTransactionsText}>View Transactions</Text>
          <ChevronRightIcon size={14} />
        </TouchableOpacity>
      </View>

      {/* Balance */}
      <View style={styles.balanceRow}>
        <View style={styles.balanceContainer}>
          <Text style={styles.currencySymbol}>{currency}</Text>
          {isLoading ? (
            <Skeleton width={100} height={24} style={{ borderRadius: 8 }} />
          ) : (
            <Text style={styles.balanceAmount}>
              {isBalanceVisible ? formatBalance(balance) : '****'}
            </Text>
          )}
        </View>
        <TouchableOpacity 
          style={styles.accountNumber}
          onPress={handleCopyAccount}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          {isLoading ? (
            <Skeleton width={80} height={16} />
          ) : (
            <>
              <Text style={styles.accountText}>#{accountNumber}</Text>
              <CopyIcon size={17} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onAddFunds}
          activeOpacity={0.8}
        >
          <AddFundsIcon size={18} />
          <Text style={styles.actionText}>Add Funds</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onWithdraw}
          activeOpacity={0.8}
        >
          <WithdrawIcon size={18} />
          <Text style={styles.actionText}>Withdraw</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E5EFFF',
    borderRadius: 10,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  copiedToast: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  copiedToastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#000000',
  },
  viewTransactions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewTransactionsText: {
    fontSize: 10,
    fontWeight: '500',
    
    color: '#000000',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    
    color: '#292929',
    marginRight: 4,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '700',
    
    color: '#292929',
  },
  accountNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountText: {
    fontSize: 12,
    fontWeight: '500',
    
    color: '#292929',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E2F5D',
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    minWidth: 100,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    
    color: '#FFFFFF',
  },
});

export default WalletCard;
