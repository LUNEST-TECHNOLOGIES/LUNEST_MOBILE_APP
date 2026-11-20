import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

export default function BootScreen({ error = false, onRetry }) {
  return <View style={styles.screen} accessibilityLabel="LUNEST loading">
    <View style={styles.logoCard}><Image source={require('../../../assets/images/lunest-logo-white.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="LUNEST" /></View>
    {!error && <ActivityIndicator size="large" color="#FFFFFF" accessibilityLabel="Loading LUNEST" />}
    <Text style={styles.message}>{error ? 'Taking longer than expected. Check your connection and try again.' : 'Getting things ready…'}</Text>
    {error && <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable>}
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: '100%', backgroundColor: '#010135', justifyContent: 'center', alignItems: 'center', padding: 24, gap: 24 },
  logoCard: { maxWidth: '100%', paddingVertical: 12 },
  logo: { width: 220, height: 48, maxWidth: '100%' },
  message: { color: '#DCE6FF', fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 310 },
  retry: { backgroundColor: '#FFFFFF', borderRadius: 24, paddingHorizontal: 28, paddingVertical: 13 },
  retryText: { color: '#010135', fontSize: 14, fontWeight: '600' },
});
