import { useEffect, useState, useCallback } from 'react';
import BookingForm from './components/BookingForm.jsx';
import AgentChat from './components/AgentChat.jsx';
import { api } from './api.js';

export default function App() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshSlots = useCallback(async () => {
    try {
      const data = await api.getOpenSlots();
      setSlots(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);

  return (
    <div className="app">
      <header>
        <h1>Mercuri Bookings</h1>
        <p className="muted">Book a slot manually, or describe what you want and let the agent handle it.</p>
      </header>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Loading slots…</p>
      ) : (
        <div className="grid">
          <BookingForm slots={slots} onBooked={refreshSlots} />
          <AgentChat onBooked={refreshSlots} />
        </div>
      )}
    </div>
  );
}