import { Ionicons } from '@expo/vector-icons';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const DownloadConfirmationModal = ({ 
  visible, 
  onClose, 
  title = "Download Complete", 
  message = "File has been saved successfully.",
  type = "success", // 'success' | 'error' | 'loading'
  onViewFile,
  viewFileLabel = "View File"
}) => {
  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle', color: '#4CAF50' };
      case 'error':
        return { name: 'alert-circle', color: '#F44336' };
      case 'loading':
        return { name: 'cloud-download', color: '#2196F3' }; // Should use ActivityIndicator really, but keeping it simple
      default:
        return { name: 'information-circle', color: '#2196F3' };
    }
  };

  const icon = getIcon();

  return (
    <View style={styles.fullscreenOverlay}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon.name} size={48} color={icon.color} />
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonContainer}>
            {type === 'success' && onViewFile && (
              <TouchableOpacity 
                style={[styles.button, styles.viewButton]} 
                onPress={onViewFile}
              >
                <Text style={styles.viewButtonText}>{viewFileLabel}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.button, styles.closeButton]} 
              onPress={onClose}
            >
              <Text style={[
                styles.buttonText, 
                type === 'success' && onViewFile ? styles.closeButtonTextSecondary : {}
              ]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 3000,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: '#007BFF',
  },
  closeButton: {
    backgroundColor: '#F5F5F5',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButtonTextSecondary: {
    color: '#666666',
  }
});

export default DownloadConfirmationModal;
