const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email server ready to send messages');
  }
});

const sendOTPEmail = async (email, otp) => {
  console.log('📧 Sending email to:', email, 'OTP:', otp); // ← check karo OTP generate ho raha hai

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🔐 Password Reset OTP - Trello Clone',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border: 2px solid #0052CC; border-radius: 10px;">
        <h2 style="color: #0052CC;">🔒 Password Reset OTP</h2>
        <p>Aapka OTP code yeh hai:</p>
        <div style="background: #f0f4ff; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #0052CC; font-size: 40px; letter-spacing: 10px; margin: 0;">${otp}</h1>
        </div>
        <p>⏰ Yeh OTP sirf <strong>2 minutes</strong> ke liye valid hai.</p>
        <p style="color: #999; font-size: 12px;">Agar aapne request nahi ki toh ignore karein.</p>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('✅ Email sent:', info.messageId);
};

module.exports = { sendOTPEmail, transporter };