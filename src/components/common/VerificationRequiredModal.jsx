import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

/**
 * VerificationRequiredModal
 * A premium, high-fidelity modal shown when users need to verify identity 
 * before accessing certain features (like host application).
 */
const VerificationRequiredModal = ({ 
  visible, 
  onClose, 
  onVerify,
  title = "Identity Verification Needed",
  description = "To ensure the safety of our community, we require all hosts to verify their identity before listing properties."
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      headerTransparent={true}
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        )}

        <View style={styles.container}>
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          {/* Visual Icon Section */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
               <Ionicons name="shield-checkmark" size={50} color="#007BFF" />
            </View>
            <View style={styles.pulseContainer}>
               <View style={styles.pulse} />
            </View>
          </View>

          {/* Text Content */}
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>
              {description}
            </Text>
          </View>

          {/* Featured List */}
          <View style={styles.features}>
            <View style={styles.featureItem}>
               <Ionicons name="checkmark-circle" size={20} color="#10B981" />
               <Text style={styles.featureText}>Build trust with guests</Text>
            </View>
            <View style={styles.featureItem}>
               <Ionicons name="checkmark-circle" size={20} color="#10B981" />
               <Text style={styles.featureText}>Protect your account</Text>
            </View>
            <View style={styles.featureItem}>
               <Ionicons name="checkmark-circle" size={20} color="#10B981" />
               <Text style={styles.featureText}>Access instant payouts</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.verifyButton} 
              onPress={onVerify}
              activeOpacity={0.8}
            >
              <Text style={styles.verifyButtonText}>Verify Identity Now</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.notNowButton} 
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.notNowButtonText}>Maybe Later</Text>
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
    paddingBottom: 32,
    paddingTop: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 4,
  },
  iconContainer: {
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  pulseContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#007BFF',
    opacity: 0.2,
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 16,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 10,
    fontWeight: '500',
  },
  footer: {
    width: '100%',
    gap: 12,
  },
  verifyButton: {
    backgroundColor: '#007BFF',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#007BFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  notNowButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  notNowButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default VerificationRequiredModal;
