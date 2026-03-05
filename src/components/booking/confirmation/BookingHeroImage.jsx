import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DoneVIcon from '../../../assets/icons/bookings/done-v.svg';
import CalendarIcon from '../../../assets/icons/bookings/calendar.svg';
import PendingIcon from '../../../assets/icons/bookings/pending.svg';
import CloseXIcon from '../../../assets/icons/bookings/close-x.svg';

const BookingHeroImage = ({ status = 'confirmed' }) => {
  const getHeroText = () => {
    const normalizedStatus = (status || 'confirmed').toLowerCase().trim();
    switch(normalizedStatus) {
      case 'confirmed':
        return 'You are Booked in Style!';
      case 'reserved':
        return 'Your Stay Is Reserved!';
      case 'pending':
        return 'Your Booking is Pending';
      case 'completed':
        return 'Thank You for Your Stay!';
      case 'cancelled':
        return 'Your Booking is Cancelled';
      default:
        return 'You are Booked in Style!';
    }
  };

  const getSubtext = () => {
    const normalizedStatus = (status || 'confirmed').toLowerCase().trim();
    if (normalizedStatus === 'reserved') {
      return "We've reserved this stay for you. Complete your booking within 1 hour to keep it.";
    }
    return null;
  };

  const getIcon = () => {
    const normalizedStatus = (status || 'confirmed').toLowerCase().trim();
    switch(normalizedStatus) {
      case 'confirmed':
        return <DoneVIcon width={40} height={40} />;
      case 'reserved':
        return <CalendarIcon width={40} height={40} />;
      case 'pending':
        return <PendingIcon width={40} height={40} />;
      case 'completed':
        return <DoneVIcon width={40} height={40} />;
      case 'cancelled':
        return <CloseXIcon width={40} height={40} />;
      default:
        return <DoneVIcon width={40} height={40} />;
    }
  };

  return (
    <View style={styles.youAreBookedInStyleParent}>
      {/* Background Color (since SVG background can't be rendered easily) */}
      
      {/* Text */}
      <View style={styles.textContainer}>
        <Text style={styles.youAreBooked}>
          {getHeroText()}
        </Text>
        {getSubtext() && (
          <Text style={styles.subtext}>
            {getSubtext()}
          </Text>
        )}
      </View>
      
      {/* Icon */}
      <View 
        style={[styles.frameChild, styles.frameChildPosition]} 
      >
        {getIcon()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  youAreBookedInStyleParent: {
    width: '100%',
    height: 169,
    overflow: 'hidden',
    borderRadius: 6,
    backgroundColor: '#6B63B5', // Fallback color
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    alignItems: 'center',
  },
  youAreBooked: {
    fontSize: 18,
    fontWeight: '500',
    
    color: '#fff',
    textAlign: 'center',
  },
  subtext: {
    fontSize: 12,
    fontWeight: '400',
    
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
  },
  frameChildPosition: {
    position: 'absolute',
    left: '50%',
  },
  frameChild: {
    marginLeft: -30,
    top: 31,
    borderRadius: 40,
    width: 60,
    height: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 28,
    fontWeight: '500',
  },
  iconEmoji: {
    fontSize: 32,
    lineHeight: 40,
  },
  iconImage: {
    width: 40,
    height: 40,
  },
});

export default BookingHeroImage;
