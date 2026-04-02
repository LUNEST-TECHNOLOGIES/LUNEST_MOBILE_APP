import React, { useState } from 'react';
import { Text, StyleSheet, View, Pressable, Image } from 'react-native';
import FeedbackModal from './FeedbackModal';

const GuestRatingCard = ({ guestName = 'Guest', onLeaveReview = () => {} }) => {
  const [rating, setRating] = useState(5.0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Using a simple star emoji approach since icon files may not render properly
  const renderStar = (index) => {
    const isFilled = index < rating;
    return (
      <Text style={[styles.starEmoji, isFilled ? styles.filledStar : styles.emptyStar]}>
        ★
      </Text>
    );
  };

  const handleLeaveReview = () => {
    setShowFeedbackModal(true);
  };

  const handleSubmitFeedback = (feedbackData) => {
    console.log('Feedback submitted:', {
      rating,
      ...feedbackData,
    });
    onLeaveReview({
      rating,
      ...feedbackData,
    });
    setShowFeedbackModal(false);
    // Reset rating for next time
    setRating(5.0);
  };

  return (
    <View style={styles.parent}>
      <View style={styles.view}>
        {/* Title */}
        <View style={[styles.component62, styles.componentFlexBox]}>
          <Text style={[styles.rateTheGuest, styles.buttonTypo]}>Rate the Guest</Text>
        </View>

        {/* Main Content */}
        <View style={[styles.frameParent, styles.parentFrameFlexBox]}>
          {/* Question */}
          <View style={[styles.howWasYourExperienceHostinWrapper, styles.componentFlexBox]}>
            <Text style={[styles.howWasYour, styles.buttonTypo]}>
              How was your experience hosting {guestName}?
            </Text>
          </View>

          {/* Star Rating */}
          <View style={[styles.component119, styles.componentFlexBox]}>
            <View style={styles.component119Inner}>
              <View style={[styles.frameWrapper, styles.parentFrameFlexBox]}>
                <View style={styles.frameContainer}>
                  <View style={[styles.starParent, styles.parentFrameFlexBox]}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable
                        key={star}
                        style={styles.star}
                        onPress={() => setRating(star)}
                      >
                        {renderStar(star - 1)}
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Leave Review Button */}
          <Pressable
            style={[styles.buttonStyle3, styles.parentFrameFlexBox]}
            onPress={handleLeaveReview}
          >
            <Text style={[styles.button, styles.buttonTypo]}>Leave a Review</Text>
          </Pressable>
        </View>
      </View>

      {/* Feedback Modal */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleSubmitFeedback}
        guestName={guestName}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  parent: {
    width: '100%',
    paddingHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#fff',
  },
  componentFlexBox: {
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  buttonTypo: {
    textAlign: 'left',
    
    fontWeight: '500',
    fontSize: 14,
  },
  parentFrameFlexBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  view: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 16,
    gap: 20,
    overflow: 'hidden',
    shadowColor: '#efefef',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 9,
    elevation: 5,
  },
  component62: {
    height: 20,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
  },
  rateTheGuest: {
    color: '#000',
  },
  frameParent: {
    gap: 16,
    justifyContent: 'center',
    alignSelf: 'stretch',
    flexDirection: 'column',
  },
  howWasYourExperienceHostinWrapper: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  howWasYour: {
    color: '#525252',
    flex: 1,
  },
  component119: {
    width: '100%',
    flexDirection: 'row',
  },
  component119Inner: {
    justifyContent: 'center',
    width: '100%',
  },
  frameWrapper: {
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  frameContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  starParent: {
    gap: 12,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  star: {
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starEmoji: {
    fontSize: 32,
    lineHeight: 40,
  },
  filledStar: {
    color: '#FFD700',
  },
  emptyStar: {
    color: '#E0E0E0',
  },
  buttonStyle3: {
    borderRadius: 25,
    borderStyle: 'solid',
    borderColor: '#6371f1',
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },
  button: {
    color: '#6371f1',
  },
});

export default GuestRatingCard;
