const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const db = admin.firestore();

// GET: Fetches all guests for a specific event
exports.getAllGuests = async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.uid;

  try {
    const eventPath = `planners/${userId}/events/${eventId}`;
    const eventRef = db.doc(eventPath);
    const docSnap = await eventRef.get();

    // CORRECTED: Changed docSnap.exists() to the property docSnap.exists
    if (!docSnap.exists) {
      console.warn(`[GuestController] No document found at path: ${eventPath}`);
      return res.status(404).send('Event not found.');
    }
    
    res.status(200).json(docSnap.data().guests || []);

  } catch (error) {
    console.error('--- [GuestController] A FATAL ERROR occurred in getAllGuests ---');
    console.error(error);
    res.status(500).send('Server error while fetching guests.');
  }
};

// PUT: Updates the entire guest list
exports.updateGuestList = async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.uid;
  const newGuestsList = req.body;

  if (!Array.isArray(newGuestsList)) {
    return res.status(400).send('Bad Request: Expected an array of guests.');
  }

  try {
    const eventRef = db.collection('planners').doc(userId).collection('events').doc(eventId);
    await eventRef.update({ guests: newGuestsList });
    res.status(200).json({ message: 'Guest list updated successfully.', guests: newGuestsList });
  } catch (error)    {
    console.error('Error updating guests:', error);
    res.status(500).send('Server error while updating guests.');
  }
};

// POST: Adds a single new guest
exports.addGuest = async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.uid;
  const newGuestData = req.body;

  try {
    const eventRef = db.collection('planners').doc(userId).collection('events').doc(eventId);
    
    const newGuest = {
      id: Date.now().toString(),
      name: newGuestData.name,
      contact: newGuestData.contact,
      dietary: newGuestData.dietary || '',
      isAttending: false,
    };

    await eventRef.update({
      guests: FieldValue.arrayUnion(newGuest)
    });

    res.status(201).json(newGuest);

  } catch (error) {
    console.error('Error adding new guest:', error);
    res.status(500).send('Server error while adding a guest.');
  }
};

