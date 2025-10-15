const express = require("express");
const nodemailer = require("nodemailer");
const router = express.Router();

// Check if Gmail credentials are configured
if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  // Gmail credentials not configured - will be handled in route
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
    const { guestEmail, guestName, eventName, eventDate, eventTime, plannerName, themeName } = req.body;

    // Validate that all necessary information was received
    if (!guestEmail || !guestName || !eventName) {
      return res.status(400).json({
        error: "Missing required fields: guestEmail, guestName, or eventName",
      });
    }

    // Build optional date/time section
    let dateTimeSection = "";
    if (eventDate || eventTime) {
      const dateLine = eventDate ? `<p><strong>Date:</strong> ${eventDate}</p>` : "";
      const timeLine = eventTime ? `<p><strong>Time:</strong> ${eventTime}</p>` : "";
      dateTimeSection = `${dateLine}${timeLine}<br/>`;
    }

    const inviterLine = plannerName ? `<p><strong>Invited by:</strong> ${plannerName}</p><br/>` : "";
    const themeLine = themeName ? `<p>We’ll be celebrating in style with the theme: <strong>${themeName}</strong>.</p>` : "";

    // Construct the email message
    const mailOptions = {
      from: `"Eventually Perfect" <${process.env.GMAIL_USER}>`, // Display name and sender email
      to: guestEmail, // The recipient's email address
      subject: `🎉 You're Invited to ${eventName}!`, // The subject of the email
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Hi ${guestName},</h2>
            <p>You have been warmly invited to <strong>${eventName}</strong>.</p>
            ${inviterLine}
            ${dateTimeSection}
            ${themeLine}
            <p>We would be delighted to have you join us. Your presence will make the occasion even more special.</p>
            <p>We're excited and look forward to seeing you there!</p>
            <br/>
            <p>Best regards,</p>
            <p><strong>${plannerName || 'The Eventually Perfect Team'}</strong></p>
          </body>
        </html>
      `,
    };

   
    await transporter.sendMail(mailOptions);

    // Send a success response back to the frontend
    res.status(200).json({ message: "Invitation sent successfully!" });
  } catch (error) {
    // If anything goes wrong, send a server error response
    res
      .status(500)
      .json({ error: "Failed to send invitation. Please try again later." });
  }
});

// Make sure to export the router so your main server file can use it
module.exports = router;