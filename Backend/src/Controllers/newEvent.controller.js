const { db } = require("../Config/firebase.js"); // your Firestore connection

const createEvent = async (req, res) => {
  try {
    // Destructure the fields your React form is actually sending
    const {
      name,
      date,
      time,
      planner_id, // This is now used to build the correct path
      vendors_id = [],
      documents = [],
    } = req.body;

    // A simple validation to ensure core data is present
    if (!name || !date || !planner_id) {
        return res.status(400).json({ error: "Missing required fields: name, date, and planner_id are required." });
    }

    // Create the event object to save in Firestore
    const newEvent = {
      name,
      date,
      time: time || "",
      planner_id, // It's good practice to still save this inside the document for easy reference
      vendors_id,
      documents,
      createdAt: new Date(),
    };

    // --- EDIT: This line now saves the event to the correct subcollection ---
    const docRef = await db.collection('planners').doc(planner_id).collection('events').add(newEvent);

    res
      .status(201)
      .json({ message: "Event created successfully", id: docRef.id, event: newEvent });
  } catch (error) {
    console.error("Error creating event:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

module.exports = { createEvent };