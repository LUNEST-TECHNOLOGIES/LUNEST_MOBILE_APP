/**
 * Rental Agreement Generator
 * Generates HTML for rental agreement PDF document.
 * Includes property + booking details, host rules, and LUNEST standard terms.
 * Used on both host and guest sides.
 */

import { differenceInDays } from "date-fns";

/**
 * Generate rental agreement HTML
 * @param {Object} params
 * @param {Object} params.booking - Booking data
 * @param {Object} params.listing - Listing/property data
 * @param {Object} params.host - Host user data
 * @param {Object} params.guest - Guest user data
 * @returns {string} HTML string for PDF generation
 */
export const generateRentalAgreementHTML = ({
  booking = {},
  listing = {},
  host = {},
  guest = {},
}) => {
  // 1. Format Dates & Basic Info
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const fmtDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : formatDateWithDay(d);
  };

  const formatDateWithDay = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const checkInDate = fmtDate(booking.checkIn);
  const checkOutDate = fmtDate(booking.checkOut);

  // Duration calculation
  let durationText = "N/A";
  if (booking.checkIn && booking.checkOut) {
      try {
          const start = new Date(booking.checkIn);
          const end = new Date(booking.checkOut);
          const nights = differenceInDays(end, start);
          durationText = `${nights} Night${nights !== 1 ? 's' : ''}`;
      } catch (e) {
          durationText = "Duration Undetermined";
      }
  }

  // 2. Extract Financials
  const breakdown = booking.pricingBreakdown || {};
  
  // Amounts
  const rentFee = breakdown.rentFee || booking.totalAmount?.price || 0;
  // Note: In some parts of app, serviceCharge is host's fee, in others it might be platform. 
  // Based on strict user text: "LUNEST Guest Service Charge" vs "Host Service Fee"
  // We'll use what we have.
  const serviceCharge = breakdown.serviceCharge || 0; // Usually set by host in this app context? Or platform? 
  // In `BookingSummary` we saw serviceCharge is set by host.
  const securityDeposit = breakdown.securityDeposit || 0;
  const guestTotal = breakdown.guestTotal || (rentFee + serviceCharge + securityDeposit);
  
  // App fee / Guest Service Charge calculation (approx 5% if not stored)
  // If breakdown has guestFee, use it.
  const guestServiceCharge = breakdown.guestFee || breakdown.appCharge || Math.round((rentFee + serviceCharge + securityDeposit) * 0.05);

  const formatCurrency = (amount) => `₦${(amount || 0).toLocaleString()}`;

  // 3. Parties Info
  const hostName = host.fullName || `${host.firstName || ""} ${host.lastName || ""}`.trim() || "Host Name Not Provided";
  const hostPhone = host.phoneNumber || host.phone || "N/A";
  const hostEmail = host.emailAddress || host.email || "N/A";
  const hostAddress = host.address || "Registered Address on File";

  const guestName = guest.fullName || `${guest.firstName || ""} ${guest.lastName || ""}`.trim() || "Guest Name Not Provided";
  const guestPhone = guest.phoneNumber || guest.phone || "N/A";
  const guestEmail = guest.emailAddress || guest.email || "N/A";
  const guestAddress = guest.address || "Registered Address on File";
  const guestIdType = guest.idType || "Government ID";
  const guestIdRef = guest.idNumber || "Verified KYC on File";

  // 4. Property Info
  const propertyTitle = listing.title || listing.propertyName || booking.propertyName || "Property Title";
  const propertyAddress = listing.address || listing.location?.fullAddress || listing.fullAddress || "Address on File";
  const propertyType = listing.propertyType || "Residential";
  const maxOccupancy = listing.maxGuests || listing.guests?.adults + listing.guests?.children || "As per listing";

  // 5. Booking Info
  const bookingRef = booking.referenceCode || `LNS-${(booking._id || "").slice(-8).toUpperCase()}`;
  const bookingType = booking.type || "Short-Term"; // Daily/Weekly/Monthly

  // 6. House Rules
  const houseRules = listing.houseRules || {};
  const additionalRules = listing.additionalRules || "";
  const houseRulesList = [];
  if (houseRules.noSmoking) houseRulesList.push("No smoking allowed on the premises");
  if (houseRules.noPets) houseRulesList.push("No pets allowed");
  if (houseRules.noParties) houseRulesList.push("No parties or events allowed");
  if (houseRules.quietHours) houseRulesList.push("Quiet hours must be observed (10 PM – 8 AM)");
  if (houseRules.noUnregisteredGuests) houseRulesList.push("No unregistered guests allowed");
  if (additionalRules) houseRulesList.push(additionalRules);

  const dynamicHostRules = houseRulesList.length > 0 
      ? `<ul style="padding-left: 20px;">${houseRulesList.map(r => `<li>${r}</li>`).join("")}</ul>`
      : "No specific additional rules provided. Standard LUNEST community standards apply.";

  // 7. Signatures / Timestamps
  const timestamp = new Date().toISOString();

  // HTML Template
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.5; color: #333; padding: 40px; }
    h1 { font-size: 18px; text-transform: uppercase; text-align: center; color: #000; margin-bottom: 5px; letter-spacing: 1px; }
    p.subtitle { text-align: center; font-style: italic; color: #666; margin-bottom: 20px; font-size: 10px; }
    
    .meta-box { border: 1px solid #ddd; padding: 10px; margin-bottom: 20px; background: #f9f9f9; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .meta-label { font-weight: bold; width: 120px; }
    
    h2 { font-size: 13px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; }
    h3 { font-size: 11px; font-weight: bold; margin-top: 10px; margin-bottom: 4px; text-transform: uppercase; color: #444; }
    
    .field-row { margin-bottom: 4px; }
    .field-label { font-weight: bold; color: #555; }
    
    ul, ol { margin-top: 4px; margin-bottom: 10px; }
    li { margin-bottom: 2px; }
    
    .financial-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .financial-table td { border-bottom: 1px solid #eee; padding: 6px 0; }
    .financial-table tr:last-child td { border-bottom: 2px solid #000; font-weight: bold; }
    .amount-col { text-align: right; }
    
    .signature-section { margin-top: 40px; background: #fdfdfd; border: 1px solid #eee; padding: 15px; page-break-inside: avoid; }
    .sig-block { margin-bottom: 15px; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
    .sig-block:last-child { border-bottom: none; }
    
    .footer { text-align: center; font-size: 9px; color: #aaa; margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>

  <h1>Property Rental Agreement</h1>
  <p class="subtitle">(Digitally Generated Per Booking)</p>
  
  <div class="meta-box">
    <div class="meta-row"><span class="meta-label">Agreement Date:</span> <span>${today}</span></div>
    <div class="meta-row"><span class="meta-label">Booking ID:</span> <span>${bookingRef}</span></div>
    <div class="meta-row"><span class="meta-label">Listing ID:</span> <span>${booking.listing?._id || "N/A"}</span></div>
  </div>

  <h2>1. PARTIES</h2>

  <h3>1.1 Host / Landlord</h3>
  <div class="field-row"><span class="field-label">Full Name:</span> ${hostName}</div>
  <div class="field-row"><span class="field-label">Address:</span> ${hostAddress}</div>
  <div class="field-row"><span class="field-label">Telephone:</span> ${hostPhone}</div>
  <div class="field-row"><span class="field-label">Email:</span> ${hostEmail}</div>
  <p style="font-size: 10px; color: #666;">(Hereinafter referred to as “Host” or “Landlord”)</p>

  <h3>1.2 Guest / Tenant</h3>
  <div class="field-row"><span class="field-label">Full Name:</span> ${guestName}</div>
  <div class="field-row"><span class="field-label">Residential Address:</span> ${guestAddress}</div>
  <div class="field-row"><span class="field-label">Telephone:</span> ${guestPhone}</div>
  <div class="field-row"><span class="field-label">Email:</span> ${guestEmail}</div>
  <div class="field-row"><span class="field-label">Government ID:</span> ${guestIdType} – ${guestIdRef}</div>
  <p style="font-size: 10px; color: #666;">(Hereinafter referred to as “Guest” or “Tenant”)</p>

  <h3>1.3 Platform Operator</h3>
  <p>LUNEST, a property technology platform facilitating rental bookings within the Federal Republic of Nigeria.</p>
  <p style="font-size: 10px; color: #666;">(LUNEST acts solely as an intermediary technology service provider.)</p>

  <h2>2. PROPERTY DESCRIPTION</h2>
  <div class="field-row"><span class="field-label">Property Name/Title:</span> ${propertyTitle}</div>
  <div class="field-row"><span class="field-label">Full Address:</span> ${propertyAddress}</div>
  <div class="field-row"><span class="field-label">Property Type:</span> ${propertyType}</div>
  <div class="field-row"><span class="field-label">Maximum Occupancy:</span> ${maxOccupancy}</div>
  <p>The Host warrants that they possess lawful authority to lease the Property.</p>

  <h2>3. TERM OF TENANCY</h2>
  <div class="field-row"><span class="field-label">Booking Type:</span> ${bookingType}</div>
  <div class="field-row"><span class="field-label">Commencement Date:</span> ${checkInDate}</div>
  <div class="field-row"><span class="field-label">Termination Date:</span> ${checkOutDate}</div>
  <div class="field-row"><span class="field-label">Total Duration:</span> ${durationText}</div>
  
  <p>This Agreement automatically terminates at 11:59 PM on the Termination Date unless renewed via the LUNEST platform.</p>
  <p>Nothing in this Agreement shall create a statutory periodic tenancy beyond the agreed term unless expressly renewed in writing through LUNEST.</p>

  <h2>4. RENT AND PAYMENT</h2>
  
  <h3>4.1 Financial Breakdown</h3>
  <table class="financial-table">
    <tr><td>Base Rental Rate/Fee</td><td class="amount-col">${formatCurrency(rentFee)}</td></tr>
    <tr><td>Cleaning Fee (if applicable)</td><td class="amount-col">${formatCurrency(0)}</td></tr>
    <tr><td>Utility Fee (if applicable)</td><td class="amount-col">${formatCurrency(0)}</td></tr>
    <tr><td>Security Deposit (if applicable)</td><td class="amount-col">${formatCurrency(securityDeposit)}</td></tr>
    <tr><td>LUNEST Guest Service Charge</td><td class="amount-col">${formatCurrency(guestServiceCharge)}</td></tr>
    <tr><td><strong>Total Amount Paid by Guest</strong></td><td class="amount-col"><strong>${formatCurrency(guestTotal)}</strong></td></tr>
  </table>
  <p style="font-size: 10px;">* Host service fees are deducted automatically by LUNEST from payouts.</p>

  <h3>4.2 Payment Terms</h3>
  <ol>
    <li>All payments must be processed exclusively through LUNEST.</li>
    <li>Direct off-platform payments void platform protections.</li>
    <li>Host/Landlord payouts shall be processed according to LUNEST payout schedule.</li>
  </ol>

  <h2>5. SECURITY DEPOSIT / CAUTION FEE</h2>
  <div class="field-row"><span class="field-label">Deposit Required:</span> ${securityDeposit > 0 ? "Yes" : "No"}</div>
  <div class="field-row"><span class="field-label">Deposit Amount:</span> ${formatCurrency(securityDeposit)}</div>
  <div class="field-row"><span class="field-label">Deposit Type:</span> Platform-Held</div>
  <p>The Security Deposit is refundable subject to compliance with this Agreement.</p>

  <h3>5.2 Permitted Deductions</h3>
  <p>The deposit may be applied toward: Damage beyond normal wear and tear, Missing or destroyed property, Excessive cleaning, Violation of house rules, Unpaid rent or utilities.</p>

  <h3>5.3 Platform-Held Deposit</h3>
  <p>Where the deposit is held by LUNEST:</p>
  <ul>
    <li>Host/Landlord must submit any damage claim within 48 hours after checkout.</li>
    <li>Claims must include verifiable evidence.</li>
    <li>If no claim is filed within the claim window, the deposit shall be automatically refunded.</li>
    <li>LUNEST may mediate disputes and determine reasonable deductions.</li>
  </ul>

  <h2>6. USE OF PROPERTY</h2>
  <p>The Guest agrees:</p>
  <ul>
    <li>To use the Property solely for lawful residential purposes.</li>
    <li>Not to sublet or assign this Agreement.</li>
    <li>Not to exceed permitted occupancy.</li>
    <li>Not to conduct illegal, immoral, or disruptive activities.</li>
    <li>To comply with all Host Rules attached to this Agreement.</li>
  </ul>

  <h2>7. HOST RULES</h2>
  <p>The Guest agrees to comply with all rules specified in the listing and incorporated herein:</p>
  ${dynamicHostRules}
  <p>Violation may result in termination without refund.</p>

  <h2>8. UTILITIES AND MAINTENANCE</h2>
  <p><strong>Short-Term (Nightly):</strong> Utilities included unless otherwise stated.</p>
  <p><strong>Monthly/Yearly:</strong> Utility responsibility per specific listing agreement.</p>
  <p>Host/Landlord shall maintain structural integrity and habitability. Guest shall promptly report defects via the LUNEST platform.</p>

  <h2>9. CANCELLATION AND TERMINATION</h2>
  <div class="field-row"><span class="field-label">Cancellation Policy Type:</span> ${listing.cancellationPolicy || "Standard Platform Policy"}</div>
  <p>Refund eligibility shall be governed by the selected policy.</p>

  <h2>10. LIABILITY AND INDEMNITY</h2>
  <p>LUNEST is not the property owner and is not liable for personal injury or property loss. LUNEST provides mediation services only.</p>

  <h2>11. DEFAULT</h2>
  <p>A party is in default if they fail to comply with material terms, engage in fraud, or breach platform policies.</p>

  <h2>12. GOVERNING LAW AND DISPUTE RESOLUTION</h2>
  <p><strong>12.1 Governing Law:</strong> This Agreement shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria, specifically having regard to the <strong>Tenancy Law of Lagos State (2011)</strong> (where applicable) and substantially similar Tenancy Laws of other States within the Federation where the Property is located.</p>
  
  <p><strong>12.2 Dispute Resolution:</strong> In the event of any dispute arising out of or in connection with this Agreement, the Parties shall first seek to resolve the matter amicably through the LUNEST Dispute Resolution Center. If unresolved, the matter shall be referred to Arbitration in accordance with the <strong>Arbitration and Conciliation Act (Cap A18, Laws of the Federation of Nigeria 2004)</strong>.</p>
  
  <p><strong>12.3 Recovery of Premises:</strong> The recovery of possession of the premises shall be strictly in accordance with the due process of law provided under the applicable Recovery of Premises Law.</p>

  <h2>13. NOTICES</h2>
  <p>Any notice required to be given under this Agreement shall be deemed sufficiently given if sent through the LUNEST platform messaging system or to the verified email addresses of the Parties.</p>

  <h2>14. ELECTRONIC SIGNATURE AND LEGAL VALIDITY</h2>
  <p>This Agreement is digitally generated upon confirmed booking, time-stamped, and authenticated via secure electronic verification. Electronic acceptance by clicking “Confirm Booking” or “Accept Terms” constitutes a legally binding signature under Section 84 of the <strong>Evidence Act 2011</strong> regarding admissibility of computer-generated evidence.</p>

  <div class="signature-section">
    <div class="sig-block">
      <h3>14.1 Host Digital Signature</h3>
      <div class="field-row"><span class="field-label">Name:</span> ${hostName}</div>
      <div class="field-row"><span class="field-label">Status:</span> ${booking.status === "CONFIRMED" || booking.status === "COMPLETED" ? "Confirmed & Signed" : "Pending Signature"}</div>
      <div class="field-row"><span class="field-label">Date:</span> ${today}</div>
    </div>

    <div class="sig-block">
      <h3>14.2 Guest Digital Signature</h3>
      <div class="field-row"><span class="field-label">Name:</span> ${guestName}</div>
      <div class="field-row"><span class="field-label">Status:</span> ${booking.status === "CONFIRMED" || booking.status === "COMPLETED" ? "Confirmed & Signed" : "Pending Signature"}</div>
      <div class="field-row"><span class="field-label">Date:</span> ${today}</div>
    </div>

    <div class="sig-block">
      <h3>14.3 Platform Authentication</h3>
      <div class="field-row"><span class="field-label">Transaction Reference:</span> ${bookingRef}</div>
      <div class="field-row"><span class="field-label">Booking Status:</span> ${booking.status || "PENDING"}</div>
      <div class="field-row"><span class="field-label">Created At:</span> ${new Date(booking.createdAt || Date.now()).toLocaleString()}</div>
      <div class="field-row"><span class="field-label">Validation ID:</span> ${booking._id || "GEN-" + Date.now()}</div>
    </div>
  </div>

  <div class="footer">
    <p>OFFICIAL LUNEST RENTAL AGREEMENT • Generated: ${timestamp} • Page 1 of 1</p>
    <p>Note: This document is legally binding under the Laws of the Federation of Nigeria.</p>
  </div>

</body>
</html>
  `.trim();
};

export default { generateRentalAgreementHTML };
