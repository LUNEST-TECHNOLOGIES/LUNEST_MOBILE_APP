import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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
import { PasswordRequirement } from '../../components/auth';
import authService from '../../services/authService';

const ResetPasswordScreen = ({ token, email, onBack, onSuccess }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Password validation
    const validatePassword = (pass) => {
        const minLength = pass.length >= 8;
        const hasUppercase = /[A-Z]/.test(pass);
        const hasLowercase = /[a-z]/.test(pass);
        const hasNumber = /[0-9]/.test(pass);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
        
        return {
            isValid: minLength && hasUppercase && hasLowercase && hasNumber && hasSpecial,
            minLength,
            hasUppercase,
            hasLowercase,
            hasNumber,
            hasSpecial,
        };
    };

    const passwordValidation = validatePassword(password);

    const handleResetPassword = async () => {
        setError('');

        if (!password) {
            setError('Please enter a new password');
            return;
        }

        if (!passwordValidation.isValid) {
            setError('Password does not meet requirements');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            const result = await authService.resetPassword(token, password);

            if (result.success) {
                setSuccess(true);
            } else {
                setError(result.message || 'Failed to reset password. Please try again.');
            }
        } catch (err) {
            console.error('Reset password error:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.successContainer}>
                    <View style={styles.successIcon}>
                        <Ionicons name="checkmark-circle" size={80} color="#28a745" />
                    </View>
                    <Text style={styles.successTitle}>Password Reset!</Text>
                    <Text style={styles.successText}>
                        Your password has been reset successfully.{'\n'}
                        You can now login with your new password.
                    </Text>
                    <Pressable style={styles.primaryButton} onPress={onSuccess}>
                        <Text style={styles.primaryButtonText}>Go to Login</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

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
                        <Pressable style={styles.backButton} onPress={onBack}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </Pressable>

                        {/* Header */}
                        <View style={styles.headerContainer}>
                            <Text style={styles.title}>Set New Password</Text>
                            <Text style={styles.subtitle}>
                                Create a strong password for your account
                            </Text>
                        </View>

                        {/* Error Message */}
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={18} color="#dc3545" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Form */}
                        <View style={styles.formContainer}>
                            {/* New Password */}
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>New Password</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter new password"
                                        placeholderTextColor="#999"
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            setError('');
                                        }}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={!isLoading}
                                    />
                                    <Pressable
                                        style={styles.eyeButton}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <Ionicons
                                            name={showPassword ? 'eye-off' : 'eye'}
                                            size={20}
                                            color="#666"
                                        />
                                    </Pressable>
                                </View>
                            </View>

                            {/* Password Requirements */}
                            {password.length > 0 && (
                                <View style={styles.requirementsContainer}>
                                    <PasswordRequirement
                                        met={passwordValidation.minLength}
                                        text="At least 8 characters"
                                    />
                                    <PasswordRequirement
                                        met={passwordValidation.hasUppercase}
                                        text="One uppercase letter"
                                    />
                                    <PasswordRequirement
                                        met={passwordValidation.hasLowercase}
                                        text="One lowercase letter"
                                    />
                                    <PasswordRequirement
                                        met={passwordValidation.hasNumber}
                                        text="One number"
                                    />
                                    <PasswordRequirement
                                        met={passwordValidation.hasSpecial}
                                        text="One special character"
                                    />
                                </View>
                            )}

                            {/* Confirm Password */}
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>Confirm Password</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            confirmPassword && password !== confirmPassword && styles.inputError
                                        ]}
                                        placeholder="Confirm new password"
                                        placeholderTextColor="#999"
                                        value={confirmPassword}
                                        onChangeText={(text) => {
                                            setConfirmPassword(text);
                                            setError('');
                                        }}
                                        secureTextEntry={!showConfirmPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={!isLoading}
                                    />
                                    <Pressable
                                        style={styles.eyeButton}
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        <Ionicons
                                            name={showConfirmPassword ? 'eye-off' : 'eye'}
                                            size={20}
                                            color="#666"
                                        />
                                    </Pressable>
                                </View>
                                {confirmPassword && password !== confirmPassword && (
                                    <Text style={styles.mismatchText}>Passwords do not match</Text>
                                )}
                            </View>
                        </View>

                        {/* Spacer */}
                        <View style={styles.spacer} />

                        {/* Reset Button */}
                        <Pressable
                            style={[
                                styles.primaryButton,
                                (isLoading || !passwordValidation.isValid || password !== confirmPassword) && 
                                styles.buttonDisabled
                            ]}
                            onPress={handleResetPassword}
                            disabled={isLoading || !passwordValidation.isValid || password !== confirmPassword}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.primaryButtonText}>Reset Password</Text>
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
    formContainer: {
        gap: 20,
    },
    inputWrapper: {
        gap: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f6f6f6',
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        paddingHorizontal: 20,
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 14,
        color: '#000',
    },
    inputError: {
        borderColor: '#dc3545',
    },
    eyeButton: {
        padding: 8,
    },
    mismatchText: {
        color: '#dc3545',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 10,
    },
    requirementsContainer: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 12,
        gap: 8,
    },
    requirementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    requirementText: {
        fontSize: 12,
        color: '#666',
    },
    requirementMet: {
        color: '#28a745',
    },
    spacer: {
        flex: 1,
        minHeight: 40,
    },
    primaryButton: {
        height: 50,
        width: '100%',
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
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    successIcon: {
        marginBottom: 30,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#000',
        marginBottom: 12,
        textAlign: 'center',
    },
    successText: {
        fontSize: 16,
        color: '#656565',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
});

export default ResetPasswordScreen;
