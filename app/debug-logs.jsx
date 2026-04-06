import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import logService from '../src/services/logService';

/**
 * Debug Logs Screen
 * Hidden screen to view local application logs for troubleshooting.
 * ENHANCED: Now shows session summary and better filtering.
 */
export default function DebugLogsScreen() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, INFO, WARN, ERROR
  const [summary, setSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const [localLogs, sessionSummary] = await Promise.all([
      logService.getLocalLogs(),
      logService.getSessionSummary(),
    ]);
    setLogs(localLogs);
    setSummary(sessionSummary);
    setLoading(false);
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to delete all local logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await logService.clearLocalLogs();
            setLogs([]);
            setSummary(null);
          },
        },
      ]
    );
  };

  const handleShareLogs = async () => {
    if (logs.length === 0) return;
    
    const exportData = await logService.exportLogs();
    const logString = JSON.stringify(exportData, null, 2);

    try {
      await Share.share({
        message: logString.substring(0, 50000), // Limit for sharing
        title: 'Lunest Debug Logs',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share logs');
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ALL') return true;
    return log.level === filter;
  });

  const SessionSummaryCard = () => {
    if (!summary) return null;
    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Session Summary</Text>
          <TouchableOpacity onPress={() => setShowSummary(!showSummary)}>
            <Ionicons name={showSummary ? "chevron-up" : "chevron-down"} size={20} color="#666" />
          </TouchableOpacity>
        </View>
        {showSummary && (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.totalLogs}</Text>
                <Text style={styles.summaryLabel}>Total Logs</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, styles.errorText]}>{summary.errorCount}</Text>
                <Text style={styles.summaryLabel}>Errors</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, styles.warnText]}>{summary.warnCount}</Text>
                <Text style={styles.summaryLabel}>Warnings</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.networkRequestCount}</Text>
                <Text style={styles.summaryLabel}>Network</Text>
              </View>
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceText}>App: {summary.deviceInfo?.appVersion} ({summary.deviceInfo?.buildNumber})</Text>
              <Text style={styles.deviceText}>Platform: {summary.deviceInfo?.platform} {summary.deviceInfo?.platformVersion}</Text>
              <Text style={styles.deviceText}>Session: {new Date(summary.sessionStart).toLocaleString()}</Text>
            </View>
          </>
        )}
      </View>
    );
  };

  const LogItem = ({ log }) => (
    <View style={[styles.logItem, log.level === 'ERROR' && styles.logItemError]}>
      <View style={styles.logHeader}>
        <Text style={[styles.logLevel, log.level === 'ERROR' && styles.logLevelError]}>
          {log.level}
        </Text>
        <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString()}</Text>
      </View>
      <Text style={styles.logMessage}>{log.message}</Text>
      {Object.keys(log.details || {}).length > 0 && (
        <Text style={styles.logDetails}>{JSON.stringify(log.details, null, 2)}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/profile');
            }
          }} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Debug Logs</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShareLogs} style={styles.actionButton}>
            <Ionicons name="share-outline" size={22} color="#007BFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearLogs} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={22} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {['ALL', 'INFO', 'WARN', 'ERROR'].map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Session Summary */}
      <SessionSummaryCard />

      {/* Logs List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007BFF" />
        </View>
      ) : filteredLogs.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="list-outline" size={48} color="#CCC" />
          <Text style={styles.emptyText}>No {filter.toLowerCase()} logs found.</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {filteredLogs.map((log, index) => (
            <LogItem key={index} log={log} />
          ))}
        </ScrollView>
      )}

      {/* Refresh Footer */}
      <TouchableOpacity style={styles.refreshButton} onPress={loadLogs}>
        <Ionicons name="refresh" size={20} color="#FFF" />
        <Text style={styles.refreshButtonText}>Refresh Logs</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  filterBar: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    margin: 12,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007BFF',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  errorText: {
    color: '#FF3B30',
  },
  warnText: {
    color: '#FF9500',
  },
  deviceInfo: {
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 12,
    marginTop: 4,
  },
  deviceText: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  filterTabActive: {
    backgroundColor: '#E7F3FF',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  filterTextActive: {
    color: '#007BFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  logItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: '#EEE',
    borderLeftColor: '#007BFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logItemError: {
    borderLeftColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logLevel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  logLevelError: {
    color: '#FF3B30',
  },
  logTime: {
    fontSize: 10,
    color: '#999',
  },
  logMessage: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  logDetails: {
    fontSize: 11,
    color: '#666',
    backgroundColor: '#F0F0F0',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: '#333',
    margin: 16,
    padding: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshButtonText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 8,
  },
});
