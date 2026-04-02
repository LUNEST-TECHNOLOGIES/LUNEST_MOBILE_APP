import { useRouter } from 'expo-router';
import LoginScreen from '../src/screens/auth/LoginScreen';

export default function Login() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleSignup = () => {
    router.replace('/signup');
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  const handleLoginSuccess = () => {
    // Navigate to main app after successful login
    router.replace('/(tabs)');
  };

  return (
    <LoginScreen
      onBack={handleBack}
      onSignup={handleSignup}
      onForgotPassword={handleForgotPassword}
      onLoginSuccess={handleLoginSuccess}
    />
  );
}
