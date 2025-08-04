import nodemailer from "nodemailer";

// ✅ Correct method name: createTransport (not createTransporter)
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // false for port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // ✅ Add connection timeout and retry options
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 5000,    // 5 seconds
  socketTimeout: 10000,     // 10 seconds
});

// ✅ Verify transporter configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP Configuration Error:", error);
  } else {
    console.log("✅ SMTP Server is ready to take our messages");
  }
});

/**
 * Send an email using Brevo SMTP
 * @param {Object} param0 
 * @param {string} param0.to - Receiver email
 * @param {string} param0.subject - Subject line
 * @param {string} param0.body - HTML body content
 */
const sendEmail = async ({ to, subject, body }) => {
  // ✅ Validate inputs
  if (!to || !subject || !body) {
    throw new Error("Missing required email parameters: to, subject, or body");
  }
  
  if (!process.env.SENDER_EMAIL || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Missing required environment variables for email configuration");
  }
  
  console.log(`📧 Attempting to send email to: ${to}`);
  console.log(`📋 Subject: ${subject}`);
  
  try {
    const mailOptions = {
      from: `"QuickShow" <${process.env.SENDER_EMAIL}>`,
      to: to,
      subject: subject,
      html: body,
      // ✅ Add text fallback
      text: body.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
    };
    
    console.log("📤 Sending email with options:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    const response = await transporter.sendMail(mailOptions);
    
    console.log("✅ Email sent successfully!");
    console.log("📧 Message ID:", response.messageId);
    console.log("📊 Response:", response.response);
    
    return response;
  } catch (err) {
    console.error("❌ Email sending failed!");
    console.error("Error message:", err.message);
    console.error("Error code:", err.code);
    console.error("Error command:", err.command);
    
    // ✅ Provide more specific error information
    if (err.code === 'EAUTH') {
      console.error("🔐 Authentication failed - check SMTP credentials");
    } else if (err.code === 'ECONNECTION') {
      console.error("🌐 Connection failed - check SMTP server settings");
    } else if (err.code === 'EMESSAGE') {
      console.error("📝 Message format error - check email content");
    }
    
    throw err;
  }
};

export default sendEmail;