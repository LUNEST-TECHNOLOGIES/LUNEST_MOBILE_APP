import { useLocalSearchParams, useRouter } from "expo-router";
import ResetPasswordScreen from "../src/screens/auth/ResetPasswordScreen";

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const token = params.token || '';
  const email = params.email || '';

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/login');
    }
  };

  const handleSuccess = () => {
    router.replace('/login');
  };

  return (
    <ResetPasswordScreen
      token={token}
      email={email}
      onBack={handleBack}
      onSuccess={handleSuccess}
    />
  );
}
