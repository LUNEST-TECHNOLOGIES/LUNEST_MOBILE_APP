import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

/**
 * Global Mode Switching Overlay
 * Shows during mode switch while data is being loaded
 */
const ModeSwitchingOverlay = ({ visible, targetMode, onCancel }) => {
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    let timer;
    if (visible) {
      setShowCancel(false);
      // Show cancel button after 5 seconds of hanging
      timer = setTimeout(() => setShowCancel(true), 5000);
    }
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.switchingOverlay}>
        <View style={styles.switchingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.switchingTitle}>
            Switching to {targetMode || 'New'} Mode
          </Text>
          <Text style={styles.switchingSubtitle}>
            Loading your personalized data...
          </Text>

          {showCancel && (
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel and Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  switchingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  switchingContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginHorizontal: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  switchingTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginTop: 16,
    textAlign: "center",
  },
  switchingSubtitle: {
    fontSize: 14,
    color: "#666666",
    marginTop: 8,
    textAlign: "center",
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cancelButtonText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default ModeSwitchingOverlay;
