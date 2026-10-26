# Live Demo Script (5 minutes, screen share or in person)

**Prep (2 min before the call):**
1. Edit `config.json` — put THEIR business name, their vertical, their booking link.
2. `node src/index.js reset` to clear state.
3. Have `data/sample-leads.csv` open in one window, terminal in another, outbox folder in a third.

---

## Beat 1 — Set the stakes (30 sec)

> "This is a week of leads for a business like yours — form fills, Google, Yelp, referrals."

Show the CSV. Point at Maria: *"AC died, 95° today, newborn at home. She emailed 4 companies. Whoever answers first gets the job."*

## Beat 2 — Run it (60 sec)

> "Here's the agent. Watch the timestamps."

Run: `npm run demo:live` *(or `npm run demo` if no API key on this machine)*

Narrate while it runs: *"It's reading each lead, figuring out what they need, how urgent it is, and writing a reply in your voice — with your booking link, your phone number."*

## Beat 3 — Show the money (2 min)

Open Maria's outbox file. Read the draft out loud. Point at:
- **It referenced the newborn and the heat** — "no template does that."
- **The quality flag** — "🔥 hot means call this one first."
- **The two follow-ups** — "80% of jobs close after the 2nd–5th touch. Nobody has time to do this manually. It's already written."

Then open the spam one (Mike's Marketing Solutions): *"It even catches the junk so you don't waste time."*

## Beat 4 — The ask (60 sec)

> "Here's the offer: point me at wherever your leads land — a Google Sheet, a forwarding address, your form. For one week this runs on your real leads, free. Every draft goes to your phone via Slack. You approve, you send, you keep the customers. If it doesn't obviously make you money, we stop. Sound fair?"

Silence. Let them answer.

---

**If yes:** get the lead source access on the spot (share the sheet, set up form forwarding). Setup takes you 10 minutes with `onboarding-email.md`.

**If maybe:** "What would you need to see to feel good about trying it for a week?" — then solve exactly that.
