import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import OnboardingScreen from '../src/screens/onboarding/OnboardingScreen';

const ONBOARDING_KEY = '@lunest_onboarding_complete';

export default function Onboarding() {
  const router = useRouter();

  const markOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  };

  const handleOnboardingComplete = async () => {
    await markOnboardingComplete();
    router.replace('/login');
  };

  const handleSignup = async () => {
    await markOnboardingComplete();
    router.push('/signup');
  };

  const handleLogin = async () => {
    await markOnboardingComplete();
    router.push('/login');
  };

  return (
    <OnboardingScreen 
      onComplete={handleOnboardingComplete}
      onSignup={handleSignup}
      onLogin={handleLogin}
    />
  );
}
