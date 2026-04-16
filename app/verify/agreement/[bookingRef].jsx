import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeIn } from 'react-native-reanimated';
import { VerificationSkeleton } from '../../../src/components/skeletons/ScreenSkeletons';
import bookingService from '../../../src/services/bookingService';

/**
 * Public Agreement Verification Page
 * Specifically designed for QR code scans from Rental Agreements.
 * Displays masked, verified data to confirm authenticity.
 */
const VerifyAgreementPage = () => {
  const { bookingRef } = useLocalSearchParams();
  const router = useRouter();

  // ── Privacy Utilities ──
  const maskName = (name) => {
    if (!name || typeof name !== 'string') return "N/A";
    return name.split(' ').map(part => {
      if (part.length <= 2) return part;
      if (part.length <= 4) return part[0] + '*'.repeat(part.length - 2) + part[part.length - 1];
      // Show first 2 and last 1, mask the rest
      return part.substring(0, 2) + '*'.repeat(Math.min(part.length - 3, 5)) + part[part.length - 1];
    }).join(' ');
  };
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (bookingRef) {
      fetchVerification();
    }
  }, [bookingRef]);

  const fetchVerification = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the centralized booking service
      const result = await bookingService.verifyPublicAgreement(bookingRef);
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.message || "This document could not be verified in our records.");
      }
    } catch (err) {
      console.error("[VerifyAgreementPage] Fetch Error:", err);
      setError("Invalid or expired agreement reference.");
    } finally {
      setLoading(false);
    }
  };

  const InfoRow = ({ label, value, icon }) => (
    <View className="flex-row items-center py-3 border-b border-gray-100">
      <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center mr-3">
        <Ionicons name={icon} size={16} color="#010135" />
      </View>
      <View className="flex-1">
        <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</Text>
        <Text className="text-sm text-slate-800 font-semibold">{value || "N/A"}</Text>
      </View>
    </View>
  );

  if (loading) {
    return <VerificationSkeleton />;
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 px-6 items-center justify-center">
          <View className="w-20 h-20 bg-red-50 rounded-full items-center justify-center mb-6">
            <Ionicons name="alert-circle" size={40} color="#ef4444" />
          </View>
          <Text className="text-xl font-bold text-slate-900 text-center mb-2">Unverified Document</Text>
          <Text className="text-slate-500 text-center mb-8">{error}</Text>
          
          <TouchableOpacity 
            onPress={() => router.replace('/')}
            className="bg-slate-900 px-8 py-3 rounded-xl"
          >
            <Text className="text-white font-bold">Go to Lunest Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 lg:bg-slate-200" edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ 
        title: 'Verify Agreement',
        headerShown: false
      }} />
      
      <ScrollView 
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        style={{ flex: 1 }}
      >
        <View className="items-center lg:py-10 min-h-full">
            {/* Header Branding */}
            <View className="bg-white px-6 py-8 lg:py-12 items-center shadow-sm lg:rounded-b-[40px]">
              <Image 
                source={require('../../../src/assets/images/lunest_logo_main.png')}
                style={{ width: 140, height: 40, resizeMode: 'contain' }}
              />
              <View className="mt-4 flex-row items-center bg-blue-50 px-4 py-1.5 rounded-full">
                <Ionicons name="shield-checkmark" size={14} color="#010135" />
                <Text className="ml-2 text-[#010135] font-bold text-[10px] uppercase tracking-widest">SECURED BY LUNEST SHIELD™</Text>
              </View>
            </View>

            {/* Verification Status Card */}
            <Animated.View 
              entering={FadeIn.duration(600)}
              className="px-5 -mt-6"
            >
              <View className="bg-white rounded-[40px] p-6 lg:p-10 shadow-xl shadow-slate-200 border border-white">
                <View className="items-center mb-8">
                  <View className="w-20 h-20 bg-green-50 rounded-3xl items-center justify-center mb-4">
                    <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                  </View>
                  <Text className="text-3xl font-bold text-slate-900">Verified</Text>
                  <Text className="text-green-600 font-bold text-xs tracking-wide">Authentic & Legally Binding</Text>
                </View>

                <View className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-100">
                  <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Agreement Reference</Text>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xl font-mono font-bold text-slate-800 tracking-tight">{data.reference}</Text>
                    <TouchableOpacity 
                      onPress={async () => {
                        await Clipboard.setStringAsync(data.reference);
                        // Optional: Add a simple feedback if needed, but the icon change/toast is better
                      }}
                      hitSlop={10}
                    >
                      <Ionicons name="copy-outline" size={16} color="#010135" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="space-y-1">
                  <InfoRow icon="business" label="Property Title" value={data.property?.title} />
                  <InfoRow icon="location" label="Location" value={data.property?.location} />
                  <InfoRow icon="person" label="Host (Landlord)" value={maskName(data.participants?.host)} />
                  <InfoRow icon="people" label="Tenant (Guest)" value={maskName(data.participants?.tenant)} />
                  <InfoRow icon="calendar" label="Occupation Period" value={`${new Date(data.dates?.checkIn).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} — ${new Date(data.dates?.checkOut).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`} />
                  <InfoRow icon="list" label="Document Status" value={data.status} />
                </View>
              </View>
            </Animated.View>

            {/* Technical Proof Footer */}
            <View className="mx-8 mt-10 p-6 rounded-3xl bg-slate-100/50 border border-dashed border-slate-200">
              <Text className="text-slate-400 text-[10px] font-bold uppercase mb-4 text-center tracking-widest">Digital Fingerprint & Proof</Text>
              <View className="space-y-3">
                <View className="flex-row justify-between">
                  <Text className="text-slate-500 text-[10px]">Authentication Hash</Text>
                  <Text className="text-slate-800 text-[10px] font-mono">{data.authentication?.hash}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-slate-500 text-[10px]">Issued Date</Text>
                  <Text className="text-slate-800 text-[10px]">{new Date(data.authentication?.generatedAt).toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-slate-500 text-[10px]">Authority</Text>
                  <Text className="text-slate-800 text-[10px] font-bold uppercase">{data.authentication?.platform}</Text>
                </View>
              </View>
            </View>

            <View className="mx-8 mt-10 mb-8 items-center">
              <View className="flex-row items-center mb-6 px-4">
                <Ionicons name="information-circle-outline" size={20} color="#94a3b8" />
                <Text className="text-slate-400 text-[11px] text-center ml-2 font-medium leading-relaxed">
                  This secure page confirms that this document corresponds precisely to the LUNEST digital vault record.
                </Text>
              </View>
              
              <TouchableOpacity 
                onPress={() => router.replace('/')}
                className="bg-primary px-10 py-4 rounded-2xl shadow-md"
              >
                <Text className="text-white font-bold text-sm tracking-wide">Back to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VerifyAgreementPage;
