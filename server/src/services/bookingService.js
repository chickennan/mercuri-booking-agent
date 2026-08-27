const mongoose = require('mongoose');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');

class BookingError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // 'NOT_FOUND' | 'ALREADY_BOOKED' | 'INVALID_ID'
  }
}

async function getOpenSlots() {
  return Slot.find({ status: 'open' }).sort({ startTime: 1 });
}

async function getAllSlots() {
  return Slot.find({}).sort({ startTime: 1 });
}

/**
 * Books a single slot atomically.
 *
 * This is the ONLY place that mutates slot availability. Both the manual
 * UI flow and the AI agent flow call through here, so the race-condition
 * guarantee applies identically to both paths.
 *
 * The atomicity comes from findOneAndUpdate's filter+update being a single
 * operation at the database level: if two requests race for the same slot,
 * only one findOneAndUpdate will match `status: 'open'` — once the winner's
 * write lands, the loser's filter no longer matches, so it returns null
 * instead of creating a second booking.
 */
async function bookSlot({ slotId, name, note = '', source = 'manual', originalRequest = null }) {
  if (!mongoose.isValidObjectId(slotId)) {
    throw new BookingError('INVALID_ID', `"${slotId}" is not a valid slot id.`);
  }

  const slot = await Slot.findOneAndUpdate(
    { _id: slotId, status: 'open' },
    { $set: { status: 'booked' } },
    { new: true }
  );

  if (!slot) {
    const existing = await Slot.findById(slotId);
    if (!existing) {
      throw new BookingError('NOT_FOUND', `Slot ${slotId} does not exist.`);
    }
    throw new BookingError('ALREADY_BOOKED', 'That slot was just booked by someone else.');
  }

  try {
    const booking = await Booking.create({
      slot: slot._id,
      name,
      note,
      source,
      originalRequest,
    });
    slot.bookingId = booking._id;
    await slot.save();
    return { slot, booking };
  } catch (err) {
    // Roll the slot back to 'open' if creating the Booking record fails,
    // so it isn't stranded in a booked-but-unbooked-by-anyone state.
    await Slot.findByIdAndUpdate(slotId, { $set: { status: 'open' }, $unset: { bookingId: 1 } });
    throw err;
  }
}

module.exports = { getOpenSlots, getAllSlots, bookSlot, BookingError };