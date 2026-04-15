import React, { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Dimensions, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DownloadConfirmationModal = ({ 
  visible, 
  onClose, 
  title = "Download Complete", 
  message = "File has been saved successfully.",
  type = "success", // 'success' | 'error' | 'loading'
  onViewFile,
  viewFileLabel = "View File",
  autoCloseDelay = 2500, // Auto close after 2.5 seconds by default
}) => {
  // ── Auto-Close Logic ──
  useEffect(() => {
    let timer;
    if (visible && type === 'success' && !onViewFile) {
      timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, type, onViewFile]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle', color: '#10B981' };
      case 'error':
        return { name: 'alert-circle', color: '#EF4444' };
      case 'loading':
        return { name: 'cloud-download', color: '#6371F1' };
      default:
        return { name: 'information-circle', color: '#6371F1' };
    }
  };

  const icon = getIcon();
  const isLoading = type === 'loading';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Top Right Close Icon */}
          {!isLoading && (
            <TouchableOpacity 
              style={styles.headerCloseIcon} 
              onPress={onClose}
              hitSlop={15}
            >
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          <View style={[styles.iconContainer, { backgroundColor: icon.color + '15' }]}>
            {isLoading ? (
              <ActivityIndicator size="large" color={icon.color} />
            ) : (
              <Ionicons name={icon.name} size={48} color={icon.color} />
            )}
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonContainer}>
            {!isLoading && (
              <>
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
                    {type === 'error' ? 'Try Again' : 'Close'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            
            {isLoading && (
              <Text style={styles.loadingTip}>Please wait a moment...</Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    position: 'relative', // Add this for absolute positioning of child
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  headerCloseIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
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
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: '#6371F1',
  },
  closeButton: {
    backgroundColor: '#F3F4F6',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButtonTextSecondary: {
    color: '#6B7280',
  },
  loadingTip: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  }
});

export default DownloadConfirmationModal;
