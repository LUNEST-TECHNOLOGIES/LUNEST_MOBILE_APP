import { useRouter } from "expo-router";
import ForgotPasswordScreen from "../src/screens/auth/ForgotPasswordScreen";

export default function ForgotPassword() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login");
    }
  };

  const handleLogin = () => {
    router.replace("/login");
  };

  const handleSuccess = (email) => {
    router.push({
      pathname: "/verify-code",
      params: { email, flow: 'reset' },
    });
  };

  return (
    <ForgotPasswordScreen
      onBack={handleBack}
      onLogin={handleLogin}
      onForgotPasswordSuccess={handleSuccess}
    />
  );
}
