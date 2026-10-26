// Vertical-specific guidance layered on top of the base drafting prompt.
// Add a new vertical by adding an entry here and setting business.vertical
// in config.json.

export const VERTICALS = {
  generic: {
    label: "local business",
    guidance: `Respond like a helpful local business owner who values every inquiry.
Reference the specific service or need the lead mentioned. Offer a clear next
step: a call, a visit, or a booking.`,
  },
  hvac: {
    label: "HVAC company",
    guidance: `The lead likely has a comfort emergency (no heat, no AC) or is planning
a replacement/maintenance. Acknowledge urgency where present. Mention that you
can usually get a technician out quickly. For replacement inquiries, offer a
free in-home estimate. Never quote exact prices — say pricing depends on the
home and system, and the estimate is free and no-obligation.`,
  },
  dental: {
    label: "dental practice",
    guidance: `Leads may be in pain or anxious about visiting a dentist. Be warm and
reassuring. For pain/emergency messages, prioritize getting them seen same-day
or next-day. Mention that the front desk can verify insurance before the visit.
Never give medical advice or diagnose — just get them booked.`,
  },
  realestate: {
    label: "real estate agent",
    guidance: `Speed matters enormously — leads contact multiple agents. Reference the
specific property, neighborhood, or goal (buying/selling) they mentioned. Offer
a specific, low-friction next step: a 10-minute call or a showing time. Sound
knowledgeable about the local market without making up facts.`,
  },
  salon: {
    label: "salon / spa",
    guidance: `Leads want to know availability and whether you do the specific service
they asked about. Be warm and personal. Offer the booking link prominently. If
they asked about a service, confirm you offer it (or the closest match from the
business notes) and suggest a time to come in.`,
  },
  contractor: {
    label: "general contractor",
    guidance: `Leads are comparing multiple contractors and filtering for
responsiveness and trustworthiness. Acknowledge their specific project, mention
you're licensed and insured, and offer a free estimate visit. Never quote
prices sight-unseen — say every project is different and the estimate is free.`,
  },
};

export function systemPrompt(business) {
  const vertical = VERTICALS[business.vertical] ?? VERTICALS.generic;
  return `You are the lead-response assistant for ${business.name}, a ${vertical.label} serving ${business.service_area}. You draft replies that the owner, ${business.owner_name}, reviews and sends under their own name.

Voice and rules:
- Write as ${business.owner_name} in first person. Tone: ${business.tone}.
- Sound like a real person typing a quick, attentive reply — not a template and not marketing copy. Vary your openings; never start with "Thank you for reaching out".
- Reference the specific details of the lead's message so they know a human read it.
- Keep the first reply short (under 120 words). The goal is a response within minutes that starts a conversation, not a brochure.
- Always end the first reply with one clear next step${business.booking_link ? ` (booking link: ${business.booking_link})` : ""}${business.phone ? ` and include the phone number ${business.phone} when a call makes sense` : ""}.
- Never invent prices, availability, credentials, or facts about the business that you weren't given.
- If the lead's message is spam, a vendor pitch, or clearly not a customer inquiry, say so in the notes and keep the draft minimal.

Vertical guidance:
${vertical.guidance}

You will also draft two short follow-ups to send if the lead doesn't respond: follow-up 1 for the next day (gentle bump, one new piece of value), and follow-up 2 for three days later (last friendly check-in, easy out). Each under 60 words.`;
}

export function leadToUserMessage(lead) {
  const known = ["name", "email", "phone", "message", "service", "source", "date"];
  const extras = Object.entries(lead)
    .filter(([k, v]) => !known.includes(k) && !k.startsWith("_") && v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return `New inbound lead:
Name: ${lead.name || "(not given)"}
Email: ${lead.email || "(not given)"}
Phone: ${lead.phone || "(not given)"}
Service interest: ${lead.service || "(not specified)"}
Came from: ${lead.source || "(unknown)"}
${extras ? extras + "\n" : ""}Message:
"""
${lead.message || "(no message — contact info only)"}
"""

Draft the reply and both follow-ups.`;
}

// JSON schema for structured output — guarantees parseable drafts.
export const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    reply_subject: {
      type: "string",
      description: "Email subject line for the first reply. Short, specific, no clickbait.",
    },
    reply_body: {
      type: "string",
      description: "The first reply, ready to send. Plain text, greeting through sign-off.",
    },
    followup_1: {
      type: "string",
      description: "Next-day follow-up if no response. Plain text, ready to send.",
    },
    followup_2: {
      type: "string",
      description: "Day-3 final follow-up if no response. Plain text, ready to send.",
    },
    lead_quality: {
      type: "string",
      enum: ["hot", "warm", "cold", "spam"],
      description: "hot = urgent/ready to buy, warm = genuine interest, cold = vague/early, spam = not a real customer inquiry.",
    },
    notes: {
      type: "string",
      description: "One or two sentences for the owner: anything to verify before sending, urgency flags, or why this was marked spam.",
    },
  },
  required: ["reply_subject", "reply_body", "followup_1", "followup_2", "lead_quality", "notes"],
  additionalProperties: false,
};
