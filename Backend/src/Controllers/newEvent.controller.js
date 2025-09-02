const { db } = require("../Config/firebase.js"); // your Firestore connection
// EDIT: Removed client-side imports that were causing the crash
// const { doc, collection, addDoc } = require("firebase/firestore");

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
      return res.status(400).json({
        error:
          "Missing required fields: name, date, and planner_id are required.",
      });
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

    // --- THIS IS THE FIX ---
    // Use the correct Firebase Admin SDK syntax to add a doc to a subcollection
    const docRef = await db
      .collection("planners")
      .doc(planner_id)
      .collection("events")
      .add(newEvent);
    // --- END OF FIX ---

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      id: docRef.id,
      event: newEvent,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

module.exports = { createEvent };

