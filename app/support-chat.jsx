import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { getUserData } from '../src/services/userDataService';

export default function SupportChatScreen() {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tawkReady, setTawkReady] = useState(false);
  const webviewRef = useRef(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await getUserData();
        if (data) {
          setUserData({
            name: data.fullName || "Lunest User",
            email: data.email || data.emailAddress || "",
            hash: data.tawkHash || "" // For Tawk.to Secure Mode if enabled
          });
        }
      } catch (error) {
        console.error("Error loading user for chat:", error);
      }
    };
    loadUser();
  }, []);

  const tawkUrl = 'https://tawk.to/chat/69a81df48dec521c3784c6ee/1jisba1oc';

  // Inject script after WebView loads to pass user info and hide branding/menu
  const injectedLogic = `
    (function() {
      // Notify React Native when Tawk is loaded
      var checkTawk = setInterval(function() {
        if (typeof Tawk_API !== 'undefined') {
          window.ReactNativeWebView.postMessage('TAWK_LOADED');
          clearInterval(checkTawk);

          // Set user attributes
          if (${JSON.stringify(!!userData)}) {
            Tawk_API.setAttributes({
                'name': '${userData?.name || "Lunest User"}',
                'email': '${userData?.email || ""}',
                'hash': '${userData?.hash || ""}'
            }, function(error){});
          }
        }
      }, 500);

      // Hide branding and menu elements via CSS injection
      var style = document.createElement('style');
      style.innerHTML = \`
        .tawk-footer-branding, 
        .tawk-branding, 
        #tawk-branding,
        [class*="tawk-branding"],
        .tawk-menu,
        #tawk-menu,
        .tawk-button-circle.tawk-button-large.tawk-button-subtle { 
          display: none !important; 
          visibility: hidden !important; 
          height: 0 !important; 
          opacity: 0 !important;
          pointer-events: none !important;
        }
      \`;
      document.head.appendChild(style);
    })();
    true;
  `;

  const onMessage = (event) => {
    if (event.nativeEvent.data === 'TAWK_LOADED') {
      setTawkReady(true);
      setIsLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={[
      styles.header,
      { paddingTop: Math.max(insets.top, 10) }
    ]}>
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={28} color="#333" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Live Support</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  const renderLoadingOverlay = () => (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#010135" />
      <Text style={styles.loadingText}>Connecting to Support...</Text>
    </View>
  );

  // For Expo Web
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 10) }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Live Support</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1 }}>
          <iframe 
            src={tawkUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Support Chat"
            onLoad={() => setIsLoading(false)}
          />
          {isLoading && renderLoadingOverlay()}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {renderHeader()}
      <View style={{ flex: 1 }}>
        <WebView 
          ref={webviewRef}
          source={{ uri: tawkUrl }}
          style={{ flex: 1 }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          injectedJavaScript={injectedLogic}
          onMessage={onMessage}
          onLoadEnd={() => {
            // Fallback if message fails
            setTimeout(() => setIsLoading(false), 5000);
          }}
          renderLoading={() => renderLoadingOverlay()}
        />
        {(isLoading || !tawkReady) && renderLoadingOverlay()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
    height: 56,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#010135',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9991,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  }
});

