// Controllers/eventController.js
const { getFirestore } = require("firebase-admin/firestore");

const exportEvents = async (req, res) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection("events").get();

    const events = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("Export events error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack,
    });
  }
};

module.exports = { exportEvents };
