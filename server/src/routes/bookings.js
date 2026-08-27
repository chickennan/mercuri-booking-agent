const express = require('express');
const { bookSlot, BookingError } = require('../services/bookingService');

const router = express.Router();

// POST /api/bookings  { slotId, name, note? }
router.post('/', async (req, res, next) => {
  const { slotId, name, note } = req.body;

  if (!slotId || !name) {
    return res.status(400).json({ error: 'slotId and name are required.' });
  }

  try {
    const { slot, booking } = await bookSlot({ slotId, name, note, source: 'manual' });
    res.status(201).json({ slot, booking });
  } catch (err) {
    if (err instanceof BookingError) {
      const statusMap = { NOT_FOUND: 404, ALREADY_BOOKED: 409, INVALID_ID: 400 };
      return res.status(statusMap[err.code] || 400).json({ error: err.message, code: err.code });
    }
    next(err);
  }
});

module.exports = router;