const express = require("express");
const nodemailer = require("nodemailer");
const router = express.Router();

// 1. Configure Nodemailer Transporter
// This transporter object uses your Gmail credentials to send emails.
// It's configured once and can be reused for all email sending.

// Check if Gmail credentials are configured
console.log("=== ENVIRONMENT VARIABLES DEBUG ===");
console.log("All env vars starting with GMAIL:", Object.keys(process.env).filter(key => key.startsWith('GMAIL')));
console.log("GMAIL_USER:", process.env.GMAIL_USER);
console.log("GMAIL_APP_PASSWORD:", process.env.GMAIL_APP_PASSWORD ? "SET (length: " + process.env.GMAIL_APP_PASSWORD.length + ")" : "NOT SET");
console.log("=== END DEBUG ===");

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.error("Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // This MUST be the 16-digit App Password
  },
});

// 2. Create the API endpoint for sending invitations
router.post("/send-invite", async (req, res) => {
  try {
    // Check if Gmail credentials are configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return res.status(500).json({
        error: "Email service not configured. Please contact administrator.",
      });
    }

    // Destructure the required information from the request body sent by the frontend
    const { guestEmail, guestName, eventName } = req.body;

    // Validate that all necessary information was received
    if (!guestEmail || !guestName || !eventName) {
      return res.status(400).json({
        error: "Missing required fields: guestEmail, guestName, or eventName",
      });
    }

    // Construct the email message
    const mailOptions = {
      from: `"Eventually Perfect" <${process.env.GMAIL_USER}>`, // Display name and sender email
      to: guestEmail, // The recipient's email address
      subject: `🎉 You're Invited to ${eventName}!`, // The subject of the email
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Hi ${guestName},</h2>
            <p>You have been formally invited to the event: <strong>${eventName}</strong>.</p>
            <p>We're excited and look forward to seeing you there!</p>
            <br/>
            <p>Best regards,</p>
            <p><strong>The Eventually Perfect Team</strong></p>
          </body>
        </html>
      `,
    };

    // Use the transporter to send the email
    console.log("Attempting to send email to:", guestEmail);
    console.log("Gmail user configured:", process.env.GMAIL_USER ? "Yes" : "No");
    console.log("Gmail app password configured:", process.env.GMAIL_APP_PASSWORD ? "Yes" : "No");
    console.log("Gmail user value:", process.env.GMAIL_USER);
    console.log("Gmail app password length:", process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.length : "Not set");
    console.log("Gmail app password first 4 chars:", process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.substring(0, 4) : "Not set");
    
    await transporter.sendMail(mailOptions);

    // Send a success response back to the frontend
    res.status(200).json({ message: "Invitation sent successfully!" });
  } catch (error) {
    // If anything goes wrong, log the error and send a server error response
    console.error("Error sending email:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      response: error.response,
      command: error.command
    });
    res
      .status(500)
      .json({ error: "Failed to send invitation. Please check server logs." });
  }
});

// Make sure to export the router so your main server file can use it
module.exports = router;