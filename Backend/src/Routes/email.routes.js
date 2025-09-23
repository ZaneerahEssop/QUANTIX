const express = require("express");
const { google } = require("googleapis");
const router = express.Router();

/**
 * Creates a MIME message for the Gmail API.
 * @param {string} to Recipient's email address.
 * @param {string} from Sender's email address ('me' for the authenticated user).
 * @param {string} subject The subject of the email.
 * @param {string} message The HTML body of the email.
 * @returns {string} The base64url encoded email message.
 */
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

  // The email needs to be encoded in base64url format
  return Buffer.from(email).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}


// --- Main Route to Send an Invitation Email ---
router.post("/send-invite", async (req, res) => {
  try {
    // 1. Destructure the necessary data from the request body
    const { 
        guestEmail, 
        guestName, 
        eventName, 
        googleAccessToken, 
        googleRefreshToken 
    } = req.body;

    // 2. Validate the incoming data
    if (!guestEmail || !googleAccessToken || !googleRefreshToken) {
      return res.status(400).json({ error: "Missing required information to send email." });
    }

    // 3. Set up the Google OAuth2 Client with your app's credentials
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    // 4. Set the user's credentials using tokens from the frontend
    oauth2Client.setCredentials({
      access_token: googleAccessToken,
      refresh_token: googleRefreshToken,
    });

    // 5. Create an authenticated Gmail API client
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // 6. Construct the email content
    const emailSubject = `You're Invited to ${eventName}!`;
    const emailBody = `
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
    `;
    
    // 7. Create the raw, encoded message for the API
    const rawMessage = createMail(guestEmail, "me", emailSubject, emailBody);

    // 8. Send the email via the Gmail API
    await gmail.users.messages.send({
      userId: "me", // 'me' refers to the authenticated user whose tokens are being used
      requestBody: {
        raw: rawMessage,
      },
    });

    // 9. Send a success response
    res.status(200).json({ message: "Invitation sent successfully!" });

  } catch (error) {
    console.error("Failed to send email:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    // Handle specific authentication errors
    if (error.code === 401 || (error.response && error.response.status === 401)) {
        return res.status(401).json({ error: "Google authentication failed. The token may be invalid or expired. The user might need to log in again." });
    }
    
    // Handle missing environment variables
    if (error.message.includes("GOOGLE_CLIENT_ID") || error.message.includes("GOOGLE_CLIENT_SECRET")) {
        return res.status(500).json({ error: "Google OAuth configuration is missing. Please check environment variables." });
    }
    
    // Handle other errors
    res.status(500).json({ 
      error: "An unexpected error occurred while trying to send the email.",
      details: error.message 
    });
  }
});


module.exports = router;