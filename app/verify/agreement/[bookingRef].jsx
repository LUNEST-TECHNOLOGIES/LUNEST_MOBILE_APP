import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import bookingService from '../../../src/services/bookingService';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';

/**
 * Public Agreement Verification Page
 * Specifically designed for QR code scans from Rental Agreements.
 * Displays masked, verified data to confirm authenticity.
 */
const VerifyAgreementPage = () => {
  const { bookingRef } = useLocalSearchParams();
  const router = useRouter();
  
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
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#010135" />
        <Text className="mt-4 text-slate-500 font-medium">Verifying Agreement...</Text>
      </View>
    );
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
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <Stack.Screen options={{ 
        title: 'Verify Agreement',
        headerShown: false
      }} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header Branding */}
        <View className="bg-white px-6 pt-12 pb-6 items-center shadow-sm">
          <Image 
            source={require('../../../src/assets/images/lunest_logo_main.png')}
            style={{ width: 140, height: 40, resizeMode: 'contain' }}
          />
          <View className="mt-4 flex-row items-center bg-blue-50 px-3 py-1 rounded-full">
            <Ionicons name="shield-checkmark" size={14} color="#010135" />
            <Text className="ml-1.5 text-[#010135] font-bold text-[10px] uppercase tracking-tighter">SECURED BY LUNEST</Text>
          </View>
        </View>

        {/* Verification Status Card */}
        <View className="mx-5 -mt-4">
          <View className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200 border border-white">
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-green-50 rounded-full items-center justify-center mb-3">
                <Ionicons name="checkmark-seal" size={32} color="#10b981" />
              </View>
              <Text className="text-2xl font-bold text-slate-900">Verified Agreement</Text>
              <Text className="text-green-600 font-bold text-xs">Authentic & Legally Binding</Text>
            </View>

            <View className="bg-slate-50 rounded-2xl p-4 mb-6">
              <Text className="text-[10px] text-slate-400 font-bold uppercase mb-1">Agreement Reference</Text>
              <Text className="text-lg font-mono font-bold text-slate-800">{data.reference}</Text>
            </View>

            <View className="space-y-1">
              <InfoRow icon="business" label="Property Title" value={data.property?.title} />
              <InfoRow icon="location" label="Location" value={data.property?.location} />
              <InfoRow icon="person" label="Host (Landlord)" value={data.participants?.host} />
              <InfoRow icon="people" label="Tenant (Guest)" value={data.participants?.tenant} />
              <InfoRow icon="calendar" label="Occupation Period" value={`${new Date(data.dates?.checkIn).toLocaleDateString()} — ${new Date(data.dates?.checkOut).toLocaleDateString()}`} />
              <InfoRow icon="list" label="Document Status" value={data.status} />
            </View>
          </View>
        </View>

        {/* Technical Proof Footer */}
        <View className="mx-6 mt-8 p-5 rounded-2xl border border-dashed border-slate-300">
          <Text className="text-slate-400 text-[10px] font-bold uppercase mb-3 text-center">Digital Fingerprint & Proof</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-slate-500 text-[9px]">Authentication Hash</Text>
            <Text className="text-slate-800 text-[9px] font-mono">{data.authentication?.hash}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-slate-500 text-[9px]">Issued Date</Text>
            <Text className="text-slate-800 text-[9px]">{new Date(data.authentication?.generatedAt).toLocaleString()}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-slate-500 text-[9px]">Authority</Text>
            <Text className="text-slate-800 text-[9px] font-bold">{data.authentication?.platform}</Text>
          </View>
        </View>

        <View className="mx-6 mt-12 mb-8 bg-slate-100 rounded-3xl p-8 items-center border border-slate-200">
          <Ionicons name="information-circle-outline" size={24} color="#64748b" />
          <Text className="text-slate-600 text-[11px] text-center mt-3 font-medium leading-relaxed">
            This verification page serves as proof that the physical document scanned corresponds precisely to the digital record stored in the LUNEST vault. Sensitive details have been masked for privacy.
          </Text>
          
          <TouchableOpacity 
            onPress={() => router.replace('/')}
            className="mt-8 border border-slate-300 px-6 py-2 rounded-full"
          >
            <Text className="text-slate-600 font-bold text-xs uppercase">Dismiss</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VerifyAgreementPage;
