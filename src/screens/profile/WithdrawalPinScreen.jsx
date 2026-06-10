/**
 * WithdrawalPinScreen
 * Allows users to set or reset their 4-digit withdrawal security PIN.
 * - Set PIN: first time, enter PIN + confirm
 * - Reset PIN: enter account password + new PIN + confirm
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import authService from "../../services/authService";
import configService from "../../services/configService";

const BackIcon = ({ size = 24, color = "black" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.0003 20.67C14.8103 20.67 14.6203 20.6 14.4703 20.45L7.95027 13.93C6.89027 12.87 6.89027 11.13 7.95027 10.07L14.4703 3.55002C14.7603 3.26002 15.2403 3.26002 15.5303 3.55002C15.8203 3.84002 15.8203 4.32002 15.5303 4.61002L9.01027 11.13C8.53027 11.61 8.53027 12.39 9.01027 12.87L15.5303 19.39C15.8203 19.68 15.8203 20.16 15.5303 20.45C15.3803 20.59 15.1903 20.67 15.0003 20.67Z"
      fill={color}
    />
  </Svg>
);

/**
 * 4-dot PIN entry component
 */
const PinDots = ({ value, maxLength = 4 }) => (
  <View style={styles.pinDotsRow}>
    {Array.from({ length: maxLength }).map((_, i) => (
      <View
        key={i}
        style={[
          styles.pinDot,
          i < value.length ? styles.pinDotFilled : styles.pinDotEmpty,
        ]}
      />
    ))}
  </View>
);

/**
 * Custom numpad
 */
