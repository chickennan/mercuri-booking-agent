# Mercuri Bookings App

**Author:** Luke Ferris
**Submission for:** Mercuri Software Engineering Intern — Take-Home Project

A small full-stack bookings app with two ways to book a slot: a manual UI, and
an AI agent that takes a natural-language request and books an open slot on
the user's behalf.

## Stack

MERN — MongoDB (Atlas), Express, React (Vite), Node — plus
[OpenRouter](https://openrouter.ai) for the LLM call.

## Setup

### Prerequisites
- Node.js 18+
- A MongoDB connection string (MongoDB Atlas free tier, or a local instance)
- A free [OpenRouter](https://openrouter.ai) API key

### 1. Backend

```bash
cd server
npm install
```

Create a `.env` file in `server/` with:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openrouter/free
```

`OPENROUTER_MODEL=openrouter/free` uses OpenRouter's own auto-router, which
picks a currently-available free model for you. Free-tier model availability
on OpenRouter rotates fairly often (a couple of models I tried while building
this were retired mid-week), so pointing at the router instead of hardcoding
a specific model name is the more resilient choice — see the design note
below for more on this.

Seed the database with sample slots, then start the server:

```bash
npm run seed
npm run dev
```

The API runs on `http://localhost:5000`.

### 2. Frontend

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` requests to
the backend.

### Running tests

```bash
cd server
npm test
```

Tests use `mongodb-memory-server` (an in-memory MongoDB instance, no real
database needed) and cover the booking logic directly, not the LLM call
itself.

## Project structure

```
server/
  src/
    models/          Slot, Booking (Mongoose schemas)
    services/
      bookingService.js   The one place a slot actually gets booked
      agentService.js     Builds the prompt, validates the model's decision
      openrouter.js        Thin OpenRouter API client
    routes/          slots, bookings, agent — thin HTTP layers over services
    seed.js
    server.js
  tests/
    booking.test.js
client/
  src/
    components/      SlotList, BookingForm, AgentChat
    App.jsx, api.js
```

The backend is split into three layers on purpose. **Models** define what a
slot and a booking are. **Services** hold all the actual logic — critically,
`bookingService.js` is the *only* place in the whole app that changes a
slot's status from open to booked. Both the manual booking route and the AI
agent route call into that same function rather than each having their own
way of writing to the database. **Routes** are deliberately thin — they just
parse the HTTP request, call the right service function, and turn the result
into a response. This split means the booking logic (including the
concurrency-safety) is identical no matter which "front door" — a person
clicking a button or the AI agent — triggered it.

## Design note: the AI booking agent

**How the LLM's response becomes a real booking.** When someone sends a
message like "book me something tomorrow afternoon," the backend first
fetches the *current* list of open slots straight from the database and
includes it in the prompt, so the model is reasoning over real, live data
rather than anything it might already "know" or assume. The model is
instructed to reply with a small JSON object — not a sentence — containing
an `action` (`"book"`, `"clarify"`, or `"no_match"`), an optional `slotId`,
and a short `message`. That structured shape matters: if the model just
replied in plain English, the code would have no reliable way to extract
which exact slot it meant. With JSON, the code can read `slotId` directly.

**How it's kept from hallucinating a slot that doesn't exist.** This is a
two-layer check, and the second layer is the one that actually matters. The
system prompt tells the model to only ever use an ID that appears verbatim
in the list it was given — that's the first layer, and it's a soft
guarantee, since a model can still ignore instructions. The second layer is
in the code itself: before booking anything, the app re-checks the model's
returned `slotId` against the same list of open slots it fetched moments
earlier. If the ID isn't in that list — whether because the model invented
one, or because the slot was genuinely valid a second ago but got booked by
someone else in the meantime — the app returns a clear error instead of
creating a booking. Only after that check passes does the code call the
same `bookSlot()` function the manual UI uses, which does an atomic
database update (`findOneAndUpdate` with a filter that only matches
currently-open slots) so two requests racing for the same slot can't both
succeed.

**What I'd change for real production traffic:**
- Use OpenRouter's structured tool-calling instead of asking for freeform
  JSON in the prompt — it's more robust against a model not complying with
  the format exactly.
- Add idempotency keys to agent requests, so a retried or duplicated
  message (e.g. from a flaky SMS webhook) can't result in two bookings.
- Add a fallback chain of models rather than relying on a single one, and
  handle the case where OpenRouter itself is down or rate-limited more
  gracefully than a raw error.
- Log every agent decision (the input, the slot chosen, the raw model
  output) for auditing and to build a way to catch regressions if the
  prompt or model changes later.
- Briefly "hold" a slot the moment the agent decides to book it, rather
  than relying purely on the atomic update at write time, so a slow LLM
  response can't lose a race it should have won.

## Assumptions and trade-offs

- No authentication — a single shared list of slots and bookings, per the
  brief.
- Slots are fixed 1-hour blocks (9am/11am/1pm/3pm) for the next 5 days,
  created via a seed script rather than an admin UI.
- The agent handles a single request → single response; no persistent
  multi-turn conversation.
- `OPENROUTER_MODEL=openrouter/free` is used instead of a specific free
  model name, since OpenRouter's free-tier lineup changes often enough that
  a hardcoded model risked breaking between when I built this and when it's
  reviewed — I ran into exactly this while testing (a model that was free a
  few weeks ago now requires a paid tier).
