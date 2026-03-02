const nodemailer = require("nodemailer");

// Create transporter for sending emails
const createTransporter = () => {
  if (!process.env.EMAIL_USER) {
    console.log("⚠️ EMAIL_USER not found. Using fake transporter for testing.");
    return {
      sendMail: async (options) => {
        console.log("📩 [FAKE] sendMail called with options:", {
          to: options.to,
          subject: options.subject,
          text: options.text,
        });
        return true;
      },
    };
  }

  console.log("🔗 Creating real email transporter...");
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Generic email sender function
const sendEmail = async (options) => {
  console.log("=======================================");
  console.log(`📧 Sending email to: ${options.email}`);
  console.log(`📝 Subject: ${options.subject}`);
  console.log(`📄 Message: ${options.message.substring(0, 60)}...`);
  console.log("=======================================");

  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER || "noreply@trello.com",
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || options.message,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${options.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${options.email}:`, error);
    return true; // Testing ke liye true
  }
};

// Email service functions
const emailService = {
  sendVerificationEmail: async (email, otp) => {
    console.log(`🔔 sendVerificationEmail called for ${email}, OTP: ${otp}`);
    return sendEmail({
      email,
      subject: "Email Verification - Trello Clone",
      message: `Your OTP is: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify Your Email Address</h2>
          <p>Use this OTP to verify your email:</p>
          <h1>${otp}</h1>
        </div>
      `,
    });
  },

  sendPasswordResetEmail: async (email, resetUrl) => {
    console.log(
      `🔔 sendPasswordResetEmail called for ${email}, URL: ${resetUrl}`,
    );
    return sendEmail({
      email,
      subject: "Password Reset Request - Trello Clone",
      message: `Reset your password: ${resetUrl}`,
      html: `<p>Click here to reset: <a href="${resetUrl}">${resetUrl}</a></p>`,
    });
  },

  sendWelcomeEmail: async (email, name) => {
    console.log(`🔔 sendWelcomeEmail called for ${email}, Name: ${name}`);
    return sendEmail({
      email,
      subject: "Welcome to Trello Clone!",
      message: `Welcome to Trello Clone, ${name}!`,
      html: `<h2>Welcome, ${name}!</h2><p>Start organizing your tasks.</p>`,
    });
  },

  sendEmail: sendEmail, // Generic sender
};

module.exports = emailService;
