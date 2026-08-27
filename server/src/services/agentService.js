const { callOpenRouter } = require('./openrouter');
const { getOpenSlots, bookSlot, BookingError } = require('./bookingService');

function formatSlotsForPrompt(slots) {
  if (slots.length === 0) return '(no open slots)';
  return slots
    .map((s) => `- id: ${s._id} | ${s.startTime.toISOString()}`)
    .join('\n');
}

const SYSTEM_PROMPT = `You are a scheduling assistant for a bookings app.
You will be given the CURRENT list of open slots (each with a real database id)
and a user's natural-language request.

Respond with STRICT JSON only, no markdown, no commentary, matching exactly:

{
  "action": "book" | "clarify" | "no_match",
  "slotId": "<one of the ids from the list, only if action is book>",
  "message": "<a short, friendly message to show the user>"
}

Rules:
- You may ONLY use a slotId that appears verbatim in the list. Never invent one.
- Use "book" when a slot clearly satisfies the request, or is the best reasonable
  match for something resolvable (e.g. "earliest slot you have").
- Use "clarify" when the request is genuinely ambiguous between multiple slots.
- Use "no_match" when the list is empty, or nothing satisfies the request.
- Keep "message" to 1-2 sentences.`;

async function parseAgentResponse(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Agent response was not valid JSON: ${raw}`);
  }
  if (!['book', 'clarify', 'no_match'].includes(parsed.action)) {
    throw new Error(`Agent returned an unrecognized action: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

/**
 * Handles a natural-language booking request end to end.
 *
 * Key safety property: the LLM's output is a *proposal*, never ground truth.
 * We re-check the proposed slotId against the real, current open-slots list
 * before acting, then route through the same atomic bookSlot() the manual
 * flow uses — so a hallucinated id or a slot taken in the meantime both
 * fail safely instead of corrupting data.
 */
async function handleAgentRequest({ message, name }) {
  const openSlots = await getOpenSlots();
  const slotList = formatSlotsForPrompt(openSlots);

  const userMessage = `Open slots:\n${slotList}\n\nUser request: "${message}"`;

  const raw = await callOpenRouter({ systemPrompt: SYSTEM_PROMPT, userMessage });
  const decision = await parseAgentResponse(raw);

  if (decision.action !== 'book') {
    return { status: decision.action, message: decision.message };
  }

  const validIds = new Set(openSlots.map((s) => String(s._id)));
  if (!decision.slotId || !validIds.has(String(decision.slotId))) {
    return {
      status: 'error',
      message: "The assistant tried to book a slot that isn't in the current open list. Please try rephrasing.",
    };
  }

  try {
    const { slot, booking } = await bookSlot({
      slotId: decision.slotId,
      name: name || 'Guest',
      source: 'agent',
      originalRequest: message,
    });
    return { status: 'booked', message: decision.message, slot, booking };
  } catch (err) {
    if (err instanceof BookingError) {
      return { status: 'conflict', message: 'That slot was just booked by someone else. Please try again.' };
    }
    throw err;
  }
}

module.exports = { handleAgentRequest, formatSlotsForPrompt, parseAgentResponse, SYSTEM_PROMPT };