/**
 * Demo Terms Configuration
 * This file contains demo terms content that can be easily replaced with actual terms
 * Each term can be updated independently without modifying the component code
 */

export const DEMO_TERMS = {
  termsOfService: {
    title: "Terms of Service",
    lastUpdated: "March 25, 2026",
    sections: [
      {
        title: "1. Acceptance of Terms",
        content: "By creating a listing on Lunest, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service."
      },
      {
        title: "2. Listing Requirements",
        content: "You must ensure that all information provided in your listing is accurate, complete, and not misleading. You are responsible for maintaining the accuracy of your listing information."
      },
      {
        title: "3. Prohibited Content",
        content: "Listings that contain illegal activities, discriminatory content, or violate local laws are strictly prohibited. We reserve the right to remove any listing that violates these guidelines."
      },
      {
        title: "4. Payment Processing",
        content: "All payments processed through Lunest are subject to our payment terms. Processing fees may apply and will be clearly disclosed before confirmation."
      },
      {
        title: "5. User Responsibilities",
        content: "You are responsible for maintaining the security of your account, responding to booking inquiries in a timely manner, and providing a safe and clean environment for guests."
      }
    ]
  },

  listingAgreement: {
    title: "Listing Agreement",
    lastUpdated: "March 25, 2026",
    sections: [
      {
        title: "1. Property Representation",
        content: "You confirm that you have the legal right to list the property and that all property descriptions, photos, and amenities are accurate and truthful."
      },
      {
        title: "2. Availability Management",
        content: "You agree to keep your calendar up-to-date and honor all confirmed bookings. Cancellations must follow our cancellation policy."
      },
      {
        title: "3. Pricing Transparency",
        content: "All prices displayed must include all mandatory fees and taxes. Hidden charges are not permitted. Additional services must be clearly priced."
      },
      {
        title: "4. Guest Communication",
        content: "You agree to respond to guest inquiries within 24 hours and provide clear, helpful information about your property and local area."
      },
      {
        title: "5. Property Standards",
        content: "Your property must meet basic safety and cleanliness standards. You agree to maintain the property in good condition and address any issues promptly."
      }
    ]
  },

  cancellationPolicy: {
    title: "Cancellation Policy",
    lastUpdated: "March 25, 2026",
    sections: [
      {
        title: "1. Guest Cancellations",
        content: "Guests may cancel bookings according to the following timeline:\n• More than 7 days before check-in: Full refund\n• 3-7 days before check-in: 50% refund\n• Less than 3 days before check-in: No refund"
      },
      {
        title: "2. Host Cancellations",
        content: "Host cancellations are strongly discouraged. If you must cancel:\n• More than 7 days before check-in: No penalty\n• 3-7 days before check-in: 50% penalty\n• Less than 3 days before check-in: 100% penalty"
      },
      {
        title: "3. Extenuating Circumstances",
        content: "In cases of extenuating circumstances (natural disasters, government restrictions, etc.), we may offer exceptions to the standard cancellation policy."
      },
      {
        title: "4. Refund Processing",
        content: "Refunds are typically processed within 5-7 business days to the original payment method. Processing times may vary based on financial institutions."
      },
      {
        title: "5. Dispute Resolution",
        content: "Any disputes regarding cancellations will be reviewed by our support team and resolved based on the specific circumstances of each case."
      }
    ]
  }
};

/**
 * Terms configuration helper functions
 */
export const getTermById = (termId) => {
  return DEMO_TERMS[termId];
};

export const getAllTerms = () => {
  return Object.keys(DEMO_TERMS).map(key => ({
    id: key,
    ...DEMO_TERMS[key]
  }));
};
