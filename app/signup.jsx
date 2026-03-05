import { useRouter } from 'expo-router';
import SignupScreen from '../src/screens/auth/SignupScreen';

export default function Signup() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleLogin = () => {
    router.replace('/login');
  };

  const handleSignupSuccess = () => {
    // After successful signup, redirect to home
    router.replace('/(tabs)/home');
  };

  return (
    <SignupScreen
      onBack={handleBack}
      onLogin={handleLogin}
      onSignupSuccess={handleSignupSuccess}
    />
  );
}
