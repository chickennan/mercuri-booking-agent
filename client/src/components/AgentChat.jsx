import { useState } from 'react';
import { api } from '../api.js';

export default function AgentChat({ onBooked }) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setReply(null);
    try {
      const result = await api.askAgent(message.trim(), name.trim());
      setReply(result);
      if (result.status === 'booked') {
        setMessage('');
        onBooked();
      }
    } catch (err) {
      setReply({ status: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Book with the AI agent</h2>
      <input
        type="text"
        placeholder="Your name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        placeholder='e.g. "Book me something tomorrow afternoon"'
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
      />
      <button type="submit" disabled={submitting}>
        {submitting ? 'Thinking…' : 'Send'}
      </button>
      {reply && (
        <p className={reply.status === 'booked' ? 'success' : reply.status === 'error' ? 'error' : 'muted'}>
          <strong>{reply.status}:</strong> {reply.message}
        </p>
      )}
    </form>
  );
}