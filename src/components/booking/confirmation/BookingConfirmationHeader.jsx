import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BackArrowIcon from '../../../assets/icons/bookings/arrow-left.svg';
import DownloadIcon from '../../../assets/icons/download.svg';

const BookingConfirmationHeader = ({
  onGoBack,
  onDownload,
  title = "Booking Confirmation",
}) => {
  // Back Arrow Icon Component
  const BackArrowIconComponent = () => {
    return <BackArrowIcon width={24} height={24} />;
  };

  // Download Icon Component
  const DownloadIconComponent = () => {
    return <DownloadIcon width={18} height={18} color="#000" />;
  };

  return (
    <View style={styles.header}>
      {/* Back Button */}
      <Pressable style={styles.backButton} onPress={onGoBack}>
        <BackArrowIconComponent />
      </Pressable>

      {/* Title */}
      <Text style={styles.headerTitle}>{title}</Text>

      {/* Download Button */}
      <Pressable style={styles.downloadButton} onPress={onDownload}>
        <DownloadIconComponent />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    flexShrink: 0,
  },
});

export default BookingConfirmationHeader;