const NumPad = ({ onPress, onDelete }) => {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  return (
    <View style={styles.numpad}>
      {keys.map((key, index) => {
        if (key === "") return <View key={index} style={styles.numpadEmpty} />;
        if (key === "del") {
          return (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.numpadDeleteKey,
                pressed && styles.numpadDeleteKeyPressed,
              ]}
              onPress={onDelete}
              android_ripple={{ color: "#e0e0e0", borderless: true }}
            >
              <Ionicons name="backspace-outline" size={24} color="#010135" />
            </Pressable>
          );
        }
        return (
          <Pressable
            key={index}
            style={({ pressed }) => [
              styles.numpadKey,
              pressed && styles.numpadKeyPressed,
            ]}
            onPress={() => onPress(key)}
            android_ripple={{ color: "#e0e0e0", borderless: true }}
          >
            <Text style={styles.numpadKeyText}>{key}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const WithdrawalPinScreen = () => {
  const router = useRouter();

  // Screen mode: 'loading' | 'set' | 'reset'
  const [mode, setMode] = useState("loading");
  const [hasPin, setHasPin] = useState(false);

  // Stepper for "set" mode: 'password' | 'enter' | 'confirm'
  const [step, setStep] = useState("password");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // "Reset" mode fields
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [resetStep, setResetStep] = useState("password"); // 'password' | 'newpin' | 'confirm'

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch current PIN status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const token = await authService.getToken();
        const baseURL = await configService.getBaseURL();
        const res = await fetch(`${baseURL}/v1/users/withdrawal-pin-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const pinSet = data?.hasWithdrawalPin || false;
        setHasPin(pinSet);
        setMode(pinSet ? "reset" : "set");
      } catch (_err) {
        setMode("set");
      }
    };
    checkStatus();
  }, []);

  // Auto-advance PIN entry when 4 digits entered
  useEffect(() => {
    if (mode === "set" && step === "enter" && pin.length === 4) {
      // Small delay so user sees the 4th dot fill
      const t = setTimeout(() => setStep("confirm"), 200);
      return () => clearTimeout(t);
    }
  }, [pin, mode, step]);

  useEffect(() => {
    if (mode === "set" && step === "confirm" && confirmPin.length === 4) {
      handleSetPin();
    }
  }, [confirmPin, mode, step]);

  useEffect(() => {
    if (mode === "reset" && resetStep === "newpin" && newPin.length === 4) {
      const t = setTimeout(() => setResetStep("confirm"), 200);
      return () => clearTimeout(t);
    }
  }, [newPin, mode, resetStep]);

  useEffect(() => {
    if (mode === "reset" && resetStep === "confirm" && confirmNewPin.length === 4) {
      handleResetPin();
    }
  }, [confirmNewPin, mode, resetStep]);

  const handleNumPress = (key) => {
    setError("");
    if (mode === "set") {
      if (step === "enter" && pin.length < 4) setPin((p) => p + key);
      else if (step === "confirm" && confirmPin.length < 4) setConfirmPin((p) => p + key);
    } else {
      if (resetStep === "newpin" && newPin.length < 4) setNewPin((p) => p + key);
      else if (resetStep === "confirm" && confirmNewPin.length < 4) setConfirmNewPin((p) => p + key);
    }
  };

  const handleDelete = () => {
    setError("");
    if (mode === "set") {
      if (step === "enter") setPin((p) => p.slice(0, -1));
      else if (step === "confirm") {
        if (confirmPin.length === 0) setStep("enter");
        else setConfirmPin((p) => p.slice(0, -1));
      }
    } else {
      if (resetStep === "newpin") setNewPin((p) => p.slice(0, -1));
      else if (resetStep === "confirm") {
        if (confirmNewPin.length === 0) setResetStep("newpin");
        else setConfirmNewPin((p) => p.slice(0, -1));
      }
    }
  };

  const handleSetPin = async () => {
    if (pin !== confirmPin) {
      setError("PINs do not match. Please try again.");
      setConfirmPin("");
      setStep("enter");
      setPin("");
      return;
    }
    setLoading(true);
    try {
      const token = await authService.getToken();
      const baseURL = await configService.getBaseURL();
      const res = await fetch(`${baseURL}/v1/users/set-withdrawal-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password, pin, confirmPin }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage("Withdrawal PIN set successfully!");
      } else {
        const msg = data.message || "Failed to set PIN. Please try again.";
        setError(msg);
        setPin("");
        setConfirmPin("");
        if (msg.toLowerCase().includes("password")) {
          setPassword("");
          setStep("password");
        } else {
          setStep("enter");
        }
      }
    } catch (_err) {
      setError("Network error. Please try again.");
      setPin("");
      setConfirmPin("");
      setStep("enter");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordContinue = () => {
    if (!password.trim()) {
      setError("Please enter your account password");
      return;
    }
    setError("");
    if (mode === "set") {
      setStep("enter");
    } else {
      setResetStep("newpin");
    }
  };

  const handleResetPin = async () => {
    if (newPin !== confirmNewPin) {
      setError("New PINs do not match. Please try again.");
      setNewPin("");
      setConfirmNewPin("");
      setResetStep("newpin");
      return;
    }
    setLoading(true);
    try {
      const token = await authService.getToken();
      const baseURL = await configService.getBaseURL();
      const res = await fetch(`${baseURL}/v1/users/reset-withdrawal-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password, newPin, confirmNewPin }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage("Withdrawal PIN reset successfully!");
      } else {
        const msg = data.message || "Failed to reset PIN.";
        if (msg.toLowerCase().includes("password")) {
          // Wrong password — go back to password step
          setError(msg);
          setPassword("");
          setNewPin("");
          setConfirmNewPin("");
          setResetStep("password");
        } else {
          setError(msg);
          setNewPin("");
          setConfirmNewPin("");
          setResetStep("newpin");
        }
      }
    } catch (_err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (successMessage) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.successScreen}>
          <View style={styles.successIconOuter}>
            <View style={styles.successIconInner}>
              <Ionicons name="checkmark" size={40} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.successTitle}>Success!</Text>
          <Text style={styles.successSubtitle}>{successMessage}</Text>
          <View style={{ flex: 1 }} />
          <Pressable style={styles.continueBtn} onPress={() => router.back()}>
            <Text style={styles.continueBtnText}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (mode === "loading") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <BackIcon size={24} color="#000" />
          </Pressable>
          <Text style={styles.headerTitle}>Withdrawal PIN</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#010135" />
        </View>
      </SafeAreaView>
    );
  }

  // ─── SET PIN MODE ───
  if (mode === "set") {
    if (step === "password") {
      return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <BackIcon size={24} color="#000" />
            </Pressable>
            <Text style={styles.headerTitle}>Withdrawal PIN</Text>
            <View style={styles.headerSpacer} />
          </View>
          <ScrollView
            style={styles.resetContent}
            contentContainerStyle={styles.resetContentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={32} color="#010135" />
            </View>
            <Text style={styles.pinTitle}>Verify Your Identity</Text>
            <Text style={styles.pinSubtitle}>
              Enter your account password to secure your withdrawal PIN
            </Text>

            {!!error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#B70808" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Account password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color="#999"
                />
              </Pressable>
            </View>

            <Pressable
              style={[
                styles.continueBtn,
                !password.trim() && styles.continueBtnDisabled,
              ]}
              onPress={handlePasswordContinue}
              disabled={!password.trim()}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      );
    }

    const currentPinValue = step === "enter" ? pin : confirmPin;
    const titleText = step === "enter" ? "Create Withdrawal PIN" : "Confirm Your PIN";
    const subtitleText =
      step === "enter"
        ? "Choose a 4-digit PIN to secure your withdrawals"
        : "Re-enter your PIN to confirm";

    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              if (step === "confirm") {
                setStep("enter");
                setConfirmPin("");
              } else if (step === "enter") {
                setStep("password");
                setPin("");
              } else {
                router.back();
              }
            }}
            style={styles.backButton}
          >
            <BackIcon size={24} color="#000" />
          </Pressable>
          <Text style={styles.headerTitle}>Withdrawal PIN</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.pinContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Lock icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={32} color="#010135" />
          </View>

          <Text style={styles.pinTitle}>{titleText}</Text>
          <Text style={styles.pinSubtitle}>{subtitleText}</Text>

          <PinDots value={currentPinValue} />

          {!!error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color="#B70808" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#010135" style={{ marginTop: 32 }} />
          ) : (
            <NumPad onPress={handleNumPress} onDelete={handleDelete} />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── RESET / CHANGE PIN MODE ───
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (resetStep === "newpin") {
              setResetStep("password");
              setNewPin("");
            } else if (resetStep === "confirm") {
              setResetStep("newpin");
              setConfirmNewPin("");
            } else {
              router.back();
            }
          }}
          style={styles.backButton}
        >
          <BackIcon size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Reset Withdrawal PIN</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Step: Enter account password */}
      {resetStep === "password" && (
        <ScrollView
          style={styles.resetContent}
          contentContainerStyle={styles.resetContentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={32} color="#010135" />
          </View>
          <Text style={styles.pinTitle}>Verify Your Identity</Text>
          <Text style={styles.pinSubtitle}>
            Enter your account password to proceed with PIN reset
          </Text>

          {!!error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color="#B70808" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Account password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={22}
                color="#999"
              />
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.continueBtn,
              !password.trim() && styles.continueBtnDisabled,
            ]}
            onPress={handlePasswordContinue}
            disabled={!password.trim()}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Step: Enter new PIN */}
      {(resetStep === "newpin" || resetStep === "confirm") && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.pinContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={32} color="#010135" />
          </View>
          <Text style={styles.pinTitle}>
            {resetStep === "newpin" ? "Enter New PIN" : "Confirm New PIN"}
          </Text>
          <Text style={styles.pinSubtitle}>
            {resetStep === "newpin"
              ? "Choose a new 4-digit withdrawal PIN"
              : "Re-enter your new PIN to confirm"}
          </Text>

          <PinDots value={resetStep === "newpin" ? newPin : confirmNewPin} />

          {!!error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color="#B70808" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#010135" style={{ marginTop: 32 }} />
          ) : (
            <NumPad onPress={handleNumPress} onDelete={handleDelete} />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#000" },
  headerSpacer: { width: 32 },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },

  // PIN mode layout
  pinContent: {
    flex: 1,
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  pinContentContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F0F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  pinTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  pinSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },

  // Dots
  pinDotsRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 24,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  pinDotFilled: { backgroundColor: "#010135" },
  pinDotEmpty: { backgroundColor: "#E0E0E0" },

  // Error
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    width: "100%",
  },
  errorText: { fontSize: 13, color: "#B70808", flex: 1 },

  // Numpad
  numpad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 280,
    marginTop: 12,
  },
  numpadKey: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    marginVertical: 8,
  },
  numpadKeyPressed: {
    backgroundColor: "#E5E7EB",
    transform: [{ scale: 0.95 }],
  },
  numpadDeleteKey: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    marginVertical: 8,
  },
  numpadDeleteKeyPressed: {
    opacity: 0.5,
    transform: [{ scale: 0.95 }],
  },
  numpadEmpty: {
    width: 72,
    height: 72,
    marginVertical: 8,
  },
  numpadKeyText: {
    fontSize: 28,
    fontWeight: "600",
    color: "#010135",
  },

  // Reset mode password step
  resetContent: { flex: 1 },
  resetContentContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F6F6",
    borderWidth: 1,
    borderColor: "#B0B0B0",
    borderRadius: 25,
    paddingHorizontal: 18,
    height: 50,
    width: "100%",
    marginBottom: 24,
  },
  passwordInput: { flex: 1, fontSize: 14, color: "#000" },
  eyeBtn: { padding: 4 },
  continueBtn: {
    backgroundColor: "#010135",
    borderRadius: 25,
    height: 50,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnDisabled: { backgroundColor: "#A0A0A0" },
  continueBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  // Success Screen
  successScreen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  successIconOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  successIconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
});

export default WithdrawalPinScreen;
