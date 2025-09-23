const express = require("express");
const nodemailer = require("nodemailer");
const router = express.Router();

// Simple email route using nodemailer (requires SMTP configuration)
router.post("/send-invite", async (req, res) => {
  try {
    const { guestEmail, guestName, eventName } = req.body;

    if (!guestEmail) {
      return res.status(400).json({ error: "Guest email is required." });
    }

    // Create a simple email transporter (you'll need to configure SMTP)
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: guestEmail,
      subject: `You're Invited to ${eventName}!`,
      html: `
        <html>
          <body>
            <h2>Hi ${guestName || 'there'},</h2>
            <p>You have been formally invited to the event: <strong>${eventName || 'our upcoming event'}</strong>.</p>
            <p>We're excited and look forward to seeing you there!</p>
            <br/>
            <p>Best regards,</p>
            <p>The Event Planning Team</p>
          </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Invitation sent successfully!" });

  } catch (error) {
    console.error("Failed to send email:", error);
    res.status(500).json({ 
      error: "Failed to send email",
      details: error.message 
    });
  }
});

module.exports = router;
