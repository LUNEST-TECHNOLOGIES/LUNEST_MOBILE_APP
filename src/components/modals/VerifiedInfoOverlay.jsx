import React from "react";
import { StyleSheet, View, Text, Image, Pressable, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DoneV2Icon from "../../assets/icons/done-v.svg";
import { Ionicons } from "@expo/vector-icons";

const VerifiedInfoOverlay = ({ visible, onClose }) => {
  const verificationItems = [
    "Fully verified by the LUNEST team",
    "Quiet, accessible area close to major roads and schools",
    "Long-term comfort, peace of mind guaranteed",
    "Verified Host/Landlord",
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.verifiedInfoOverlay}>
        <View style={styles.overlay} />
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Why this Property?</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#000000" />
            </Pressable>
          </View>

          {/* Verification Items */}
          <View style={styles.checkboxDetails}>
            {verificationItems.map((item, index) => (
              <View key={index} style={styles.detail}>
                <View style={styles.doneV}>
                  <DoneV2Icon width={18} height={18} />
                </View>
                <Text style={styles.fullyVerifiedBy}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  verifiedInfoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  overlay: {
    flex: 1,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 32,
    maxHeight: "70%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    
    color: "#000000",
    textAlign: "left",
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: -12,
  },
  checkboxDetails: {
    gap: 16,
  },
  detail: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  doneV: {
    height: 20,
    width: 20,
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(1, 1, 53, 0.1)",
    marginTop: 2,
  },
  fullyVerifiedBy: {
    fontSize: 14,
    fontWeight: "500",
    
    color: "#292929",
    textAlign: "left",
    flex: 1,
  },
});

export default VerifiedInfoOverlay;
