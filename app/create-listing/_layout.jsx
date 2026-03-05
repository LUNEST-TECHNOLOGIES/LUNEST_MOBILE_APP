/**
 * Create Listing Flow Layout
 * Handles navigation between listing creation steps
 */

import { Stack } from 'expo-router';

export default function CreateListingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="intent" />
      <Stack.Screen name="property-details" />
      <Stack.Screen name="location" />
      <Stack.Screen name="amenities" />
      <Stack.Screen name="photos" />
      <Stack.Screen name="pricing" />
      <Stack.Screen name="availability" />
      <Stack.Screen name="house-rules" />
      <Stack.Screen name="terms-agreement" />
      <Stack.Screen name="review" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
