import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import InfoCircleIcon from '../../../assets/icons/bookings/circle-info.svg';

const RefundPolicyNotice = ({ onViewPolicy }) => {
  // Info Circle Icon Component
  const InfoCircleIconComponent = () => {
    return <InfoCircleIcon width={15} height={15} color="#FD3131" />;
  };

  return (
    <Pressable style={styles.policyNotice} onPress={onViewPolicy}>
      <View style={styles.policyIconContainer}>
        <BlurView intensity={20} tint="light" style={styles.policyBlur}>
          <InfoCircleIconComponent />
        </BlurView>
      </View>
      <Text style={styles.policyText}>
        <Text style={styles.policyWarning}>This booking is non-refundable. </Text>
        <Text style={styles.policyLink}>View Policy</Text>
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  policyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 30,
    paddingHorizontal: 20,
    width: '100%',
  },
  policyIconContainer: {
    width: 18,
    height: 18,
    borderRadius: 20,
    overflow: 'hidden',
  },
  policyBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  policyText: {
    fontSize: 12,
    flex: 1,
  },
  policyWarning: {
    color: '#FD3131',
  },
  policyLink: {
    color: '#010135',
    fontWeight: '500',
  },
});

export default RefundPolicyNotice;
