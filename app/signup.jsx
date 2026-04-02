import { useRouter } from 'expo-router';
import SignupScreen from '../src/screens/auth/SignupScreen';

export default function Signup() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleLogin = () => {
    router.replace('/login');
  };

  const handleSignupSuccess = () => {
    // After successful signup, redirect to home
    router.replace('/(tabs)');
  };

  return (
    <SignupScreen
      onBack={handleBack}
      onLogin={handleLogin}
      onSignupSuccess={handleSignupSuccess}
    />
  );
}
