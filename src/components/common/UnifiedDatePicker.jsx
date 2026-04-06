import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/**
 * UnifiedDatePicker - A cross-platform date picker component
 * 
 * @param {Date} value - Current date value
 * @param {Function} onChange - Callback (date) => void
 * @param {boolean} visible - Visibility for mobile modal
 * @param {Function} onClose - Close callback for mobile modal
 * @param {string} mode - 'date', 'time', etc.
 * @param {Date} minimumDate - Min selectable date
 */
const UnifiedDatePicker = ({
  value,
  onChange,
  visible,
  onClose,
  mode = "date",
  minimumDate = new Date(),
  title = "Select Date",
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hydration safety: Don't render anything until mounted on the client
  if (!mounted) return null;

  // --- Web Implementation ---
  if (Platform.OS === "web") {
    if (!visible) return null;

    // Convert Date object to YYYY-MM-DD for input[type="date"]
    const formatDateForInput = (d) => {
      if (!d) return "";
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const handleWebChange = (e) => {
      const newDate = new Date(e.target.value);
      if (!isNaN(newDate.getTime())) {
        onChange(newDate);
      }
    };

    return (
      <Modal transparent visible={visible} animationType="fade">
        <Pressable style={styles.webOverlay} onPress={onClose}>
          <View style={styles.webPickerContainer} onStartShouldSetResponder={() => true}>
            <Text style={styles.webPickerTitle}>{title}</Text>
            <input
              type={mode === "date" ? "date" : "datetime-local"}
              defaultValue={formatDateForInput(value || new Date())}
              min={formatDateForInput(minimumDate)}
              onChange={handleWebChange}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                borderRadius: "8px",
                border: "1px solid #E5E5E5",
                marginTop: "12px",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <TouchableOpacity style={styles.webDoneBtn} onPress={onClose}>
              <Text style={styles.webDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    );
  }

  // --- Mobile Implementation (iOS) ---
  if (Platform.OS === "ios") {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.iosDatePickerContainer}>
          <View style={styles.iosDatePickerHeader}>
            <Pressable onPress={onClose}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </Pressable>
            <Text style={styles.datePickerTitle}>{title}</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.doneButton}>Done</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={value || new Date()}
            onChange={(event, date) => {
              if (date) onChange(date);
            }}
            mode={mode}
            display="spinner"
            textColor="#010135"
            minimumDate={minimumDate}
          />
        </View>
      </Modal>
    );
  }

  // --- Mobile Implementation (Android) ---
  if (Platform.OS === "android") {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={value || new Date()}
        mode={mode}
        display="default"
        onChange={(event, date) => {
          onClose(); // Hide picker
          if (event.type !== "dismissed" && date) {
            onChange(date);
          }
        }}
        minimumDate={minimumDate}
      />
    );
  }

  return null;
};

const styles = StyleSheet.create({
  // Web Styles
  webOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  webPickerContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    elevation: 5,
  },
  webPickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#010135",
    marginBottom: 4,
  },
  webDoneBtn: {
    backgroundColor: "#010135",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  webDoneBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  // iOS Styles
  iosDatePickerContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  iosDatePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  cancelButton: {
    color: "#FF3B30",
    fontSize: 16,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#010135",
  },
  doneButton: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default UnifiedDatePicker;
