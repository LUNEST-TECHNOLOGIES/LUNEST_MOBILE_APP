import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
  const [viewDate, setViewDate] = useState(value || new Date());
  const [selectedDate, setSelectedDate] = useState(value);
  const [isMonthSelectVisible, setIsMonthSelectVisible] = useState(false);
  const [isYearSelectVisible, setIsYearSelectVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update internal state if prop value changes (for web)
  useEffect(() => {
    if (value && Platform.OS === "web") {
      setSelectedDate(value);
      setViewDate(value);
    }
  }, [value]);

  const [tempDate, setTempDate] = useState(value || new Date());

  const handleIOSDone = () => {
    onChange(tempDate);
    onClose();
  };

  // Hydration safety: Don't render anything until mounted on the client
  if (!mounted) return null;

  // --- Web Implementation ---
  if (Platform.OS === "web") {
    if (!visible) return null;

    const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const navigateMonth = (direction) => {
      const nextDate = new Date(year, month + direction, 1);
      setViewDate(nextDate);
    };

    const isSameDay = (d1, d2) => {
      if (!d1 || !d2) return false;
      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      );
    };

    const isDateDisabled = (d) => {
      if (!minimumDate) return false;
      const checkDate = new Date(d);
      checkDate.setHours(0, 0, 0, 0);
      const minDate = new Date(minimumDate);
      minDate.setHours(0, 0, 0, 0);
      return checkDate < minDate;
    };

    const handleDateClick = (day) => {
      const newDate = new Date(year, month, day);
      if (!isDateDisabled(newDate)) {
        setSelectedDate(newDate);
        onChange(newDate);
        onClose();
      }
    };

    const renderCalendarDays = () => {
      const days = [];
      // Empty cells for days before the first day of the month
      for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(<View key={`empty-${i}`} style={styles.webDayCell} />);
      }

      // Day cells
      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const isSelected = isSameDay(dateObj, selectedDate);
        const isDisabled = isDateDisabled(dateObj);
        const isToday = isSameDay(dateObj, new Date());

        days.push(
          <TouchableOpacity
            key={day}
            style={[
              styles.webDayCell,
              isSelected && styles.webDaySelected,
              isDisabled && styles.webDayDisabled,
              isToday && !isSelected && styles.webDayToday,
            ]}
            onPress={() => handleDateClick(day)}
            disabled={isDisabled}
          >
            <Text style={[
              styles.webDayText,
              isSelected && styles.webDayTextSelected,
              isDisabled && styles.webDayTextDisabled,
              isToday && !isSelected && styles.webDayTextToday,
            ]}>
              {day}
            </Text>
          </TouchableOpacity>
        );
      }
      return days;
    };

    return (
      <Modal transparent visible={visible} animationType="fade">
        <Pressable style={styles.webOverlay} onPress={onClose}>
          <View style={styles.webPickerContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.webPickerHeader}>
              <Text style={styles.webPickerTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.webCloseIcon}>
                <Text style={{ fontSize: 20, color: "#999" }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.webCalendarNav}>
              <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.webNavBtn}>
                <Text style={styles.webNavBtnText}>‹</Text>
              </TouchableOpacity>
              
              <View style={styles.webMonthYearContainer}>
                <TouchableOpacity 
                  onPress={() => {
                    setIsMonthSelectVisible(!isMonthSelectVisible);
                    setIsYearSelectVisible(false);
                  }}
                  style={styles.webMonthSelector}
                >
                  <Text style={styles.webCurrentMonth}>{months[month]}</Text>
                  <Text style={styles.webSelectorArrow}>▾</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => {
                    setIsYearSelectVisible(!isYearSelectVisible);
                    setIsMonthSelectVisible(false);
                  }}
                  style={styles.webYearSelector}
                >
                  <Text style={styles.webCurrentMonth}>{year}</Text>
                  <Text style={styles.webSelectorArrow}>▾</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.webNavBtn}>
                <Text style={styles.webNavBtnText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Month Selection Overlay */}
            {isMonthSelectVisible && (
              <View style={styles.webSelectionOverlay}>
                <View style={styles.webSelectionGrid}>
                  {months.map((m, idx) => (
                    <TouchableOpacity 
                      key={m} 
                      style={[styles.webSelectionItem, month === idx && styles.webSelectionItemActive]}
                      onPress={() => {
                        setViewDate(new Date(year, idx, 1));
                        setIsMonthSelectVisible(false);
                      }}
                    >
                      <Text style={[styles.webSelectionItemText, month === idx && styles.webSelectionItemTextActive]}>
                        {m.substring(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Year Selection Overlay */}
            {isYearSelectVisible && (
              <View style={styles.webSelectionOverlay}>
                <ScrollView 
                  style={{ maxHeight: 200 }} 
                  contentContainerStyle={styles.webSelectionGrid}
                  showsVerticalScrollIndicator={false}
                >
                  {Array.from({ length: 21 }, (_, i) => year - 5 + i).map((y) => (
                    <TouchableOpacity 
                      key={y} 
                      style={[styles.webSelectionItem, year === y && styles.webSelectionItemActive]}
                      onPress={() => {
                        setViewDate(new Date(y, month, 1));
                        setIsYearSelectVisible(false);
                      }}
                    >
                      <Text style={[styles.webSelectionItemText, year === y && styles.webSelectionItemTextActive]}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {!isMonthSelectVisible && !isYearSelectVisible && (
              <>
                <View style={styles.webWeekdaysRow}>
                  {daysOfWeek.map((d) => (
                    <Text key={d} style={styles.webWeekdayText}>
                      {d}
                    </Text>
                  ))}
                </View>

                <View style={styles.webDaysGrid}>
                  {renderCalendarDays()}
                </View>
              </>
            )}

            <View style={styles.webFooter}>
              <TouchableOpacity style={styles.webCancelBtn} onPress={onClose}>
                <Text style={styles.webCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
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
            <Pressable onPress={handleIOSDone}>
              <Text style={styles.doneButton}>Done</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={tempDate}
            onChange={(event, date) => {
              if (date) setTempDate(date);
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
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    cursor: "default",
  },
  webPickerContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 350,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  webPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  webPickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#010135",
  },
  webCloseIcon: {
    padding: 4,
  },
  webCalendarNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  webNavBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F5F5F7",
  },
  webNavBtnText: {
    fontSize: 18,
    color: "#010135",
    fontWeight: "600",
  },
  webCurrentMonth: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010135",
  },
  webMonthYearContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  webMonthSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#F5F5F7",
  },
  webYearSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#F5F5F7",
  },
  webSelectorArrow: {
    fontSize: 10,
    color: "#010135",
    marginLeft: 4,
    opacity: 0.5,
  },
  webSelectionOverlay: {
    paddingVertical: 10,
    minHeight: 200,
    justifyContent: "center",
  },
  webSelectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  webSelectionItem: {
    width: "30%",
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 8,
    borderRadius: 8,
  },
  webSelectionItemActive: {
    backgroundColor: "#010135",
  },
  webSelectionItemText: {
    fontSize: 14,
    color: "#010135",
    fontWeight: "500",
  },
  webSelectionItemTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  webWeekdaysRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  webWeekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
  },
  webDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  webDayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 2,
  },
  webDayText: {
    fontSize: 14,
    color: "#010135",
  },
  webDaySelected: {
    backgroundColor: "#010135",
  },
  webDayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  webDayToday: {
    backgroundColor: "#F0F0FF",
  },
  webDayTextToday: {
    color: "#010135",
    fontWeight: "700",
  },
  webDayDisabled: {
    opacity: 0.3,
  },
  webDayTextDisabled: {
    color: "#CCC",
  },
  webFooter: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
    paddingTop: 16,
    alignItems: "flex-end",
  },
  webCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  webCancelBtnText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
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
