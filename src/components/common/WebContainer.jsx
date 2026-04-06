import React from 'react';
import { View, Platform, StyleSheet, Text, useWindowDimensions, TouchableOpacity } from 'react-native';

const WebContainer = ({ children }) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && width > 480;

  if (!isWeb) {
    return <>{children}</>;
  }

  return (
    <View style={styles.webRoot}>
      {/* Background Instructions for Desktop */}
      {isDesktop && (
        <View style={styles.instructionsContainer}>
          <View style={styles.instructionsCard}>
            <Text style={styles.title}>Optimized for Mobile</Text>
            <Text style={styles.message}>
              This application is designed specifically for mobile devices.
              For the best experience, please view it on your phone or resize your browser to a mobile width.
            </Text>
            <TouchableOpacity 
              onPress={() => window.location.reload()} 
              style={styles.button}
            >
              <Text style={styles.buttonText}>Reload App</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footer}>© 2024 LUNEST Technologies</Text>
        </View>
      )}

      {/* Main Mobile Screen */}
      <View style={[
        styles.innerContainer,
        !isDesktop && styles.fullScreen
      ]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  webRoot: {
    flex: 1,
    backgroundColor: '#010135', // Darker background for desktop area
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionsContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    padding: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: '#010135',
  },
  instructionsCard: {
    maxWidth: 400,
    padding: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 24,
    marginBottom: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
  },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
  },
  buttonText: {
    color: '#010135',
    fontWeight: 'bold',
  },
  innerContainer: {
    width: 480,
    height: '92%', // Give it a device-like floating effect
    maxHeight: 1000,
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    zIndex: 10,
    borderWidth: 10,
    borderColor: '#111827',
  },
  fullScreen: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    borderWidth: 0,
  },
});

export default WebContainer;
