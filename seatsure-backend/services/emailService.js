const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendBookingConfirmation = async (userEmail, seatNumber, bookingId) => {
  try {
    const mailOptions = {
      from: `"SeatSure Reservations" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Booking Confirmed! - Seat ${seatNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #22c55e;">Your Seat Reservation is Confirmed!</h2>
          <p>Thank you for booking with SeatSure.</p>
          <hr />
          <p><strong>Seat Number:</strong> ${seatNumber}</p>
          <p><strong>Booking Reference ID:</strong> ${bookingId}</p>
          <p><strong>Status:</strong> Paid & Confirmed</p>
          <hr />
          <p style="font-size: 12px; color: #777;">Please present this email at the venue entrance.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Confirmation email sent to ${userEmail}`);
  } catch (error) {
    console.error('[Email Service Error]:', error.message);
  }
};

module.exports = { sendBookingConfirmation };