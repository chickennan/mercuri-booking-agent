const mongoose = require('mongoose');

// A Slot represents one bookable time window.
// status is the single source of truth for availability.
// We rely on Mongo's atomic findOneAndUpdate (status: 'open' -> 'booked')
// to prevent two concurrent requests from both booking the same slot.
const slotSchema = new mongoose.Schema(
  {
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['open', 'booked'],
      default: 'open',
      index: true,
    },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Slot', slotSchema);