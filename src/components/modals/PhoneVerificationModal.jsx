import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import authService from '../../services/authService';

/**
 * Success Checkmark Icon
 */
const SuccessCheckIcon = ({ size = 60 }) => (
  <Svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <Circle cx="30" cy="30" r="25" fill="#4CAF50" />
    <Path
      d="M26.25 38.75L17.5 30L20.0375 27.4625L26.25 33.6625L39.9625 19.95L42.5 22.5L26.25 38.75Z"
      fill="white"
    />
  </Svg>
);

/**
 * Close Icon
 */
const CloseIcon = ({ size = 24, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Lock Icon for OTP input
 */
const LockIcon = ({ size = 20, color = "#666" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 17C13.1046 17 14 16.1046 14 15C14 13.8954 13.1046 13 12 13C10.8954 13 10 13.8954 10 15C10 16.1046 10.8954 17 12 17Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M7 11V7C7 5.93913 7.42143 4.92172 8.17157 4.17157C8.92172 3.42143 9.93913 3 11 3H13C14.0609 3 15.0783 3.42143 15.8284 4.17157C16.5786 4.92172 17 5.93913 17 7V11"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Phone Verification Modal
 * Handles phone number verification via OTP (2-step flow)
 * 1. Send OTP to phone number
 * 2. User inputs OTP code
 * 3. Verify OTP
 */
const PhoneVerificationModal = ({ visible, phone, onClose, onVerified }) => {
  const [step, setStep] = useState('phone'); // 'phone', 'otp', 'verified'
  const [phoneNumber, setPhoneNumber] = useState(phone || '');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [maskedPhone, setMaskedPhone] = useState('');
  const otpInputRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStep('phone');
      setPhoneNumber(phone || '');
      setOtpCode('');
      setIsLoading(false);
      setError('');
      setResendTimer(0);
      setMaskedPhone('');
    }
  }, [visible, phone]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Validate phone number length and format
  const validatePhone = (number) => {
    const cleaned = number.replace(/[\s\-()+]/g, '');
    return /^\d{10,15}$/.test(cleaned);
  };

  // Format phone number for display
  const formatPhone = (number) => {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return `0${cleaned.slice(1, 4)} **** ${cleaned.slice(-4)}`;
    } else if (cleaned.startsWith('+234') && cleaned.length === 14) {
      return `+234 ${cleaned.slice(4, 7)} **** ${cleaned.slice(-4)}`;
    } else if (cleaned.startsWith('234') && cleaned.length === 13) {
      return `+234 ${cleaned.slice(3, 6)} **** ${cleaned.slice(-4)}`;
    }
    return cleaned.slice(0, 4) + ' **** ' + cleaned.slice(-4);
  };

  // Step 1: Send OTP
  const handleSendOTP = async () => {
    if (!validatePhone(phoneNumber)) {
      setError('Please enter a valid Nigerian phone number (e.g., 08012345678)');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await authService.sendPhoneOTP(phoneNumber);

      if (result.success) {
        setStep('otp');
        setMaskedPhone(result.data?.maskedPhone || formatPhone(phoneNumber));
        setResendTimer(60);
        setTimeout(() => otpInputRef.current?.focus(), 300);
      } else {
        const rawMsg = result.message || '';
        const isFundingOrGatewayError = /fund|balance|insufficient|termii|gateway|provider|credit|sms/i.test(rawMsg);
        setError(isFundingOrGatewayError || !rawMsg
          ? 'Unable to send SMS verification code. Please try again in a few moments.'
          : rawMsg);
      }
    } catch (err) {
      console.error('[PhoneVerification] Send OTP error:', err);
      setError('Unable to send verification code. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    if (otpCode.length < 4) {
      setError('Please enter the complete OTP code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await authService.verifyPhoneOTP(phoneNumber, otpCode);

      if (result.success) {
        setStep('verified');
        if (onVerified) {
          onVerified({
            phone: phoneNumber,
            data: result.data,
          });
        }
        setTimeout(() => onClose(), 2000);
      } else {
        const rawMsg = result.message || '';
        const isFundingOrGatewayError = /fund|balance|insufficient|termii|gateway|provider|credit/i.test(rawMsg);
        setError(isFundingOrGatewayError || !rawMsg
          ? 'Invalid verification code. Please check and try again.'
          : rawMsg);
        setOtpCode('');
      }
    } catch (err) {
      console.error('[PhoneVerification] Verify OTP error:', err);
      setError('An error occurred during verification. Please try again.');
      setOtpCode('');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    setError('');
    try {
      const result = await authService.sendPhoneOTP(phoneNumber);
      if (result.success) {
        setResendTimer(60);
        Alert.alert('OTP Sent', 'A new OTP has been sent to your phone number.');
      } else {
        const rawMsg = result.message || '';
        const isFundingOrGatewayError = /fund|balance|insufficient|termii|gateway|provider|credit|sms/i.test(rawMsg);
        setError(isFundingOrGatewayError || !rawMsg
          ? 'Unable to resend SMS verification code. Please try again in a few moments.'
          : rawMsg);
      }
    } catch (err) {
      setError('Unable to resend OTP at this time. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {step === 'verified' ? 'Success!' : step === 'otp' ? 'Enter OTP' : 'Verify Phone'}
            </Text>
            {step !== 'verified' && !isLoading && (
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <CloseIcon size={24} />
              </TouchableOpacity>
            )}
          </View>

          {/* Content based on step */}
          {step === 'phone' && (
            <>
              <Text style={styles.description}>
                Please confirm your phone number. We'll send a 6-digit verification code via SMS.
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={[styles.input, error && styles.inputError]}
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text);
                    if (error) setError('');
                  }}
                  placeholder="e.g., 08012345678"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  maxLength={15}
                  editable={!isLoading}
                  autoFocus
                />
                 {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>

              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  • Nigerian numbers only (070, 080, 081, 090, 091){'\n'}
                  • Supports formats: 080..., +23480..., 23480...{'\n'}
                  • OTP will be sent to this number{'\n'}
                  • Standard SMS rates may apply
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
                onPress={handleSendOTP}
                disabled={isLoading || !phoneNumber.trim()}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send OTP</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleClose}
                disabled={isLoading}
              >
                <Text style={styles.skipButtonText}>Skip for now</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={styles.description}>
                Enter the 6-digit verification code sent to{'\n'}
                <Text style={styles.phoneHighlight}>{maskedPhone || formatPhone(phoneNumber)}</Text>
              </Text>

              <View style={styles.otpContainer}>
                <View style={styles.otpInputWrapper}>
                  <LockIcon size={20} color="#666" />
                  <TextInput
                    ref={otpInputRef}
                    style={[styles.otpInput, error && styles.inputError]}
                    value={otpCode}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9]/g, '');
                      setOtpCode(cleaned.slice(0, 6));
                      if (error) setError('');
                    }}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isLoading}
                  />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, (isLoading || otpCode.length < 4) && styles.primaryButtonDisabled]}
                onPress={handleVerifyOTP}
                disabled={isLoading || otpCode.length < 4}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                {resendTimer > 0 ? (
                  <Text style={styles.resendTimerText}>
                    Resend OTP in {resendTimer}s
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOTP} disabled={isLoading}>
                    <Text style={[styles.resendText, isLoading && styles.resendTextDisabled]}>
                      Didn't receive it? Resend OTP
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setStep('phone');
                  setOtpCode('');
                  setError('');
                }}
                disabled={isLoading}
              >
                <Text style={styles.secondaryButtonText}>Change phone number</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'verified' && (
            <View style={styles.successContainer}>
              <SuccessCheckIcon size={80} />
              <Text style={styles.successText}>Phone Verified!</Text>
              <Text style={styles.phoneText}>{phoneNumber}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    lineHeight: 20,
    textAlign: 'center',
  },
  phoneHighlight: {
    fontWeight: '600',
    color: '#010135',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
  },
  inputError: {
    borderColor: '#F44336',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 6,
  },
  otpContainer: {
    marginBottom: 20,
  },
  otpInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  otpInput: {
    flex: 1,
    fontSize: 20,
    color: '#000000',
    marginLeft: 8,
    paddingVertical: 8,
    letterSpacing: 2,
  },
  infoContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: '#010135',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#666666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipButtonText: {
    color: '#999999',
    fontSize: 14,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resendTimerText: {
    fontSize: 14,
    color: '#999999',
  },
  resendText: {
    fontSize: 14,
    color: '#010135',
    fontWeight: '500',
  },
  resendTextDisabled: {
    color: '#999999',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  successText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 16,
    marginBottom: 8,
  },
  phoneText: {
    fontSize: 14,
    color: '#666666',
  },
});

export default PhoneVerificationModal;
