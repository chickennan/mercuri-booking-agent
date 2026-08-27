function formatSlot(slot) {
  const start = new Date(slot.startTime);
  return start.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SlotList({ slots, selectedId, onSelect }) {
  if (slots.length === 0) {
    return <p className="muted">No open slots right now.</p>;
  }

  return (
    <ul className="slot-list">
      {slots.map((slot) => (
        <li key={slot._id}>
          <button
            className={`slot-btn ${selectedId === slot._id ? 'selected' : ''}`}
            onClick={() => onSelect(slot._id)}
          >
            {formatSlot(slot)}
          </button>
        </li>
      ))}
    </ul>
  );
}