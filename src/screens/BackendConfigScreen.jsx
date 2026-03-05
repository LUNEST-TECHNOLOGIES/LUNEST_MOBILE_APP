import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import configService from "../services/configService";

export default function BackendConfigScreen() {
  const [currentURL, setCurrentURL] = useState("");
  const [customURL, setCustomURL] = useState("");
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadCurrentURL();
  }, []);

  const loadCurrentURL = async () => {
    const url = await configService.getCurrentBackendURL();
    setCurrentURL(url);
  };

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const result = await configService.testConnection();
      setTestResult(result);

      if (result.success) {
        Alert.alert("Success", `Connected successfully in ${result.latency}ms`);
      } else {
        Alert.alert("Connection Failed", result.message);
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCustomURL = async () => {
    if (!customURL.trim()) {
      Alert.alert("Error", "Please enter a valid URL");
      return;
    }

    setLoading(true);
    try {
      const success = await configService.setCustomBackendURL(customURL);
      if (success) {
        setCurrentURL(customURL);
        setCustomURL("");
        Alert.alert("Success", "Backend URL updated successfully");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCustomURL = async () => {
    Alert.alert("Confirm", "Reset to auto-detected URL?", [
      {
        text: "Cancel",
        onPress: () => {},
      },
      {
        text: "Reset",
        onPress: async () => {
          setLoading(true);
          try {
            await configService.clearCustomBackendURL();
            await loadCurrentURL();
            Alert.alert("Success", "Reset to auto-detected URL");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">Backend Configuration</Text>

      {/* Current URL */}
      <View className="mb-6 p-4 bg-gray-100 rounded-lg">
        <Text className="text-sm text-gray-600 mb-2">Current Backend URL:</Text>
        <Text className="text-lg font-mono font-bold text-gray-900">
          {currentURL}
        </Text>
        <Text className="text-xs text-gray-500 mt-2">
          This is auto-detected based on your platform and environment
        </Text>
      </View>

      {/* Connection Test */}
      <TouchableOpacity
        onPress={handleTestConnection}
        disabled={loading}
        className="mb-6 bg-blue-500 rounded-lg p-4"
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white text-center font-bold">
            Test Connection
          </Text>
        )}
      </TouchableOpacity>

      {testResult && (
        <View
          className={`mb-6 p-4 rounded-lg ${testResult.success ? "bg-green-100" : "bg-red-100"}`}
        >
          <Text
            className={`font-bold ${testResult.success ? "text-green-900" : "text-red-900"}`}
          >
            {testResult.message}
          </Text>
          {testResult.latency > 0 && (
            <Text className="text-sm text-gray-600 mt-2">
              Response time: {testResult.latency}ms
            </Text>
          )}
        </View>
      )}

      {/* Custom URL Input */}
      <View className="mb-6 border border-gray-300 rounded-lg p-4">
        <Text className="text-sm font-bold text-gray-700 mb-2">
          Set Custom URL (Optional)
        </Text>
        <TextInput
          placeholder="e.g., http://192.168.1.100:3000"
          value={customURL}
          onChangeText={setCustomURL}
          editable={!loading}
          className="border border-gray-300 rounded p-2 mb-3"
          autoCapitalize="none"
          keyboardType="url"
        />
        <TouchableOpacity
          onPress={handleSetCustomURL}
          disabled={loading || !customURL.trim()}
          className="bg-green-500 rounded-lg p-3 mb-2"
        >
          <Text className="text-white text-center font-bold">
            Set Custom URL
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reset Button */}
      <TouchableOpacity
        onPress={handleClearCustomURL}
        className="bg-gray-400 rounded-lg p-4"
      >
        <Text className="text-white text-center font-bold">
          Reset to Auto-Detection
        </Text>
      </TouchableOpacity>

      {/* Info Box */}
      <View className="mt-6 p-4 bg-blue-50 rounded-lg">
        <Text className="text-sm font-bold text-blue-900 mb-2">
          Environment Detection:
        </Text>
        <Text className="text-xs text-blue-800">
          • Android Emulator → 10.0.2.2:3000{"\n"}• iOS Simulator →
          localhost:3000{"\n"}• Physical Device → Auto-detected local IP{"\n"}•
          Web → localhost:3000
        </Text>
      </View>
    </ScrollView>
  );
}
