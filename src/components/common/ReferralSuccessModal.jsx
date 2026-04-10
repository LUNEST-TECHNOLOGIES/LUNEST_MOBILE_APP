import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

/**
 * ReferralSuccessModal
 * A celebratory modal shown when a referral link/code is successfully generated.
 */
const ReferralSuccessModal = ({ 
  visible, 
  onClose, 
  onShare, 
  onCopy,
  referralCode 
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        )}

        <View style={styles.container}>
          {/* Confetti / Sparkle Decor */}
          <View style={styles.sparkleContainer}>
             <Ionicons name="sparkles" size={40} color="#FFD700" style={styles.sparkle1} />
             <Ionicons name="sparkles" size={24} color="#FFD700" style={styles.sparkle2} />
          </View>

          {/* Icon Section */}
          <View style={styles.iconCircle}>
            <View style={styles.innerCircle}>
               <Ionicons name="gift" size={48} color="#007BFF" />
            </View>
          </View>

          {/* Text Content */}
          <Text style={styles.title}>You&apos;re all set! 🎁</Text>
          <Text style={styles.subtitle}>
            Your referral link is ready. Invite your friends to join Lunest and earn rewards together!
          </Text>

          {/* Code Box */}
          <View style={styles.codeBox}>
            <View>
               <Text style={styles.codeLabel}>REF CODE</Text>
               <Text style={styles.codeValue}>{referralCode || "------"}</Text>
            </View>
            <TouchableOpacity 
              style={styles.copyButton} 
              onPress={onCopy}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={20} color="#007BFF" />
              <Text style={styles.copyText}>Copy</Text>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.shareButton} 
              onPress={onShare}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>Share Referral Link</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.doneButton} 
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
    position: 'relative',
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    overflow: 'visible',
  },
  sparkle1: {
    position: 'absolute',
    top: 20,
    left: 40,
    transform: [{ rotate: '-15deg' }],
  },
  sparkle2: {
    position: 'absolute',
    top: 40,
    right: 50,
    transform: [{ rotate: '20deg' }],
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  innerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E1EFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  codeBox: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 32,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 2,
  },
  copyButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  copyText: {
    color: '#007BFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    width: '100%',
    gap: 12,
  },
  shareButton: {
    backgroundColor: '#000000',
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default ReferralSuccessModal;
