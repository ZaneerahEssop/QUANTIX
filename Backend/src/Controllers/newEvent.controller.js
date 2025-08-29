// Backend/src/controllers/eventController.js
const { db } = require("../Config/firebase.js"); // your Firestore connection

const createEvent = async (req, res) => {
  try {
    const {
      event_id,
      name,
      theme,
      planner_id,
      venue,
      vendors_id = [],
      date,
      start_time,
      end_time,
    } = req.body;

    // Create event doc in Firestore
    const newEvent = {
      event_id,
      name,
      theme,
      planner_id,
      venue,
      vendors_id,
      date,
      start_time,
      end_time,
      createdAt: new Date(),
    };

    await db.collection("events").add(newEvent);

    res
      .status(201)
      .json({ message: "Event created successfully", event: newEvent });
  } catch (error) {
    console.error("Error creating event:", error);
    console.error("Error Stack:", error.stack);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

module.exports = { createEvent };
