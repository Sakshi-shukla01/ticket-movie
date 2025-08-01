import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  //secure: false, // ❗ Ensure this is false for port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email using Brevo SMTP
 * @param {Object} param0 
 * @param {string} param0.to - Receiver email
 * @param {string} param0.subject - Subject line
 * @param {string} param0.body - HTML body content
 */
const sendEmail = async ({ to, subject, body }) => {
  try {
    const response = await transporter.sendMail({
      from: `"QuickShow" <${process.env.SENDER_EMAIL}>`, // better format
      to,
      subject,
      html: body,
    });

    console.log("✅ Email sent:", response.messageId);
    return response;
  } catch (err) {
    console.error("❌ Email sending failed:", err.message);
    throw err;
  }
};

export default sendEmail;
