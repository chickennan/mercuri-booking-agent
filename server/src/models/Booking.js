const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
    name: { type: String, required: true },
    note: { type: String, default: '' },
    source: { type: String, enum: ['manual', 'agent'], default: 'manual' },
    // Stores the raw natural-language request when booked via the agent,
    // useful for debugging/auditing what the LLM was reasoning about.
    originalRequest: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);