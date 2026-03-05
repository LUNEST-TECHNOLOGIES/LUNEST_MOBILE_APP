import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import authService from '../src/services/authService';

const VerifyCode = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const email = params.email || '';
    const flow = params.flow || 'reset'; // 'registration' or 'reset'
    
    const [code, setCode] = useState(['', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendTimer, setResendTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    
    const inputRefs = [
        useRef(null),
        useRef(null),
        useRef(null),
        useRef(null),
    ];

    // Mask email for display
    const maskedEmail = email ? maskEmail(email) : 'your email';

    function maskEmail(email) {
        const [localPart, domain] = email.split('@');
        if (!domain) return email;
        const maskedLocal = localPart.length > 3 ? localPart.substring(0, 3) + '***' : localPart + '***';
        return `${maskedLocal}@${domain}`;
    }

    // Countdown timer for resend
    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [resendTimer]);

    const handleCodeChange = (text, index) => {
        // Only allow numbers
        const cleanedText = text.replace(/[^0-9]/g, '');
        
        if (cleanedText.length <= 1) {
            const newCode = [...code];
            newCode[index] = cleanedText;
            setCode(newCode);
            setError('');

            // Auto-focus next input
            if (cleanedText && index < 3) {
                inputRefs[index + 1].current?.focus();
            }

            // Auto-submit when all 4 digits entered
            if (cleanedText && index === 3) {
                const fullCode = [...newCode.slice(0, 3), cleanedText].join('');
                if (fullCode.length === 4) {
                    handleVerify(fullCode);
                }
            }
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs[index - 1].current?.focus();
        }
    };

    const handleVerify = async (codeString = null) => {
        const fullCode = codeString || code.join('');
        
        if (fullCode.length !== 4) {
            setError('Please enter the 4-digit code');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            console.log(`[VerifyCode] Verifying code for flow: ${flow}`);
            let result;
            
            if (flow === 'registration') {
                result = await authService.verifyRegistrationOtp(email, fullCode);
            } else {
                result = await authService.verifyResetCode(email, fullCode);
            }

            if (result.success) {
                if (flow === 'registration') {
                    // Registration verified, user is authenticated in AuthService
                    // result.data should contain tokens and user
                    router.replace('/(tabs)');
                } else {
                    // Navigate to set new password screen with the reset token
                    const token = result.token || (result.data && (result.data.token || result.data.accessToken));
                    router.push({
                        pathname: '/reset-password',
                        params: { token, email },
                    });
                }
            } else {
                setError(result.message || 'Invalid code. Please try again.');
                // Clear code on error
                setCode(['', '', '', '']);
                inputRefs[0].current?.focus();
            }
        } catch (err) {
            console.error('Verify code error:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
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
                setCode(['', '', '', '']);
                inputRefs[0].current?.focus();
            } else {
                setError(result.message || 'Failed to resend code.');
            }
        } catch (err) {
            setError('Failed to resend code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackPress = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/login');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.content}>
                        {/* Back Button */}
                        <Pressable style={styles.backButton} onPress={handleBackPress}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </Pressable>

                        {/* Header */}
                        <View style={styles.headerContainer}>
                            <Text style={styles.title}>Verification</Text>
                            <Text style={styles.subtitle}>
                                We have sent a 4-digit code to{' '}
                                <Text style={styles.emailHighlight}>{maskedEmail}</Text>
                            </Text>
                        </View>

                        {/* Error Message */}
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={18} color="#dc3545" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Code Input */}
                        <View style={styles.codeContainer}>
                            <View style={styles.codeInputRow}>
                                {code.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={inputRefs[index]}
                                        style={[
                                            styles.codeInput,
                                            digit && styles.codeInputFilled,
                                            error && styles.codeInputError,
                                        ]}
                                        value={digit}
                                        onChangeText={(text) => handleCodeChange(text, index)}
                                        onKeyPress={(e) => handleKeyPress(e, index)}
                                        keyboardType="number-pad"
                                        maxLength={1}
                                        selectTextOnFocus
                                        editable={!isLoading}
                                    />
                                ))}
                            </View>

                            {/* Resend Code */}
                            <View style={styles.resendContainer}>
                                <Text style={styles.resendText}>
                                    Didn't get the code?{' '}
                                </Text>
                                <Pressable onPress={handleResend} disabled={!canResend || isLoading}>
                                    <Text style={[
                                        styles.resendLink,
                                        (!canResend || isLoading) && styles.resendLinkDisabled
                                    ]}>
                                        {canResend ? 'Resend' : `Resend in ${resendTimer}s`}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Spacer */}
                        <View style={styles.spacer} />

                        {/* Verify Button */}
                        <Pressable
                            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                            onPress={() => handleVerify()}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.primaryButtonText}>Verify</Text>
                            )}
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#010135',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    headerContainer: {
        marginTop: 40,
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 14,
        color: '#656565',
        lineHeight: 20,
    },
    emailHighlight: {
        color: '#0e4c9a',
        fontWeight: '500',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff5f5',
        padding: 12,
        borderRadius: 12,
        gap: 8,
        marginBottom: 20,
    },
    errorText: {
        color: '#dc3545',
        fontSize: 14,
        flex: 1,
    },
    codeContainer: {
        alignItems: 'center',
        gap: 25,
    },
    codeInputRow: {
        flexDirection: 'row',
        gap: 20,
    },
    codeInput: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#f6f6f6',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        color: '#000',
    },
    codeInputFilled: {
        borderColor: '#010135',
        backgroundColor: '#f0f0ff',
    },
    codeInputError: {
        borderColor: '#dc3545',
    },
    resendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    resendText: {
        fontSize: 14,
        color: '#656565',
    },
    resendLink: {
        fontSize: 14,
        color: '#0e4c9a',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    resendLinkDisabled: {
        color: '#999',
    },
    spacer: {
        flex: 1,
        minHeight: 40,
    },
    primaryButton: {
        height: 50,
        backgroundColor: '#010135',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    buttonDisabled: {
        backgroundColor: '#6c6c8a',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default VerifyCode;
