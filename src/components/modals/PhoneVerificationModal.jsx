import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
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
 * Supported Country Dial Codes
 */
const COUNTRY_CODES = [
  { code: '+234', dial: '234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+1', dial: '1', flag: '🇺🇸', name: 'United States' },
  { code: '+44', dial: '44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+1', dial: '1', flag: '🇨🇦', name: 'Canada' },
  { code: '+233', dial: '233', flag: '🇬🇭', name: 'Ghana' },
  { code: '+27', dial: '27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+254', dial: '254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+971', dial: '971', flag: '🇦🇪', name: 'UAE' },
  { code: '+49', dial: '49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', dial: '33', flag: '🇫🇷', name: 'France' },
  { code: '+353', dial: '353', flag: '🇮🇪', name: 'Ireland' },
];

/**
 * Success Checkmark Icon
 */
const SuccessCheckIcon = ({ size = 60 }) => (
  <Svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <Circle cx="30" cy="30" r="25" fill="#10B981" />
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
 * Down Chevron Icon
 */
const ChevronDownIcon = ({ size = 16, color = "#666" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 9L12 15L18 9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Phone Verification Modal
 * Handles phone number verification via 6-digit OTP
 * Features:
 * - Country Code selector (+234 Nigeria default, US, UK, Canada, Ghana, SA, etc.)
 * - Nigerian numbers support starting with '0' (e.g. 080...) or without '0'
 * - 6 separate visual digit boxes for OTP entry
 * - 10-minute code validity notice & 24h limit protection
 */
const PhoneVerificationModal = ({ visible, phone, onClose, onVerified }) => {
  const [step, setStep] = useState('phone'); // 'phone', 'otp', 'verified'
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]); // Default Nigeria
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [maskedPhone, setMaskedPhone] = useState('');
  const otpInputRef = useRef(null);

  // Initialize and parse passed phone prop
  useEffect(() => {
    if (visible) {
      setStep('phone');
      setOtpCode('');
      setIsLoading(false);
      setError('');
      setResendTimer(0);
      setMaskedPhone('');
      setShowCountryModal(false);

      if (phone) {
        let raw = String(phone).replace(/[\s\-()]/g, '');
        // Check if phone starts with a known country dial code
        const matched = COUNTRY_CODES.find((c) => raw.startsWith(c.code) || raw.startsWith(c.dial));
        if (matched) {
          setSelectedCountry(matched);
          let national = raw;
          if (national.startsWith(matched.code)) {
            national = national.slice(matched.code.length);
          } else if (national.startsWith(matched.dial)) {
            national = national.slice(matched.dial.length);
          }
          setPhoneNumber(national);
        } else {
          setSelectedCountry(COUNTRY_CODES[0]);
          setPhoneNumber(raw);
        }
      } else {
        setSelectedCountry(COUNTRY_CODES[0]);
        setPhoneNumber('');
      }
    }
  }, [visible, phone]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Validate phone input based on selected country
  const validatePhone = (number, country) => {
    const cleaned = number.replace(/[\s\-()+]/g, '');
    if (country.dial === '234') {
      // For Nigeria: 10 digits without leading zero, or 11 digits starting with 0
      if (cleaned.startsWith('0')) {
        return cleaned.length === 11;
      }
      return cleaned.length === 10;
    }
    // Foreign numbers: between 7 and 15 digits
    return cleaned.length >= 7 && cleaned.length <= 15;
  };

  // Format phone number for display
  const formatPhoneForDisplay = (number, country) => {
    let cleaned = number.replace(/[\s\-()]/g, '');
    if (country.dial === '234' && cleaned.startsWith('0')) {
      cleaned = cleaned.slice(1);
    }
    const full = `${country.code} ${cleaned}`;
    if (full.length > 7) {
      return full.slice(0, 8) + ' **** ' + full.slice(-3);
    }
    return full;
  };

  // Step 1: Send OTP
  const handleSendOTP = async () => {
    if (!validatePhone(phoneNumber, selectedCountry)) {
      if (selectedCountry.dial === '234') {
        setError('Please enter a valid 10 or 11-digit Nigerian number (e.g., 08012345678 or 8012345678)');
      } else {
        setError(`Please enter a valid phone number for ${selectedCountry.name}`);
      }
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let cleanedPhone = phoneNumber.replace(/[\s\-()]/g, '');
      // If Nigeria and starts with 0, strip leading 0 for API
      if (selectedCountry.dial === '234' && cleanedPhone.startsWith('0')) {
        cleanedPhone = cleanedPhone.slice(1);
      }

      const payload = {
        phone: cleanedPhone,
        phoneNumber: cleanedPhone,
        countryCode: selectedCountry.code,
      };

      const result = await authService.sendPhoneOTP(payload, selectedCountry.code);

      if (result.success) {
        setStep('otp');
        setMaskedPhone(result.data?.maskedPhone || formatPhoneForDisplay(phoneNumber, selectedCountry));
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
      setError('Please enter the 6-digit code received via SMS');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let cleanedPhone = phoneNumber.replace(/[\s\-()]/g, '');
      if (selectedCountry.dial === '234' && cleanedPhone.startsWith('0')) {
        cleanedPhone = cleanedPhone.slice(1);
      }

      const payload = {
        phone: cleanedPhone,
        phoneNumber: cleanedPhone,
        countryCode: selectedCountry.code,
      };

      const result = await authService.verifyPhoneOTP(payload, otpCode, selectedCountry.code);

      if (result.success) {
        setStep('verified');
        if (onVerified) {
          onVerified({
            phone: result.data?.phone || cleanedPhone,
            countryCode: selectedCountry.code,
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
        setTimeout(() => otpInputRef.current?.focus(), 200);
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
    if (resendTimer > 0 || isLoading) return;
    setIsLoading(true);
    setError('');
    try {
      let cleanedPhone = phoneNumber.replace(/[\s\-()]/g, '');
      if (selectedCountry.dial === '234' && cleanedPhone.startsWith('0')) {
        cleanedPhone = cleanedPhone.slice(1);
      }

      const payload = {
        phone: cleanedPhone,
        phoneNumber: cleanedPhone,
        countryCode: selectedCountry.code,
        resend: true,
      };

      const result = await authService.sendPhoneOTP(payload, selectedCountry.code);
      if (result.success) {
        setResendTimer(60);
        setOtpCode('');
        setTimeout(() => otpInputRef.current?.focus(), 200);
      } else {
        const rawMsg = result.message || '';
        const isFundingOrGatewayError = /fund|balance|insufficient|termii|gateway|provider|credit|sms/i.test(rawMsg);
        setError(isFundingOrGatewayError || !rawMsg
          ? 'Unable to resend verification SMS. Please try again later.'
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
              {step === 'verified' ? 'Verified!' : step === 'otp' ? 'Enter 6-Digit Code' : 'Verify Phone Number'}
            </Text>
            {step !== 'verified' && !isLoading && (
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <CloseIcon size={24} />
              </TouchableOpacity>
            )}
          </View>

          {/* STEP 1: Phone Input & Country Selector */}
          {step === 'phone' && (
            <>
              <Text style={styles.description}>
                Confirm your phone number to receive a 6-digit verification code via SMS.
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.phoneInputRow}>
                  {/* Country Selector Pill Button */}
                  <TouchableOpacity
                    style={styles.countryPickerButton}
                    onPress={() => setShowCountryModal(true)}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                    <Text style={styles.countryDialCode}>{selectedCountry.code}</Text>
                    <ChevronDownIcon size={14} color="#64748B" />
                  </TouchableOpacity>

                  {/* National Number Input */}
                  <TextInput
                    style={[styles.phoneTextInput, error && styles.inputError]}
                    value={phoneNumber}
                    onChangeText={(text) => {
                      setPhoneNumber(text);
                      if (error) setError('');
                    }}
                    placeholder={selectedCountry.dial === '234' ? 'e.g. 09034525963' : 'Phone number'}
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={16}
                    editable={!isLoading}
                    autoFocus
                  />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>

              <View style={styles.infoContainer}>
                <Text style={styles.infoTitle}>Verification Details</Text>
                <Text style={styles.infoText}>
                  • Nigerian numbers accept 080... or 80... formats{'\n'}
                  • Foreign country codes supported for international guests{'\n'}
                  • Code is valid for 10 minutes (max 3 trials per 24 hours){'\n'}
                  • SMS sender may appear as <Text style={styles.boldText}>OE Alert</Text> or <Text style={styles.boldText}>PVTAlert</Text>
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, (isLoading || !phoneNumber.trim()) && styles.primaryButtonDisabled]}
                onPress={handleSendOTP}
                disabled={isLoading || !phoneNumber.trim()}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleClose}
                disabled={isLoading}
              >
                <Text style={styles.skipButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {/* STEP 2: 6-Digit OTP Box Input */}
          {step === 'otp' && (
            <>
              <Text style={styles.description}>
                Enter the 6-digit code sent via SMS to{'\n'}
                <Text style={styles.phoneHighlight}>{maskedPhone || formatPhoneForDisplay(phoneNumber, selectedCountry)}</Text>
              </Text>

              {/* 6-Box OTP Input */}
              <View style={styles.otpSection}>
                <View style={styles.boxesRow}>
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const digit = otpCode[index] || '';
                    const isCurrent = index === otpCode.length;
                    const isFilled = !!digit;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.otpBox,
                          isFilled && styles.otpBoxFilled,
                          isCurrent && styles.otpBoxActive,
                          error && styles.otpBoxError,
                        ]}
                      >
                        <Text style={styles.otpDigit}>{digit}</Text>
                        {isCurrent && !isFilled && !isLoading && (
                          <View style={styles.activeCursor} />
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Overlaid transparent TextInput so taps anywhere on the boxes trigger native keyboard */}
                <TextInput
                  ref={otpInputRef}
                  style={styles.hiddenOtpInput}
                  value={otpCode}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
                    setOtpCode(cleaned);
                    if (error) setError('');
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  editable={!isLoading}
                  autoFocus
                />
              </View>

              {error ? <Text style={styles.errorTextCenter}>{error}</Text> : null}

              <Text style={styles.validityNotice}>
                ⏱️ Code valid for 10 minutes. Sender may appear as <Text style={styles.boldText}>OE Alert</Text> or <Text style={styles.boldText}>PVTAlert</Text>.
              </Text>

              <TouchableOpacity
                style={[styles.primaryButton, (isLoading || otpCode.length < 4) && styles.primaryButtonDisabled]}
                onPress={handleVerifyOTP}
                disabled={isLoading || otpCode.length < 4}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify Code</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                {resendTimer > 0 ? (
                  <Text style={styles.resendTimerText}>
                    Resend code in {resendTimer}s
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOTP} disabled={isLoading}>
                    <Text style={[styles.resendText, isLoading && styles.resendTextDisabled]}>
                      Didn't receive the SMS? Resend Code
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
                <Text style={styles.secondaryButtonText}>Edit phone number</Text>
              </TouchableOpacity>
            </>
          )}

          {/* STEP 3: Verified Success Screen */}
          {step === 'verified' && (
            <View style={styles.successContainer}>
              <SuccessCheckIcon size={76} />
              <Text style={styles.successText}>Phone Number Verified</Text>
              <Text style={styles.phoneText}>
                {selectedCountry.code} {phoneNumber}
              </Text>
              <Text style={styles.successSubtext}>
                Your phone is now verified and active for bookings and account security.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Country Selection Modal */}
      <Modal
        visible={showCountryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.countryModalOverlay}>
          <View style={styles.countryModalContent}>
            <View style={styles.countryModalHeader}>
              <Text style={styles.countryModalTitle}>Select Country Code</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)} style={styles.closeButton}>
                <CloseIcon size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => `${item.code}-${item.name}`}
              renderItem={({ item }) => {
                const isSelected = selectedCountry.code === item.code && selectedCountry.name === item.name;
                return (
                  <TouchableOpacity
                    style={[styles.countryItem, isSelected && styles.countryItemSelected]}
                    onPress={() => {
                      setSelectedCountry(item);
                      setShowCountryModal(false);
                      if (error) setError('');
                    }}
                  >
                    <Text style={styles.countryItemFlag}>{item.flag}</Text>
                    <Text style={styles.countryItemName}>{item.name}</Text>
                    <Text style={styles.countryItemCode}>{item.code}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 1, 53, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#010135',
  },
  closeButton: {
    padding: 6,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 18,
    lineHeight: 20,
    textAlign: 'center',
  },
  phoneHighlight: {
    fontWeight: '700',
    color: '#010135',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 6,
  },
  countryFlag: {
    fontSize: 18,
  },
  countryDialCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#010135',
  },
  phoneTextInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
  },
  errorTextCenter: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  infoContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: '#010135',
  },
  primaryButton: {
    backgroundColor: '#010135',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipButtonText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  /* 6-Box OTP Styles */
  otpSection: {
    position: 'relative',
    marginVertical: 16,
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFilled: {
    borderColor: '#010135',
    backgroundColor: '#FFFFFF',
  },
  otpBoxActive: {
    borderColor: '#6366F1',
    borderWidth: 2,
    backgroundColor: '#EEF2FF',
  },
  otpBoxError: {
    borderColor: '#EF4444',
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: '#010135',
  },
  activeCursor: {
    width: 2,
    height: 20,
    backgroundColor: '#6366F1',
    borderRadius: 1,
  },
  hiddenOtpInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
  },
  validityNotice: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  resendTimerText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  resendText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: '#94A3B8',
  },
  /* Success Styles */
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 14,
    marginBottom: 6,
  },
  phoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#010135',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  /* Country Modal Styles */
  countryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  countryModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '65%',
    paddingBottom: 24,
  },
  countryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  countryModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  countryItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  countryItemFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  countryItemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  countryItemCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1',
  },
});

export default PhoneVerificationModal;
