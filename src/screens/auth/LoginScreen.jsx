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
import Svg, { Path } from 'react-native-svg';
import { useUserMode } from '../../context';
import authService from '../../services/authService';

/**
 * Back Arrow Icon
 */
const BackArrowIcon = ({ size = 24, color = 'white' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.0003 20.67C14.8103 20.67 14.6203 20.6 14.4703 20.45L7.95027 13.93C6.89027 12.87 6.89027 11.13 7.95027 10.07L14.4703 3.55002C14.7603 3.26002 15.2403 3.26002 15.5303 3.55002C15.8203 3.84002 15.8203 4.32002 15.5303 4.61002L9.01027 11.13C8.53027 11.61 8.53027 12.39 9.01027 12.87L15.5303 19.39C15.8203 19.68 15.8203 20.16 15.5303 20.45C15.3803 20.59 15.1903 20.67 15.0003 20.67Z"
      fill={color}
    />
  </Svg>
);

/**
 * Google Icon
 */
const GoogleIcon = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21.8055 10.0415H21V10H12V14H17.6515C16.827 16.3285 14.6115 18 12 18C8.6865 18 6 15.3135 6 12C6 8.6865 8.6865 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C6.4775 2 2 6.4775 2 12C2 17.5225 6.4775 22 12 22C17.5225 22 22 17.5225 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z"
      fill="#FFC107"
    />
    <Path
      d="M3.15295 7.3455L6.43845 9.755C7.32745 7.554 9.48045 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C8.15895 2 4.82795 4.1685 3.15295 7.3455Z"
      fill="#FF3D00"
    />
    <Path
      d="M12 22C14.583 22 16.93 21.0115 18.7045 19.404L15.6095 16.785C14.5718 17.5742 13.3038 18.001 12 18C9.39903 18 7.19053 16.3415 6.35853 14.027L3.09753 16.5395C4.75253 19.778 8.11353 22 12 22Z"
      fill="#4CAF50"
    />
    <Path
      d="M21.8055 10.0415H21V10H12V14H17.6515C17.2571 15.1082 16.5467 16.0766 15.608 16.7855L15.6095 16.7845L18.7045 19.4035C18.4855 19.6025 22 17 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z"
      fill="#1976D2"
    />
  </Svg>
);

/**
 * Apple Icon
 */
const AppleIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.05 20.28C16.07 21.23 15 21.08 13.97 20.63C12.88 20.17 11.88 20.15 10.73 20.63C9.28998 21.25 8.52998 21.07 7.66998 20.28C2.78998 15.25 3.50998 7.59 9.04998 7.31C10.4 7.38 11.34 8.05 12.13 8.11C13.31 7.87 14.44 7.18 15.7 7.27C17.21 7.39 18.35 7.99 19.1 9.07C15.98 10.94 16.72 15.05 19.58 16.2C19.01 17.7 18.27 19.19 17.04 20.29L17.05 20.28ZM12.03 7.25C11.88 5.02 13.69 3.18 15.77 3C16.06 5.58 13.43 7.5 12.03 7.25Z"
      fill={color}
    />
  </Svg>
);

/**
 * Success Checkmark Icon
 */
const SuccessCheckIcon = ({ size = 60 }) => (
  <Svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <Path
      d="M30 55C43.8071 55 55 43.8071 55 30C55 16.1929 43.8071 5 30 5C16.1929 5 5 16.1929 5 30C5 43.8071 16.1929 55 30 55Z"
      fill="#4CAF50"
    />
    <Path
      d="M26.25 38.75L17.5 30L20.0375 27.4625L26.25 33.6625L39.9625 19.95L42.5 22.5L26.25 38.75Z"
      fill="white"
    />
  </Svg>
);

/**
 * Checkbox Icon
 */
const CheckIcon = ({ size = 16, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9.55 18L3.85 12.3L5.275 10.875L9.55 15.15L18.725 5.975L20.15 7.4L9.55 18Z"
      fill={color}
    />
  </Svg>
);

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
          // Check for verification required
          if (result.status === 403 && result.data?.actionRequired === 'VERIFY_OTP') {
            console.log('📍 [LoginScreen] Email not verified. Redirecting to OTP screen...');
            const unverifiedEmail = result.data.email || email;
            
            setToast({ 
              visible: true, 
              type: 'error', 
              message: 'Please verify your email address to continue.' 
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
            }, 1500);
            return;
          }

          // Show the actual error message from authService
          const errorMsg = result.message || 'Login failed. Please try again.';
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
