import React, { useState, useEffect } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { resolveImageUrlSync } from "../../utils/imageUtils";
import configService from "../../services/configService";

const HostBookingConfirmationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    const fetchBaseUrl = async () => {
      const url = await configService.getBaseURL();
      setBaseUrl(url);
    };
    fetchBaseUrl();
  }, []);

  // Get booking from params (fallback to sample if not provided)
  const booking = route.params?.booking || {
    bookingId: "LNS-CD051DAE",
    dates: "Jul 2-2, 2026",
    guestAvatar: null,
    guestEmail: "",
    guestId: undefined,
    guestName: "Guest",
    guestPhone: "",
    id: "698605f982d72c2acd051dae",
    nights: 62,
    price: 0,
    propertyImage: "/uploads/listings/image_placeholder.jpg",
    propertyName: "1Bedroom Shortlet Apartment  in Abuja ",
    status: "CONFIRMED",
  };

  const resolvedImage = resolveImageUrlSync(booking.propertyImage, baseUrl);

  return (
    <SafeAreaView style={styles.bookingConfirm}>
      <View style={styles.view}>
        <View style={styles.bookingConfirmation}>
          <ScrollView style={styles.bookingConfirmationInner}>
            <View style={[styles.component61Parent, styles.parentPosition]}>
              <View style={[styles.component61, styles.componentParentFlexBox]}>
                <Text style={[styles.bookingRefCode, styles.checkInTypo]}>
                  Booking Ref. Code
                </Text>
                <Text style={[styles.bookingRefCode, styles.checkInTypo]}>
                  {booking.bookingId}
                </Text>
              </View>
              <View style={styles.frameParent}>
                <Image
                  style={styles.frameChild}
                  resizeMode="cover"
                  source={{ uri: resolvedImage }}
                />
                <View style={styles.frameGroup}>
                  <View style={styles.bedroomDuplexApartmenentWrapper}>
                    <Text style={styles.pleaseMakeSureTypo}>
                      {booking.propertyName}
                    </Text>
                  </View>
                  <View style={styles.bedroomDuplexApartmenentWrapper}>
                    <Text style={styles.pleaseMakeSureTypo}>
                      {booking.dates}
                    </Text>
                  </View>
                  <View
                    style={[styles.component62, styles.componentParentFlexBox]}
                  >
                    <Text style={[styles.bookingRefCode, styles.checkInTypo]}>
                      Booking Status
                    </Text>
                    <View
                      style={[
                        styles.confirmedWrapper,
                        styles.vuesaxGroupFlexBox,
                      ]}
                    >
                      <Text style={[styles.confirmed, styles.verifiedTypo]}>
                        {booking.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <View
                style={[
                  styles.component62Parent,
                  styles.component62ParentShadowBox,
                ]}
              >
                <View
                  style={[styles.component622, styles.componentParentFlexBox]}
                >
                  <Text style={[styles.bookingRefCode, styles.checkInTypo]}>
                    Booking Info
                  </Text>
                </View>
                <View style={styles.frameContainer}>
                  <View
                    style={[
                      styles.checkInParent,
                      styles.componentParentFlexBox,
                    ]}
                  >
                    <Text style={[styles.checkIn, styles.checkInTypo]}>
                      Check-in:
                    </Text>
                    <Text style={[styles.june152025, styles.checkInTypo]}>
                      {booking.dates.split("-")[0]}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkOutParent,
                      styles.componentParentFlexBox,
                    ]}
                  >
                    <Text style={[styles.checkIn, styles.checkInTypo]}>
                      Check-out:
                    </Text>
                    <Text style={[styles.bookingRefCode, styles.checkInTypo]}>
                      {booking.dates.split("-")[1]}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkOutParent,
                      styles.componentParentFlexBox,
                    ]}
                  >
                    <Text style={[styles.checkIn, styles.checkInTypo]}>
                      Total Nights:
                    </Text>
                    <Text style={[styles.bookingRefCode, styles.checkInTypo]}>
                      {booking.nights} Nights
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkOutParent,
                      styles.componentParentFlexBox,
                    ]}
                  >
                    <Text style={[styles.checkIn, styles.checkInTypo]}>
                      Guests:
                    </Text>
                    <Text style={[styles.bookingRefCode, styles.checkInTypo]}>
                      {booking.guestName}
                    </Text>
                  </View>
                  {/* Add more info as needed */}
                </View>
              </View>
              <View
                style={[
                  styles.component62Group,
                  styles.component62ParentShadowBox,
                ]}
              >
                <View style={[styles.component622, styles.componentParentFlexBox]}>
                  <Text style={[styles.bookingRefCode, styles.checkInTypo]}>
                    Payment Summary
                  </Text>
                </View>
                <View style={styles.frameView}>
                  <View style={styles.frameParent2}>
                    {/* Render breakdown if available */}
                    {booking.pricingBreakdown ? (
                      <>
                        <View style={[styles.checkInParent, styles.componentParentFlexBox]}>
                          <Text style={[styles.checkIn, styles.checkInTypo]}>Rent Fee:</Text>
                          <Text style={[styles.june152025, styles.checkInTypo]}>
                            ₦{booking.pricingBreakdown.rentFee?.toLocaleString() || "0"}
                          </Text>
                        </View>
                        {booking.pricingBreakdown.serviceCharge > 0 && (
                          <View style={[styles.checkInParent, styles.componentParentFlexBox]}>
                            <Text style={[styles.checkIn, styles.checkInTypo]}>Service Charge:</Text>
                            <Text style={[styles.june152025, styles.checkInTypo]}>
                              ₦{booking.pricingBreakdown.serviceCharge?.toLocaleString() || "0"}
                            </Text>
                          </View>
                        )}
                        <View style={[styles.checkInParent, styles.componentParentFlexBox]}>
                          <Text style={[styles.checkIn, styles.checkInTypo]}>App Fee (3%):</Text>
                          <Text style={[styles.june152025, styles.checkInTypo, { color: '#b70808' }]}>
                            - ₦{booking.pricingBreakdown.hostFee?.toLocaleString() || "0"}
                          </Text>
                        </View>
                        <View style={[styles.checkInParent, styles.componentParentFlexBox]}>
                          <Text style={[styles.checkIn, styles.checkInTypo]}>VAT on App Fee (7.5%):</Text>
                          <Text style={[styles.june152025, styles.checkInTypo, { color: '#b70808' }]}>
                            - ₦{booking.pricingBreakdown.hostVat?.toLocaleString() || "0"}
                          </Text>
                        </View>
                        <View style={[styles.checkInParent, styles.componentParentFlexBox]}>
                          <Text style={[styles.checkIn, styles.checkInTypo]}>Caution Fee (Held):</Text>
                          <Text style={[styles.june152025, styles.checkInTypo]}>
                            ₦{booking.pricingBreakdown.securityDeposit?.toLocaleString() || "0"}
                          </Text>
                        </View>
                        <View style={[styles.totalPaidParent, styles.componentParentFlexBox]}>
                          <Text style={[styles.checkIn, styles.checkInTypo, { fontWeight: '700', color: '#000' }]}>Your Total Earnings:</Text>
                          <Text style={[styles.june152025, styles.checkInTypo, { fontWeight: '700', fontSize: 16 }]}>
                            ₦{booking.pricingBreakdown.hostEarnings?.toLocaleString() || "0"}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={[styles.checkInParent, styles.componentParentFlexBox]}>
                        <Text style={[styles.checkIn, styles.checkInTypo]}>
                          Estimated Earning:
                        </Text>
                        <Text style={[styles.june152025, styles.checkInTypo]}>
                          ₦{booking.price?.toLocaleString() || "0"}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <View
                style={[
                  styles.component62Container,
                  styles.component62ParentShadowBox,
                ]}
              >
                <View
                  style={[styles.component622, styles.componentParentFlexBox]}
                >
                  <Text style={[styles.bookingRefCode, styles.checkInTypo]}>
                    Guest Information
                  </Text>
                </View>
                <View style={styles.frameParent3}>
                  <View style={styles.frameGroup}>
                    <View
                      style={[
                        styles.checkInParent,
                        styles.componentParentFlexBox,
                      ]}
                    >
                      <Text style={[styles.checkIn, styles.checkInTypo]}>
                        Name:
                      </Text>
                      <Text style={[styles.june152025, styles.checkInTypo]}>
                        {booking.guestName}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkOutParent,
                        styles.componentParentFlexBox,
                      ]}
                    >
                      <Text style={[styles.checkIn, styles.checkInTypo]}>
                        Phone:
                      </Text>
                      <Text style={[styles.bookingRefCode, styles.checkInTypo]}>
                        {booking.guestPhone || "-"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkOutParent,
                        styles.componentParentFlexBox,
                      ]}
                    >
                      <Text style={[styles.checkIn, styles.checkInTypo]}>
                        Email Address:
                      </Text>
                      <Text style={[styles.bookingRefCode, styles.checkInTypo]}>
                        {booking.guestEmail || "-"}
                      </Text>
                    </View>
                  </View>
                  {/* Add KYC status, profile, etc. if available */}
                </View>
              </View>
              {/* Additional Notes section can be added here if needed */}
            </View>
          </ScrollView>
          <View style={[styles.downloadParent, styles.parentPosition]}>
            <Text style={styles.bookingDetails}>Booking Details</Text>
            <Pressable
              style={styles.wrapper}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                // Fallback to host tabs if we can't go back
                navigation.navigate("(host-tabs)");
              }
            }}
            >
              <Text style={{ fontSize: 18 }}>{"< Back"}</Text>
            </Pressable>
          </View>
          <View style={[styles.buttonStyle2Parent, styles.downloadPosition]}>
            <Pressable
              style={[styles.buttonStyle2, styles.buttonLayout]}
              onPress={() => {}}
            >
              <Text style={[styles.button, styles.buttonTypo]}>
                Contact Guest
              </Text>
            </Pressable>
            <Pressable
              style={[styles.buttonStyle3, styles.buttonStyle3Border]}
              onPress={() => {}}
            >
              <Text style={[styles.button2, styles.buttonTypo]}>
                Cancel Booking
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  bookingConfirm: {
    backgroundColor: "#fff",
    flex: 1,
  },
  parentPosition: {
    top: 0,
    position: "absolute",
  },
  componentParentFlexBox: {
    justifyContent: "space-between",
    flexDirection: "row",
  },
  checkInTypo: {
    textAlign: "left",
    fontFamily: "Aeonik Pro",
    fontWeight: "500",
    fontSize: 14,
  },
  vuesaxGroupFlexBox: {
    paddingVertical: 3,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  verifiedTypo: {
    fontSize: 12,
    textAlign: "left",
    fontFamily: "Aeonik Pro",
    fontWeight: "500",
  },
  component62ParentShadowBox: {
    gap: 35,
    alignSelf: "stretch",
    padding: 10,
    borderRadius: 10,
    elevation: 36,
    shadowColor: "#efefef",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 36,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  pleaseMakeSureTypo: {
    color: "#292929",
    textAlign: "left",
    fontFamily: "Aeonik Pro",
    fontWeight: "500",
    fontSize: 14,
  },
  downloadPosition: {
    left: "50%",
    position: "absolute",
  },
  buttonLayout: {
    paddingVertical: 12,
    borderRadius: 25,
    width: 180,
    height: 50,
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  buttonTypo: {
    fontFamily: "Aeonik TRIAL",
    fontSize: 16,
  },
  buttonStyle3Border: {
    borderWidth: 1,
    borderStyle: "solid",
  },
  view: {
    height: 956,
    overflow: "hidden",
    width: "100%",
    backgroundColor: "#fff",
  },
  bookingConfirmation: {
    top: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: 906,
    width: 440,
    left: 0,
    position: "absolute",
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  bookingConfirmationInner: {
    top: 120,
    left: 10,
    maxWidth: 420,
    width: 420,
    position: "absolute",
    flex: 1,
  },
  component61Parent: {
    gap: 10,
    alignItems: "center",
    width: 420,
    left: 0,
    top: 0,
  },
  component61: {
    gap: 20,
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 20,
    width: 400,
  },
  bookingRefCode: {
    color: "#000",
  },
  frameParent: {
    height: 314,
    gap: 25,
    padding: 10,
    borderRadius: 10,
    elevation: 36,
    shadowColor: "#efefef",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 36,
    width: 420,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  frameChild: {
    height: 169,
    borderRadius: 6,
    width: 400,
  },
  frameGroup: {
    alignSelf: "stretch",
    gap: 20,
  },
  bedroomDuplexApartmenentWrapper: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
  },
  component62: {
    gap: 20,
    height: 20,
    width: 400,
    alignItems: "center",
  },
  confirmedWrapper: {
    width: 98,
    backgroundColor: "rgba(49, 235, 61, 0.3)",
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  confirmed: {
    color: "#2e7d32",
  },
  component62Parent: {
    height: 262,
  },
  component622: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 20,
    width: 400,
  },
  frameContainer: {
    justifyContent: "center",
    alignSelf: "stretch",
    gap: 25,
  },
  checkInParent: {
    alignSelf: "stretch",
    gap: 20,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  checkIn: {
    color: "#525252",
  },
  june152025: {
    color: "#000",
    overflow: "hidden",
  },
  checkOutParent: {
    alignSelf: "stretch",
    gap: 20,
  },
  component62Group: {
    height: 255,
  },
  frameView: {
    justifyContent: "center",
    alignSelf: "stretch",
    gap: 10,
  },
  frameParent2: {
    alignSelf: "stretch",
    gap: 25,
  },
  totalPaidParent: {
    borderColor: "#bdbdbd",
    borderTopWidth: 1,
    paddingHorizontal: 0,
    paddingVertical: 10,
    borderStyle: "solid",
    alignSelf: "stretch",
    gap: 20,
    justifyContent: "space-between",
    flexDirection: "row",
  },
  component62Container: {
    height: 252,
  },
  frameParent3: {
    gap: 15,
    justifyContent: "center",
    alignSelf: "stretch",
  },
  downloadParent: {
    left: 1,
    width: 439,
    height: 76,
    overflow: "hidden",
  },
  bookingDetails: {
    marginLeft: -56,
    top: 28,
    fontSize: 16,
    left: "50%",
    textAlign: "left",
    color: "#000",
    fontFamily: "Aeonik Pro",
    fontWeight: "500",
    position: "absolute",
  },
  wrapper: {
    left: 19,
    top: 18,
    width: 40,
    height: 40,
    position: "absolute",
  },
  buttonStyle2Parent: {
    marginLeft: -200,
    bottom: 39,
    gap: 40,
    flexDirection: "row",
    width: 400,
    backgroundColor: "#fff",
  },
  buttonStyle2: {
    backgroundColor: "#010135",
    paddingHorizontal: 98,
  },
  button: {
    fontWeight: "700",
    lineHeight: 16,
    fontFamily: "Aeonik TRIAL",
    textAlign: "left",
    color: "#fff",
  },
  buttonStyle3: {
    borderColor: "#b70808",
    paddingHorizontal: 103,
    paddingVertical: 12,
    borderRadius: 25,
    width: 180,
    height: 50,
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  button2: {
    color: "#b70808",
    fontWeight: "700",
    lineHeight: 16,
    fontFamily: "Aeonik TRIAL",
    textAlign: "left",
  },
});

export default HostBookingConfirmationScreen;
