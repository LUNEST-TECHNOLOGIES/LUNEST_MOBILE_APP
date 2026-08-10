import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("=== [ErrorBoundary] Caught Exception ===");
    console.error("Error Message:", error?.message || error?.name || String(error));
    console.error("Error Details:", error);
    console.error("Component Stack:", errorInfo?.componentStack);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
  };

  handleCopyDetails = async () => {
    const { error, errorInfo } = this.state;
    const errorDetails = `Error: ${error?.toString()}\n\nStack Trace: ${errorInfo?.componentStack || "No stack trace available"}`;
    
    try {
      await Clipboard.setStringAsync(errorDetails);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      console.warn("Failed to copy error details:", err);
    }
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.toString() || "An unexpected error occurred";
      const stackTrace = this.state.errorInfo?.componentStack || "No stack trace available";

      return (
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <View style={styles.content}>
            {/* Header / Error Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <Ionicons name="alert-circle" size={48} color="#FF3B30" />
              </View>
            </View>

            {/* Information */}
            <Text style={styles.title}>System Interrupted</Text>
            <Text style={styles.subtitle}>
              LUNEST encountered an unexpected issue. You can try restarting the screen or copy the report details for developer support.
            </Text>

            {/* Error Detail Display */}
            <View style={styles.errorCard}>
              <View style={styles.errorHeader}>
                <Text style={styles.errorHeaderTitle}>Technical Details</Text>
                <TouchableOpacity 
                  style={styles.copyButton} 
                  onPress={this.handleCopyDetails}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={this.state.copied ? "checkmark-done" : "copy-outline"} 
                    size={16} 
                    color={this.state.copied ? "#2E7D32" : "#192DFF"} 
                  />
                  <Text style={[styles.copyButtonText, this.state.copied && styles.copyButtonTextSuccess]}>
                    {this.state.copied ? "Copied" : "Copy Details"}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.errorText}>{errorMsg}</Text>
                <Text style={styles.stackText}>{stackTrace}</Text>
              </ScrollView>
            </View>

            {/* Actions */}
            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={this.handleReset}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.resetButtonText}>Reload Application</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 40 : 60,
    paddingBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    marginBottom: 24,
    alignItems: "center",
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  errorCard: {
    width: "100%",
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    padding: 16,
    marginBottom: 32,
    maxHeight: 250,
    flexShrink: 1,
  },
  errorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    paddingBottom: 8,
  },
  errorHeaderTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#495057",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  copyButtonText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#192DFF",
  },
  copyButtonTextSuccess: {
    color: "#2E7D32",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  errorText: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 13,
    fontWeight: "600",
    color: "#FF3B30",
    marginBottom: 8,
    lineHeight: 18,
  },
  stackText: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 11,
    color: "#6C757D",
    lineHeight: 16,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#192DFF",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: "100%",
    maxWidth: 280,
    shadowColor: "#192DFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonIcon: {
    marginRight: 8,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
