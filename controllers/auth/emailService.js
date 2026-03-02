// controllers/auth/emailService.js
const nodemailer = require("nodemailer");

// ============= EMAIL TRANSPORTER SETUP (OPTIMIZED FOR SPEED) =============
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
  } else {
    console.log("✅ Email server ready to send messages");
  }
});

// ============= SEND EMAIL FUNCTION =============
const sendEmail = async (to, subject, html) => {
  console.log("📧 Sending email to:", to, "Subject:", subject);
  try {
    const info = await transporter.sendMail({
      from: `"Trello Clone" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("✅ Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Email send error:", error);
    return false;
  }
};

module.exports = { transporter, sendEmail };
