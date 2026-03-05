/**
 * UpdatePasswordScreen - Change account password
 * Requires current password verification
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
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

/**
 * Back Arrow Icon - Same style as personal information page
 */
const BackIcon = ({ size = 24, color = "black" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.0003 20.67C14.8103 20.67 14.6203 20.6 14.4703 20.45L7.95027 13.93C6.89027 12.87 6.89027 11.13 7.95027 10.07L14.4703 3.55002C14.7603 3.26002 15.2403 3.26002 15.5303 3.55002C15.8203 3.84002 15.8203 4.32002 15.5303 4.61002L9.01027 11.13C8.53027 11.61 8.53027 12.39 9.01027 12.87L15.5303 19.39C15.8203 19.68 15.8203 20.16 15.5303 20.45C15.3803 20.59 15.1903 20.67 15.0003 20.67Z"
      fill={color}
    />
  </Svg>
);

const UpdatePasswordScreen = () => {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Validate form
  const validateForm = () => {
    const newErrors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
    let isValid = true;

    if (!currentPassword) {
      newErrors.currentPassword = "Current password is required";
      isValid = false;
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
      isValid = false;
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    if (currentPassword && newPassword && currentPassword === newPassword) {
      newErrors.newPassword = "New password must be different from current";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle password update
  const handleUpdatePassword = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = await authService.getToken();
      const baseURL = await configService.getBaseURL();

      if (!token) {
        Alert.alert("Error", "Please log in to update your password");
        setLoading(false);
        return;
      }

      const response = await fetch(`${baseURL}/v1/users/update-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Password updated successfully", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        // Handle specific error messages
        const errorMessage = data.message || "Failed to update password";
        if (errorMessage.toLowerCase().includes("current password")) {
          setErrors((prev) => ({
            ...prev,
            currentPassword: "Current password is incorrect",
          }));
        } else {
          Alert.alert("Error", errorMessage);
        }
      }
    } catch (error) {
      console.error("[UpdatePassword] Error:", error);
      Alert.alert("Error", "Unable to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Render password input field
  const renderPasswordInput = (
    label,
    value,
    setValue,
    showPassword,
    setShowPassword,
    error,
    placeholder,
  ) => (
    <View style={styles.inputContainer}>
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder || label}
          placeholderTextColor="#656565"
          value={value}
          onChangeText={(text) => {
            setValue(text);
            if (error) {
              setErrors((prev) => ({
                ...prev,
                [label.toLowerCase().replace(/\s/g, "")]: "",
              }));
            }
          }}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="off"
          textContentType="none"
        />
        <Pressable
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons
            name={showPassword ? "eye-outline" : "eye-off-outline"}
            size={22}
            color="#656565"
          />
        </Pressable>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <BackIcon size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Password Update</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Password inputs */}
        <View style={styles.form}>
          {renderPasswordInput(
            "currentPassword",
            currentPassword,
            setCurrentPassword,
            showCurrentPassword,
            setShowCurrentPassword,
            errors.currentPassword,
            "Current password",
          )}

          {renderPasswordInput(
            "newPassword",
            newPassword,
            setNewPassword,
            showNewPassword,
            setShowNewPassword,
            errors.newPassword,
            "New password",
          )}

          {renderPasswordInput(
            "confirmPassword",
            confirmPassword,
            setConfirmPassword,
            showConfirmPassword,
            setShowConfirmPassword,
            errors.confirmPassword,
            "Confirm password",
          )}
        </View>

        {/* Password requirements hint */}
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            Password must be at least 8 characters long
          </Text>
        </View>
      </ScrollView>

      {/* Update Button */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.updateButton,
            (!currentPassword || !newPassword || !confirmPassword || loading) &&
              styles.updateButtonDisabled,
          ]}
          onPress={handleUpdatePassword}
          disabled={
            !currentPassword || !newPassword || !confirmPassword || loading
          }
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.updateButtonText}>Update Password</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    width: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F6F6",
    borderWidth: 1,
    borderColor: "#B0B0B0",
    borderRadius: 25,
    paddingHorizontal: 18,
    height: 50,
  },
  inputError: {
    borderColor: "#B70808",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#000000",
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    color: "#B70808",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 18,
  },
  hintContainer: {
    marginTop: 20,
    paddingHorizontal: 18,
  },
  hintText: {
    fontSize: 12,
    color: "#656565",
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  updateButton: {
    backgroundColor: "#010135",
    borderRadius: 25,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  updateButtonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  updateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default UpdatePasswordScreen;
