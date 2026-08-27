const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  getOpenSlots: () => request('/slots'),
  bookSlot: (slotId, name, note) =>
    request('/bookings', { method: 'POST', body: JSON.stringify({ slotId, name, note }) }),
  askAgent: (message, name) =>
    request('/agent', { method: 'POST', body: JSON.stringify({ message, name }) }),
};