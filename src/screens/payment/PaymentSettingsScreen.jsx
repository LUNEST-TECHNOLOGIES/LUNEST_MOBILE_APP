/**
 * PaymentSettingsScreen - Manage payment methods, view payments, and coupons
 */
import { Ionicons } from "@expo/vector-icons";
import { ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PaymentSettingsScreen = () => {
  const router = useRouter();

  const menuItems = [
    {
      id: "payment-methods",
      icon: "card-outline",
      title: "Payment Method",
      subtitle: "Add or manage your payment cards",
      badge: "Coming Soon",
      onPress: () => {}, // No navigation
    },
    {
      id: "your-payments",
      icon: "receipt-outline",
      title: "Your Payments",
      subtitle: "View payment history and receipts",
      onPress: () => router.push("/transaction-history"),
    },
    {
      id: "coupons",
      icon: "pricetag-outline",
      title: "Coupons",
      subtitle: "View and redeem your coupons",
      onPress: () => router.push("/coupons"),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#000" strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Payment Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <Pressable
            key={item.id}
            style={[
              styles.menuItem,
              index < menuItems.length - 1 && styles.menuItemBorder,
            ]}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name={item.icon} size={22} color="#192DFF" />
              </View>
              <View style={styles.menuItemText}>
                <View style={styles.titleRow}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  {item.badge && (
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>{item.badge}</Text>
                    </View>
                  )}
                </View>
                {item.subtitle && (
                  <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </Pressable>
        ))}
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
  menuContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E7E7E7",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000000",
  },
  comingSoonBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1D4ED8",
    letterSpacing: 0.3,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: "#666666",
    marginTop: 2,
  },
});

export default PaymentSettingsScreen;
