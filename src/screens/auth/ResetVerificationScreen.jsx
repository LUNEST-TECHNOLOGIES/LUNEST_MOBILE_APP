import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackArrowIcon } from "../../components/auth";


const ResetVerificationScreen = ({ email, onVerify, onResend, onBack, isLoading, error, resendTimer, canResend }) => {
    const headerImageHeight = 90; // Fixed height matching Login/Signup
    const [code, setCode] = useState(["", "", "", ""]);
    const [maskedEmail, setMaskedEmail] = useState("");

    const inputRefs = [
        useRef(null),
        useRef(null),
        useRef(null),
        useRef(null),
    ];

    useEffect(() => {
        if (email) {
            const [localPart, domain] = email.split('@');
            if (domain) {
                const maskedLocal = localPart.length > 3 ? localPart.substring(0, 3) + '***' : localPart + '***';
                setMaskedEmail(`${maskedLocal}@${domain}`);
            } else {
                setMaskedEmail(email);
            }
        }
    }, [email]);

    const handleCodeChange = (text, index) => {
        const cleanedText = text.replace(/[^0-9]/g, '');
        
        if (cleanedText.length <= 1) {
            const newCode = [...code];
            newCode[index] = cleanedText;
            setCode(newCode);

            if (cleanedText && index < 3) {
                inputRefs[index + 1].current?.focus();
            }

            if (cleanedText && index === 3) {
                const fullCode = [...newCode.slice(0, 3), cleanedText].join('');
                if (fullCode.length === 4) {
                    onVerify(fullCode);
                }
            }
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs[index - 1].current?.focus();
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Fixed Header with Image Background - Exactly like LoginScreen */}
            <View style={[styles.header, { height: headerImageHeight }]}>
                <Image
                    source={require("../../assets/images/LUNEST ICON12 1.png")}
                    style={styles.headerImage}
                    resizeMode="cover"
                />
                
                {/* Back Button */}
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={onBack}
                    activeOpacity={0.7}
                >
                    <BackArrowIcon size={24} color="white" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.contentContainer}>
                        {/* Header */}
                        <View style={styles.headerContainer}>
                            <Text style={styles.title}>Verification</Text>
                            <Text style={styles.subtitle}>
                                We have sent a 4-digit reset code to{' '}
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
                                <Pressable onPress={onResend} disabled={!canResend || isLoading}>
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
                            onPress={() => onVerify(code.join(''))}
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        width: '100%',
        overflow: 'hidden',
    },
    headerImage: {
        width: '100%',
        height: '100%',
    },
    backButton: {
        position: "absolute",
        top: 16,
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    headerContainer: {
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

export default ResetVerificationScreen;
