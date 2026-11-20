import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getConnectionState, subscribeConnection, setDeviceOffline, reportNetworkSuccess } from '../../services/connectionService';
import configService from '../../services/configService';
import { queryClient } from '../../lib/queryClient';

export default function OfflineBanner() {
  const [connection, setConnection] = useState(getConnectionState);
  useEffect(() => subscribeConnection(setConnection), []);
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setDeviceOffline(offline);
      onlineManager.setOnline(!offline);
    });
    const offline = () => { setDeviceOffline(true); onlineManager.setOnline(false); };
    const online = () => { setDeviceOffline(false); onlineManager.setOnline(true); };
    if (Platform.OS === 'web') {
      window.addEventListener('offline', offline);
      window.addEventListener('online', online);
      if (navigator.onLine === false) offline();
    }
    return () => {
      unsubscribe();
      if (Platform.OS === 'web') { window.removeEventListener('offline', offline); window.removeEventListener('online', online); }
    };
  }, []);
  useEffect(() => {
    if (!connection.degraded || connection.offline) return;
    let stopped = false, running = false;
    const probe = async () => {
      if (running) return;
      running = true;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      try {
        const response = await fetch(`${configService.getBaseURLSync()}/health`, {signal:controller.signal, cache:'no-store'});
        if (!stopped && response.ok) {
          reportNetworkSuccess();
          // Refetch saved screens after real connectivity returns; never replay writes.
          queryClient.invalidateQueries();
        }
      } catch {} finally { clearTimeout(timer); running = false; }
    };
    probe();
    const timer = setInterval(probe, 15000);
    return () => { stopped = true; clearInterval(timer); };
  }, [connection.degraded, connection.offline]);
  if (!connection.offline && !connection.degraded) return null;
  return <View pointerEvents="none" style={styles.container} accessibilityRole="alert"><SafeAreaView edges={['top']}><Text style={styles.text}>{connection.offline ? 'You’re offline. Saved pages are available.' : 'Connection interrupted. Showing saved information.'} We’ll reconnect automatically.</Text></SafeAreaView></View>;
}
const styles = StyleSheet.create({
  container: {position:'absolute', top:0, left:0, right:0, zIndex:9999, backgroundColor:'#010135', paddingHorizontal:20, paddingVertical:12},
  text: {color:'#FFFFFF', fontSize:13, lineHeight:19, textAlign:'center'},
});
