const express = require("express");
const { google } = require("googleapis");
const router = express.Router();

function createMail(to, from, subject, message) {
  const emailLines = [
    `Content-Type: text/html; charset="UTF-8"`,
    `MIME-Version: 1.0`,
    `to: ${to}`,
    `from: ${from}`,
    `subject: ${subject}`,
    ``,
    message,
  ];
  const email = emailLines.join("\n");
  return Buffer.from(email).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

router.post("/send-invite", async (req, res) => {
  try {
    // --- FIX APPLIED HERE ---
    // 1. Validate environment variables FIRST, before doing anything else.
    // This is a much more reliable way to catch configuration issues.
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("Google OAuth credentials are not configured in environment variables.");
      // This is a server configuration error, so we return 500 immediately.
      return res.status(500).json({ error: "Email service is not configured correctly on the server." });
    }

    // 2. Destructure the necessary data from the request body
    const { 
        guestEmail, 
        guestName, 
        eventName, 
        googleAccessToken, 
        googleRefreshToken 
    } = req.body;

    // 3. Validate the incoming data
    if (!guestEmail || !googleAccessToken || !googleRefreshToken) {
      return res.status(400).json({ error: "Missing required information to send email." });
    }

    // 4. Set up the Google OAuth2 Client
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET
    );

    // 5. Set the user's credentials
    oauth2Client.setCredentials({
      access_token: googleAccessToken,
      refresh_token: googleRefreshToken,
    });

    // 6. Create an authenticated Gmail API client
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // 7. Construct the email content
    const emailSubject = `You're Invited to ${eventName}!`;
    const emailBody = `
      <html>
        <body>
          <h2>Hi ${guestName || 'there'},</h2>
          <p>You have been formally invited to the event: <strong>${eventName || 'our upcoming event'}</strong>.</p>
          <p>We're excited and look forward to seeing you there!</p>
        </body>
      </html>
    `;
    
    // 8. Create and send the message
    const rawMessage = createMail(guestEmail, "me", emailSubject, emailBody);
    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: rawMessage },
    });

    // 9. Send a success response
    res.status(200).json({ message: "Invitation sent successfully!" });

  } catch (error) {
    console.error("Failed to send email:", error.message);
    
    // The catch block is now simpler because we handled the config error above.
    // It only needs to handle runtime errors like invalid tokens.
    if (error.code === 401 || (error.response && error.response.status === 401)) {
        return res.status(401).json({ error: "Google authentication failed. The token may be invalid or expired." });
    }
    
    res.status(500).json({ 
      error: "An unexpected error occurred while trying to send the email.",
    });
  }
});

module.exports = router;