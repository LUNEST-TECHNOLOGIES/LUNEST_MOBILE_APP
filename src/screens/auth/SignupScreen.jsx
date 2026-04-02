import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppleIcon, BackArrowIcon, Checkbox, GoogleIcon } from "../../components/auth";
import authService from "../../services/authService";

/**
 * Signup Screen
 * User registration with email, phone, and password
 * Fixed header image with white back button overlay
 */
const SignupScreen = ({ onBack, onLogin, onSignupSuccess }) => {
  const { width, height } = useWindowDimensions();
  const router = useRouter();

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [gender, setGender] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isMarketingSubscribed, setIsMarketingSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    type: "success",
    message: "",
  });

  // Auto-fill referral code from deep link
  useEffect(() => {
    const loadPendingReferral = async () => {
      try {
        const { consumePendingReferral } = await import("../../hooks/useReferralTracker");
        const code = await consumePendingReferral();
        if (code && !referralCode) {
          setReferralCode(code);
          console.log("[SignupScreen] Auto-filled referral code from deep link:", code);
        }
      } catch (e) {
        // ignore
      }
    };
    loadPendingReferral();
  }, []);

  // Validation errors state
  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    password: "",
    gender: "",
  });

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    // Minimum 8 characters
    return password.length >= 8;
  };

  const validateForm = () => {
    const newErrors = {
      fullName: "",
      email: "",
      password: "",
      gender: "",
    };
    let isValid = true;

    // Full Name validation
    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
      isValid = false;
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = "Name must be at least 2 characters";
      isValid = false;
    }

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (!validatePassword(password)) {
      newErrors.password = "Password must be at least 8 characters";
      isValid = false;
    }

    // Gender validation
    if (!gender) {
      newErrors.gender = "Please select your gender";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Clear error when user starts typing
  const handleFieldChange = (field, value, setter) => {
    setter(value);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Responsive calculations
  const contentPadding = width * 0.06;
  const headerImageHeight = 90;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login");
    }
  };

  const handleSignup = async () => {
    if (validateForm()) {
      setIsLoading(true);
      try {
        console.log("🚀 [SignupScreen] Initiating signup...");
        const result = await authService.register({
          fullName,
          email,
          password,
          gender: gender?.toUpperCase(), // Ensure backend enum match (MALE/FEMALE)
          referralCode: referralCode?.trim(), // Pass clean referral code
          isMarketingSubscribed,
        });

        console.log("📊 [SignupScreen] Register result:", {
          success: result?.success,
          message: result?.message,
        });

        if (result && result.success) {
          const responseData = result.data || {};
          
          if (responseData.actionRequired === 'VERIFY_OTP') {
            console.log("📍 [SignupScreen] Redirecting to verification code screen...");
            
            // Show success toast
            setToast({
              visible: true,
              type: "success",
              message: "Registration successful! Please verify your email.",
            });

            setTimeout(() => {
              setToast({ visible: false, type: "success", message: "" });
              router.push({
                pathname: "/verify-code",
                params: { 
                  email: email,
                  flow: 'registration' // Specify this is for registration
                }
              });
            }, 1000);
            return;
          }

          // Fallback if no OTP required (legacy behavior)
          console.log("🔑 [SignupScreen] Attempting auto-login...");
          const loginResult = await authService.login({
            email,
            password,
          });

          // Show success toast
          setToast({
            visible: true,
            type: "success",
            message: "Account created successfully! Welcome to Lunest.",
          });

          // Auto-redirect to home after 1.5 seconds
          setTimeout(() => {
            setToast({ visible: false, type: "success", message: "" });
            if (loginResult && loginResult.success) {
              router.replace("/(tabs)");
            } else {
              router.replace("/login");
            }
          }, 1500);
        } else if (result) {
          const errorMsg =
            result.message || "Registration failed. Please try again.";
          console.log("❌ [SignupScreen] Registration failed:", errorMsg);
          setToast({ visible: true, type: "error", message: errorMsg });
          setTimeout(
            () => setToast({ visible: false, type: "error", message: "" }),
            4000,
          );
        } else {
          console.error("🔴 [SignupScreen] Null result from authService");
          setToast({
            visible: true,
            type: "error",
            message: "Unexpected response from registration service",
          });
          setTimeout(
            () => setToast({ visible: false, type: "error", message: "" }),
            4000,
          );
        }
      } catch (error) {
        console.error(
          "🔴 [SignupScreen] Unexpected error in handleSignup:",
          error,
        );
        console.error("🔴 [SignupScreen] Error message:", error?.message);
        console.error(
          "🔴 [SignupScreen] Error stack:",
          error?.stack?.split("\n")[0],
        );
        setToast({
          visible: true,
          type: "error",
          message: "An unexpected error occurred. Please try again.",
        });
        setTimeout(
          () => setToast({ visible: false, type: "error", message: "" }),
          4000,
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLoginPress = () => {
    if (onLogin) {
      onLogin();
    } else {
      router.push("/login");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Fixed Header with Image Background */}
      <View style={[styles.header, { height: headerImageHeight }]}>
        {/* Header Image */}
        <Image
          source={require("../../assets/images/LUNEST ICON12 1.png")}
          style={styles.headerImage}
          resizeMode="cover"
        />

        {/* Back Button - Positioned on top of image */}
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join thousands discovering better stays.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, errors.fullName && styles.inputError]}
                placeholder="Full Name"
                placeholderTextColor="#9E9E9E"
                value={fullName}
                onChangeText={(value) =>
                  handleFieldChange("fullName", value, setFullName)
                }
                autoCapitalize="words"
              />
              {errors.fullName ? (
                <Text style={styles.errorText}>{errors.fullName}</Text>
              ) : null}
            </View>

            {/* Email */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Email Address"
                placeholderTextColor="#9E9E9E"
                value={email}
                onChangeText={(value) =>
                  handleFieldChange("email", value, setEmail)
                }
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            {/* Password */}
            <View style={styles.inputWrapper}>
              <View
                style={[
                  styles.passwordContainer,
                  errors.password && styles.inputError,
                ]}
              >
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Create a password"
                  placeholderTextColor="#9E9E9E"
                  value={password}
                  onChangeText={(value) =>
                    handleFieldChange("password", value, setPassword)
                  }
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeText}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
            </View>

            {/* Gender Selection */}
            <View style={styles.genderContainer}>
              <Text
                style={[styles.genderLabel, errors.gender && styles.errorLabel]}
              >
                Gender
              </Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => {
                    setGender("male");
                    if (errors.gender)
                      setErrors((prev) => ({ ...prev, gender: "" }));
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      gender === "male" && styles.radioOuterSelected,
                      errors.gender && styles.radioError,
                    ]}
                  >
                    {gender === "male" && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioLabel}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => {
                    setGender("female");
                    if (errors.gender)
                      setErrors((prev) => ({ ...prev, gender: "" }));
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      gender === "female" && styles.radioOuterSelected,
                      errors.gender && styles.radioError,
                    ]}
                  >
                    {gender === "female" && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioLabel}>Female</Text>
                </TouchableOpacity>
              </View>
              {errors.gender ? (
                <Text style={styles.errorText}>{errors.gender}</Text>
              ) : null}
            </View>

            {/* Referral Code */}
            <View style={styles.referralContainer}>
              <Text style={styles.referralLabel}>Referral Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter referral code (Optional)"
                placeholderTextColor="#9E9E9E"
                value={referralCode}
                onChangeText={(value) => setReferralCode(value.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>

            {/* Marketing Consent Checkbox */}
            <Checkbox
              label="I agree to receive marketing emails and updates."
              checked={isMarketingSubscribed}
              onPress={() => setIsMarketingSubscribed(!isMarketingSubscribed)}
            />
          </View>

          {/* Agreement Text */}
          <Text style={styles.agreementText}>
            By signing up, you agree to our{" "}
            <Text style={styles.agreementLink}>Terms of Service</Text> and{" "}
            <Text style={styles.agreementLink}>Privacy Policy</Text>
          </Text>

          {/* Signup Button */}
          <TouchableOpacity
            style={[styles.signupButton, isLoading && styles.buttonDisabled]}
            onPress={handleSignup}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.signupButtonText}>Create Account</Text>
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

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleLoginPress} activeOpacity={0.7}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast Notification */}
      {toast.visible && (
        <View
          style={[
            styles.toastContainer,
            toast.type === "success" ? styles.toastSuccess : styles.toastError,
          ]}
        >
          <View style={styles.toastContent}>
            {toast.type === "success" ? (
              <View style={styles.toastIconSuccess}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M9.55 18L3.85 12.3L5.275 10.875L9.55 15.15L18.725 5.975L20.15 7.4L9.55 18Z"
                    fill="#FFFFFF"
                  />
                </Svg>
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
    backgroundColor: "#FFFFFF",
  },
  header: {
    width: "100%",
    overflow: "hidden",
  },
  headerImage: {
    width: "100%",
    height: "100%",
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
    marginBottom: 24,
    alignItems: "flex-start",
    marginTop: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",

    color: "#000000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,

    color: "#656565",
  },
  form: {
    gap: 16,
    marginBottom: 24,
  },
  inputWrapper: {
    gap: 4,
  },
  inputError: {
    borderColor: "#DC3545",
  },
  errorText: {
    fontSize: 12,

    color: "#DC3545",
    marginLeft: 16,
    marginTop: 4,
  },
  errorLabel: {
    color: "#DC3545",
  },
  radioError: {
    borderColor: "#DC3545",
  },
  genderContainer: {},
  genderLabel: {
    fontSize: 14,
    fontWeight: "600",

    color: "#000000",
    marginBottom: 12,
  },
  radioGroup: {
    flexDirection: "row",
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  radioOuterSelected: {
    borderColor: "#192DFF",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#192DFF",
  },
  radioLabel: {
    fontSize: 14,

    color: "#000000",
  },
  referralContainer: {
    gap: 12,
  },
  referralLabel: {
    fontSize: 14,
    fontWeight: "600",

    color: "#000000",
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: "#b0b0b0",
    borderRadius: 25,
    paddingHorizontal: 16,
    fontSize: 16,

    color: "#000000",
    backgroundColor: "#FAFAFA",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#b0b0b0",
    borderRadius: 25,
    backgroundColor: "#FAFAFA",
  },
  passwordInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 16,
    fontSize: 16,

    color: "#000000",
  },
  eyeButton: {
    paddingHorizontal: 16,
    height: 46,
    justifyContent: "center",
  },
  eyeText: {
    fontSize: 14,

    color: "#192DFF",
    fontWeight: "600",
  },
  signupButton: {
    backgroundColor: "#010135",
    borderRadius: 25,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: "700",

    color: "#FFFFFF",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E5E5",
  },
  dividerText: {
    fontSize: 14,

    color: "#9E9E9E",
    marginHorizontal: 16,
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  socialButtonFirst: {
    marginRight: 8,
  },
  socialButtonSecond: {
    marginLeft: 8,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    fontSize: 14,

    color: "#656565",
  },
  loginLink: {
    fontSize: 14,
    fontWeight: "700",

    color: "#192DFF",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  // Toast Notification Styles
  toastContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1000,
  },
  toastSuccess: {
    backgroundColor: "#4CAF50",
  },
  toastError: {
    backgroundColor: "#F44336",
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  toastIconSuccess: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  toastIconError: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  toastIconErrorText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  toastMessage: {
    flex: 1,
    fontSize: 14,

    fontWeight: "500",
    color: "#FFFFFF",
  },
  agreementText: {
    fontSize: 12,
    color: "#656565",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  agreementLink: {
    color: "#192DFF",
    fontWeight: "600",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: "#192DFF",
    borderColor: "#192DFF",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#000000",
    flex: 1,
    lineHeight: 20,
  },
});

export default SignupScreen;
