import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import Toast from '../src/components/common/Toast';
import ResetVerificationScreen from '../src/screens/auth/ResetVerificationScreen';
import SignupVerificationScreen from '../src/screens/auth/SignupVerificationScreen';
import authService from '../src/services/authService';

export default function VerifyCode() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = params.email || '';
    const flow = params.flow || 'reset'; // 'registration' or 'reset'
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendTimer, setResendTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

    // Countdown timer for resend
    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [resendTimer]);

    const handleVerify = async (fullCode) => {
        if (fullCode.length !== 4) {
            setError('Please enter the 4-digit code');
            return;
        }

        setIsLoading(true);
        setError('');
        let successResult = false;

        try {
            console.log(`[VerifyCode] Verifying code for flow: ${flow}`);
            let result;
            
            if (flow === 'registration') {
                result = await authService.verifyRegistrationOtp(email, fullCode);
            } else {
                result = await authService.verifyResetCode(email, fullCode);
            }

            if (result.success) {
                successResult = true;
                if (flow === 'registration') {
                    // Show success toast and wait ("spent log in")
                    setToast({
                        visible: true,
                        message: 'Email verified, proceeding to login...',
                        type: 'success'
                    });
                    
                    // Keep loading spinner active during transition
                    setIsLoading(true);
                    
                    setTimeout(() => {
                        router.replace('/(tabs)');
                    }, 2000);
                } else {
                    // Navigate to reset password
                    const token = result.token || (result.data && result.data.token);
                    router.push({
                        pathname: '/reset-password',
                        params: { token, email },
                    });
                }
            } else {
                setError(result.message || 'Invalid code. Please try again.');
            }
        } catch (err) {
            console.error('Verify code error:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            // Only stop loading if we're not in the middle of a success transition for registration
            if (!(flow === 'registration' && successResult)) {
                setIsLoading(false);
            }
        }
    };

    const handleResend = async () => {
        if (!canResend) return;

        setIsLoading(true);
        setError('');

        try {
            let result;
            if (flow === 'registration') {
                result = await authService.sendVerificationOtp(email);
            } else {
                result = await authService.forgotPassword(email);
            }
            
            if (result.success) {
                setResendTimer(60);
                setCanResend(false);
            } else {
                setError(result.message || 'Failed to resend code.');
            }
        } catch (err) {
            setError('Failed to resend code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/login');
        }
    };

    return (
        <>
            {flow === 'registration' ? (
                <SignupVerificationScreen
                    email={email}
                    onVerify={handleVerify}
                    onResend={handleResend}
                    onBack={handleBack}
                    isLoading={isLoading}
                    error={error}
                    resendTimer={resendTimer}
                    canResend={canResend}
                />
            ) : (
                <ResetVerificationScreen
                    email={email}
                    onVerify={handleVerify}
                    onResend={handleResend}
                    onBack={handleBack}
                    isLoading={isLoading}
                    error={error}
                    resendTimer={resendTimer}
                    canResend={canResend}
                />
            )}
            
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </>
    );
}
