const express = require('express');
const { getOpenSlots, getAllSlots } = require('../services/bookingService');

const router = express.Router();

// GET /api/slots?all=true  -> all slots (open + booked)
// GET /api/slots           -> only open slots
router.get('/', async (req, res, next) => {
  try {
    const slots = req.query.all === 'true' ? await getAllSlots() : await getOpenSlots();
    res.json(slots);
  } catch (err) {
    next(err);
  }
});

module.exports = router;