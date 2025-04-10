// utils/email.js
const nodemailer = require('nodemailer');

// --- Brevo Transporter Configuration (Your provided code) ---
// Use environment variables for credentials (SMTP_USER, SMTP_PASSWORD from .env)
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com', // Brevo SMTP host
  port: 587, // Brevo SMTP port
  auth: {
    user: process.env.SMTP_USER, // Your Brevo SMTP login (often email)
    pass: process.env.SMTP_PASSWORD, // Your Brevo SMTP Key
  },
  // Note: Brevo typically uses port 587 with STARTTLS (implicit)
});
// --- End of Your Transporter Code ---


/**
 * Sends an email using the pre-configured Brevo transporter.
 * Supports HTML content with placeholder replacement.
 * @param {object} options - Email options.
 * @param {string} options.email - Recipient email address.
 * @param {string} options.subject - Email subject line.
 * @param {string} [options.text] - Optional plain text email body (fallback).
 * @param {string} options.htmlContent - HTML email body content (template string).
 * @param {object} [options.replacements] - Optional key-value pairs for replacing placeholders (e.g., {{key}}) in htmlContent.
 */
const sendEmail = async (options) => {
  // Check if required transporter config environment variables were loaded
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error("[Email] ERROR: Missing required Brevo email configuration environment variables (SMTP_USER, SMTP_PASSWORD).");
    throw new Error('Email service (Brevo) is not configured. Please set SMTP_USER and SMTP_PASSWORD environment variables.');
  }

  // 1. Prepare HTML content with replacements
  let finalHtml = options.htmlContent;
  if (options.replacements) {
    Object.keys(options.replacements).forEach(key => {
      // Simple regex replace for placeholders like {{key}}
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      finalHtml = finalHtml.replace(regex, options.replacements[key]);
    });
  }

  // 2. Define the email options
  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Your App Name" <${process.env.SMTP_USER}>`, // Use configured sender or default
    to: options.email,
    subject: options.subject,
    text: options.text || 'Please view this email in an HTML-compatible client.', // Provide fallback text
    html: finalHtml, // Use the processed HTML content
  };

  // 3. Actually send the email using the pre-configured transporter
  try {
    // Use the 'transporter' defined above
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Message sent via Brevo: %s to ${options.email}`, info.messageId);
  } catch (error) {
    console.error(`[Email] Error sending email via Brevo to ${options.email}:`, error);
    throw new Error(`Email could not be sent via Brevo. Reason: ${error.message}`);
  }
};

// Export the sendEmail function, not the transporter directly
// The transporter is used internally by sendEmail
module.exports = sendEmail;
