const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Slot = require('../src/models/Slot');
const Booking = require('../src/models/Booking');
const { bookSlot, getOpenSlots, BookingError } = require('../src/services/bookingService');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await Slot.deleteMany({});
  await Booking.deleteMany({});
});

function makeSlot(overrides = {}) {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return Slot.create({ startTime: start, endTime: end, status: 'open', ...overrides });
}

describe('bookSlot', () => {
  test('books an open slot successfully', async () => {
    const slot = await makeSlot();

    const { slot: updated, booking } = await bookSlot({ slotId: slot._id, name: 'Ada' });

    expect(updated.status).toBe('booked');
    expect(booking.name).toBe('Ada');
    expect(booking.slot.toString()).toBe(slot._id.toString());

    const remainingOpen = await getOpenSlots();
    expect(remainingOpen).toHaveLength(0);
  });

  test('rejects double-booking the same slot', async () => {
    const slot = await makeSlot();

    await bookSlot({ slotId: slot._id, name: 'Ada' });

    await expect(bookSlot({ slotId: slot._id, name: 'Grace' })).rejects.toThrow(BookingError);

    const bookings = await Booking.find({ slot: slot._id });
    expect(bookings).toHaveLength(1);
    expect(bookings[0].name).toBe('Ada');
  });

  test('handles two requests racing for the same slot — only one wins', async () => {
    const slot = await makeSlot();

    const results = await Promise.allSettled([
      bookSlot({ slotId: slot._id, name: 'Ada' }),
      bookSlot({ slotId: slot._id, name: 'Grace' }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const bookings = await Booking.find({ slot: slot._id });
    expect(bookings).toHaveLength(1);
  });

  test('throws NOT_FOUND for a slot that does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await expect(bookSlot({ slotId: fakeId, name: 'Ada' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  test('getOpenSlots excludes booked slots and is sorted soonest-first', async () => {
    const base = new Date();
    base.setDate(base.getDate() + 1);
    base.setHours(9, 0, 0, 0);

    const sooner = await Slot.create({
      startTime: new Date(base),
      endTime: new Date(base.getTime() + 3600000),
      status: 'open',
    });

    const bookedTime = new Date(base);
    bookedTime.setHours(11, 0, 0, 0);
    const booked = await Slot.create({
      startTime: bookedTime,
      endTime: new Date(bookedTime.getTime() + 3600000),
      status: 'open',
    });
    await bookSlot({ slotId: booked._id, name: 'Ada' });

    const laterTime = new Date(base);
    laterTime.setDate(laterTime.getDate() + 2);
    const later = await Slot.create({
      startTime: laterTime,
      endTime: new Date(laterTime.getTime() + 3600000),
      status: 'open',
    });

    const open = await getOpenSlots();
    expect(open.map((s) => s._id.toString())).toEqual([sooner._id.toString(), later._id.toString()]);
  });
});