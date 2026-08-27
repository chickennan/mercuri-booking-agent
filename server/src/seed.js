require('dotenv').config();
const connectDB = require('./config/db');
const Slot = require('./models/Slot');
const Booking = require('./models/Booking');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mercuri-bookings';

// Generates slots at 9am, 11am, 1pm, 3pm for the next N days.
function buildSlots(days = 5, hours = [9, 11, 13, 15]) {
  const slots = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let d = 1; d <= days; d++) {
    for (const hour of hours) {
      const start = new Date(now);
      start.setDate(start.getDate() + d);
      start.setHours(hour, 0, 0, 0);

      const end = new Date(start);
      end.setHours(start.getHours() + 1);

      slots.push({ startTime: start, endTime: end, status: 'open' });
    }
  }
  return slots;
}

async function seed() {
  await connectDB(MONGO_URI);

  await Booking.deleteMany({});
  await Slot.deleteMany({});

  const slots = buildSlots();
  await Slot.insertMany(slots);

  console.log(`Seeded ${slots.length} open slots across the next 5 days.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});