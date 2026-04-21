/**
 * Create Listing Not Found Screen
 * Handles routing errors within the create-listing flow
 * 
 * Ensures that when a routing error occurs during listing creation,
 * the user stays in Host mode and is redirected to appropriate screens.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react-native';

// Error Screen Component

export default function CreateListingNotFoundScreen() {
  const router = useRouter();

  // Go back to listings screen (Host mode)
  const handleGoToListings = () => {
    // Navigate to host-tabs listings since create-listing is a host feature
    router.replace('/(host-tabs)/listings');
  };

  // Start fresh listing creation
  const handleStartFresh = () => {
    router.replace('/create-listing');
  };

  // Try to go back
  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Can't go back, go to listings
      handleGoToListings();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Warning Icon */}
        <View style={styles.iconContainer}>
          <AlertTriangle size={60} color="#FDAE31" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Step Not Found</Text>

        {/* Description */}
        <Text style={styles.description}>
          We couldn&apos;t find this listing step. Your progress may have been saved as a draft.
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* Go Back Button */}
          <TouchableOpacity style={styles.secondaryButton} onPress={handleGoBack}>
            <ArrowLeft size={18} color="#010135" />
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>

          {/* Start Fresh Button */}
          <TouchableOpacity style={styles.outlineButton} onPress={handleStartFresh}>
            <Text style={styles.outlineButtonText}>Start New Listing</Text>
          </TouchableOpacity>

          {/* Go to Listings Button */}
          <TouchableOpacity style={styles.primaryButton} onPress={handleGoToListings}>
            <Home size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Go to My Listings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    fontWeight: '400',
    
    color: '#656565',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#010135',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#010135',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    
    color: '#010135',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  outlineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    
    color: '#656565',
  },
});
