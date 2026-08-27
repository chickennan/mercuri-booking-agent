require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const slotsRouter = require('./routes/slots');
const bookingsRouter = require('./routes/bookings');
const agentRouter = require('./routes/agent');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/slots', slotsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/agent', agentRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mercuri-bookings';

async function start() {
  await connectDB(MONGO_URI);
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;