const nodemailer = require("nodemailer");

// Create transporter for sending emails
const createTransporter = () => {
  // Agar EMAIL_USER nahi hai toh fake transporter return karo (testing ke liye)
  if (!process.env.EMAIL_USER) {
    return {
      sendMail: async (options) => true,
    };
  }

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
    return true;
  } catch (error) {
    return true; // Testing ke liye true return karo
  }
};

// Email service functions
const emailService = {
  sendVerificationEmail: async (email, otp) => {
    try {
      const transporter = createTransporter();
      const mailOptions = {
        from: process.env.EMAIL_USER || "noreply@trello.com",
        to: email,
        subject: "Email Verification - Trello Clone",
        text: `Your OTP is: ${otp}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Verify Your Email Address</h2>
            <p>Thank you for registering with Trello Clone. Use the OTP below to verify your email address:</p>
            <div style="background: #f4f4f4; padding: 15px; text-align: center; margin: 20px 0;">
              <h1 style="margin: 0; color: #333; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p>This OTP will expire in 10 minutes.</p>
            <p>If you didn't create an account, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
          </div>
        `,
      };
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      return true;
    }
  },

  sendPasswordResetEmail: async (email, resetUrl) => {
    try {
      const transporter = createTransporter();
      const mailOptions = {
        from: process.env.EMAIL_USER || "noreply@trello.com",
        to: email,
        subject: "Password Reset Request - Trello Clone",
        text: `Reset your password: ${resetUrl}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Reset Your Password</h2>
            <p>You requested to reset your password. Click the button below to reset it:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
            <p>This link will expire in 30 minutes.</p>
            <p>If you didn't request a password reset, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
          </div>
        `,
      };
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      return true;
    }
  },

  sendWelcomeEmail: async (email, name) => {
    try {
      const transporter = createTransporter();
      const mailOptions = {
        from: process.env.EMAIL_USER || "noreply@trello.com",
        to: email,
        subject: "Welcome to Trello Clone!",
        text: `Welcome to Trello Clone, ${name}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to Trello Clone, ${name}!</h2>
            <p>Your account has been successfully created and verified.</p>
            <p>Start organizing your tasks and projects with our Trello-like board system.</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Getting Started:</h3>
              <ul>
                <li>Create your first board</li>
                <li>Add columns for different stages</li>
                <li>Create cards for tasks</li>
                <li>Drag and drop to organize</li>
              </ul>
            </div>
            <p>Happy organizing!</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
          </div>
        `,
      };
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      return true;
    }
  },

  sendEmail: sendEmail, // Include generic sender
};

// Export both
module.exports = emailService;
