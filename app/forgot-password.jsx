import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import authService from "../src/services/authService";

const ForgotPassword = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (emailStr) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  const handleResetPassword = async () => {
    // Clear previous messages
    setError("");

    // Validate email
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.forgotPassword(email.trim());

      if (result.success) {
        // Navigate to verification screen
        router.push({
          pathname: "/verify-code",
          params: { email: email.trim() },
        });
      } else {
        setError(
          result.message || "Failed to send reset email. Please try again.",
        );
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
              <Text style={styles.title}>Forgot password</Text>
              <Text style={styles.subtitle}>
                We'll help you get back in.{"\n"}Enter your registered email
                below.
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={18} color="#dc3545" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, error && styles.inputError]}
                  placeholder="Enter your registered email"
                  placeholderTextColor="#656565"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError("");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>

              {/* Spacer to push button down */}
              <View style={styles.spacer} />

              {/* Reset Button */}
              <Pressable
                style={[
                  styles.primaryButton,
                  isLoading && styles.buttonDisabled,
                ]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Reset Password</Text>
                )}
              </Pressable>

              {/* Back to Login Link */}
              <Pressable
                style={styles.linkContainer}
                onPress={() => router.replace("/login")}
              >
                <Text style={styles.linkText}>
                  Remember your password?{" "}
                  <Text style={styles.linkHighlight}>Login</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    backgroundColor: "#010135",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  headerContainer: {
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#656565",
    lineHeight: 20,
  },
  formContainer: {
    flex: 1,
    gap: 20,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff5f5",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  errorText: {
    color: "#dc3545",
    fontSize: 14,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 10,
  },
  input: {
    height: 50,
    backgroundColor: "#f6f6f6",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 14,
    color: "#000",
  },
  inputError: {
    borderColor: "#dc3545",
  },
  spacer: {
    flex: 1,
    minHeight: 200,
  },
  primaryButton: {
    height: 50,
    backgroundColor: "#010135",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#6c6c8a",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  linkContainer: {
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 30,
  },
  linkText: {
    fontSize: 14,
    color: "#656565",
  },
  linkHighlight: {
    color: "#010135",
    fontWeight: "600",
  },
});

export default ForgotPassword;
