import React from 'react';
import { StyleSheet, Text, Image, ImageBackground, View } from 'react-native';

const imageFrame = require('../../../assets/icons/bookings/image_frame.svg');

const BookingHeroImageReserved = () => {
  return (
    <ImageBackground 
      source={imageFrame}
      style={styles.frameParent} 
      resizeMode="cover"
    >
      <View style={styles.frameGroup}>
        <Image 
          style={styles.frameChild} 
          resizeMode="cover" 
        />
        <View style={styles.yourStayIsReservedParent}>
          <Text style={[styles.yourStayIs, styles.yourStayIsTypo]}>
            Your Stay Is Reserved!
          </Text>
          <Text style={[styles.weveReservedThis, styles.yourStayIsTypo]}>
            We've reserved this stay for you. Complete your booking within 1 hour to keep it.
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  yourStayIsTypo: {
    textAlign: 'center',
    color: '#fff',
    
    fontWeight: '500',
    alignSelf: 'stretch',
  },
  frameParent: {
    width: '100%',
    height: 169,
    overflow: 'hidden',
    borderRadius: 6,
  },
  frameGroup: {
    position: 'absolute',
    top: 29,
    left: 66,
    width: 267,
    gap: 10,
    alignItems: 'center',
  },
  frameChild: {
    width: 60,
    height: 60,
    borderRadius: 40,
  },
  yourStayIsReservedParent: {
    gap: 7,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  yourStayIs: {
    fontSize: 18,
  },
  weveReservedThis: {
    fontSize: 12,
  },
});

export default BookingHeroImageReserved;
