import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppleIcon, BackArrowIcon, CheckIcon, GoogleIcon } from '../../components/auth';
import { useUserMode } from '../../context';
import authService from '../../services/authService';

/**
 * Login Screen
 * User login with email and password
 * Same header style as Signup screen
 */
const LoginScreen = ({ onBack, onSignup, onForgotPassword, onLoginSuccess }) => {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const { refreshHostStatus } = useUserMode();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });

  // Validation errors state
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  // Responsive calculations
  const contentPadding = width * 0.06;
  const headerImageHeight = 90;

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
    };
    let isValid = true;

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Clear error when user starts typing
  const handleFieldChange = (field, value, setter) => {
    setter(value);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const handleLogin = async () => {
    if (validateForm()) {
      setIsLoading(true);
      try {
        console.log('🚀 [LoginScreen] Initiating login...');
        const result = await authService.login({
          email,
          password,
          rememberMe,
        });

        console.log('📊 [LoginScreen] Login result received:', result);
        console.log('📊 [LoginScreen] Result type:', typeof result);
        console.log('📊 [LoginScreen] Result.success:', result?.success);

        if (result && result.success) {
          // Show success toast and auto-redirect after 1.5 seconds
          console.log('✅ [LoginScreen] Login successful!');
          if (refreshHostStatus) {
            await refreshHostStatus();
          }
          setToast({ visible: true, type: 'success', message: 'Login successful! Welcome back.' });
          setTimeout(() => {
            setToast({ visible: false, type: 'success', message: '' });
            if (onLoginSuccess) {
              console.log('📍 [LoginScreen] Calling onLoginSuccess callback');
              onLoginSuccess();
            } else {
              console.log('📍 [LoginScreen] Navigating to home tabs');
              router.replace('/(tabs)');
            }
          }, 1500);
        } else if (result) {
          // Check for verification required (robust status and message check)
          let errorMsg = result.message || '';
          const isUnverified = (result.status === 403 && result.data?.actionRequired === 'VERIFY_OTP') || 
                               errorMsg.toLowerCase().includes('verify your email');

          if (isUnverified) {
            console.log('📍 [LoginScreen] Email not verified. Resending OTP and redirecting...');
            const unverifiedEmail = result.data?.email || email;
            
            // Automatically resend verification OTP
            try {
              await authService.sendVerificationOtp(unverifiedEmail);
            } catch (resendError) {
              console.warn('[LoginScreen] Auto-resend OTP failed:', resendError);
            }

            setToast({ 
              visible: true, 
              type: 'error', 
              message: 'Email not verified. A new code has been sent. Redirecting to verification...' 
            });

            setTimeout(() => {
              setToast({ visible: false, type: 'error', message: '' });
              router.push({
                pathname: '/verify-code',
                params: { 
                  email: unverifiedEmail,
                  flow: 'registration'
                }
              });
            }, 2000);
            return;
          }

          // Show the actual error message from authService
          errorMsg = result.message || 'Login failed. Please try again.';
          console.log('❌ [LoginScreen] Login failed:', errorMsg);
          setToast({ visible: true, type: 'error', message: errorMsg });
          setTimeout(() => setToast({ visible: false, type: 'error', message: '' }), 4000);
        } else {
          // Result is null or undefined
          console.error('🔴 [LoginScreen] Null result from authService');
          setToast({ visible: true, type: 'error', message: 'Unexpected response from login service' });
          setTimeout(() => setToast({ visible: false, type: 'error', message: '' }), 4000);
        }
      } catch (error) {
        console.error('🔴 [LoginScreen] Unexpected error in handleLogin:', error);
        console.error('🔴 [LoginScreen] Error message:', error?.message);
        console.error('🔴 [LoginScreen] Error stack:', error?.stack?.split('\n')[0]);
        setToast({ visible: true, type: 'error', message: 'An unexpected error occurred. Please try again.' });
        setTimeout(() => setToast({ visible: false, type: 'error', message: '' }), 4000);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSignupPress = () => {
    if (onSignup) {
      onSignup();
    } else {
      router.push('/signup');
    }
  };

  const handleForgotPassword = () => {
    if (onForgotPassword) {
      onForgotPassword();
    } else {
      router.push('/forgot-password');
    }
  };

  // Toast auto-hides, no manual confirm needed

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Fixed Header with Image Background - Same as Signup */}
      <View style={[styles.header, { height: headerImageHeight }]}>
        <Image
          source={require('../../assets/images/LUNEST ICON12 1.png')}
          style={styles.headerImage}
          resizeMode="cover"
        />
        
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <BackArrowIcon size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: contentPadding },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Login</Text>
            <Text style={styles.subtitle}>
              Welcome back, let's find your perfect stay.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Email address"
                placeholderTextColor="#656565"
                value={email}
                onChangeText={(value) => handleFieldChange('email', value, setEmail)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            {/* Password */}
            <View style={styles.inputWrapper}>
              <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor="#656565"
                  value={password}
                  onChangeText={(value) => handleFieldChange('password', value, setPassword)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {/* Remember Me & Forgot Password */}
            <View style={styles.optionsRow}>
              <TouchableOpacity 
                style={styles.rememberMe}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <CheckIcon size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.rememberMeText}>Remember me</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                <Text style={styles.forgotPassword}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={[styles.socialButton, styles.socialButtonFirst]}
              activeOpacity={0.8}
            >
              <GoogleIcon size={24} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.socialButton, styles.socialButtonSecond]}
              activeOpacity={0.8}
            >
              <AppleIcon size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          {/* Signup Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account?</Text>
            <TouchableOpacity onPress={handleSignupPress} activeOpacity={0.7}>
              <Text style={styles.signupLink}> Signup.</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast Notification */}
      {toast.visible && (
        <View style={[
          styles.toastContainer,
          toast.type === 'success' ? styles.toastSuccess : styles.toastError
        ]}>
          <View style={styles.toastContent}>
            {toast.type === 'success' ? (
              <View style={styles.toastIconSuccess}>
                <CheckIcon size={14} color="#FFFFFF" />
              </View>
            ) : (
              <View style={styles.toastIconError}>
                <Text style={styles.toastIconErrorText}>!</Text>
              </View>
            )}
            <Text style={styles.toastMessage}>{toast.message}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#010135',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  titleContainer: {
    marginBottom: 32,
    alignItems: 'flex-start',
    marginTop: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    
    color: '#000000',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 14,
    
    color: '#656565',
  },
  form: {
    marginBottom: 32,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#b0b0b0',
    borderRadius: 25,
    paddingHorizontal: 18,
    fontSize: 12,
    
    color: '#000000',
    backgroundColor: '#F6F6F6',
  },
  inputError: {
    borderColor: '#DC3545',
  },
  errorText: {
    fontSize: 12,
    
    color: '#DC3545',
    marginLeft: 18,
    marginTop: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b0b0b0',
    borderRadius: 25,
    backgroundColor: '#F6F6F6',
  },
  passwordInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 18,
    fontSize: 12,
    
    color: '#000000',
  },
  eyeButton: {
    paddingHorizontal: 16,
    height: 46,
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: 14,
    
    color: '#192DFF',
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#888888',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#192DFF',
    borderColor: '#192DFF',
  },
  rememberMeText: {
    fontSize: 12,
    
    color: '#000000',
    textDecorationLine: 'underline',
  },
  forgotPassword: {
    fontSize: 12,
    
    color: '#0E4C9A',
  },
  loginButton: {
    backgroundColor: '#010135',
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    
    color: '#FFFFFF',
    lineHeight: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  dividerText: {
    fontSize: 14,
    
    color: '#9E9E9E',
    marginHorizontal: 16,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  socialButtonFirst: {
    marginRight: 8,
  },
  socialButtonSecond: {
    marginLeft: 8,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    
    color: '#000000',
  },
  signupLink: {
    fontSize: 14,
    
    color: '#0E4C9A',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  // Toast Notification Styles
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1000,
  },
  toastSuccess: {
    backgroundColor: '#4CAF50',
  },
  toastError: {
    backgroundColor: '#F44336',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastIconSuccess: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toastIconError: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toastIconErrorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toastMessage: {
    flex: 1,
    fontSize: 14,
    
    fontWeight: '500',
    color: '#FFFFFF',
  },
});

export default LoginScreen;
