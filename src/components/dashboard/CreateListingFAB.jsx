/**
 * Create Listing FAB (Floating Action Button) Component
 * Matches the style from HostListingsScreen
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

// Plus icon
const PlusIcon = ({ size = 20, color = '#FFFFFF' }) => (
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

const CreateListingFAB = ({ onPress }) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigate to create listing flow
      router.push('/create-listing');
    }
  };

  return (
    <TouchableOpacity style={styles.fab} onPress={handlePress}>
      <Text style={styles.fabText}>Create new Listing</Text>
      <View style={styles.fabIconContainer}>
        <PlusIcon size={20} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#779EFF',
    borderRadius: 30,
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 5,
    gap: 10,
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  fabText: {
    fontSize: 14,
    fontWeight: '600',
    
    color: '#000000',
  },
  fabIconContainer: {
    width: 33,
    height: 33,
    borderRadius: 20,
    backgroundColor: '#010135',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CreateListingFAB;
