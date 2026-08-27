import { useState } from 'react';
import SlotList from './SlotList.jsx';
import { api } from '../api.js';

export default function BookingForm({ slots, onBooked }) {
  const [selectedId, setSelectedId] = useState(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message }
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedId || !name.trim()) {
      setStatus({ type: 'error', message: 'Pick a slot and enter your name.' });
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      await api.bookSlot(selectedId, name.trim());
      setStatus({ type: 'success', message: 'Booked!' });
      setSelectedId(null);
      setName('');
      onBooked();
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Book manually</h2>
      <SlotList slots={slots} selectedId={selectedId} onSelect={setSelectedId} />
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" disabled={submitting}>
        {submitting ? 'Booking…' : 'Book slot'}
      </button>
      {status && <p className={status.type === 'error' ? 'error' : 'success'}>{status.message}</p>}
    </form>
  );
}