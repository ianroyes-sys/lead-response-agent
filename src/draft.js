import Anthropic from "@anthropic-ai/sdk";
import { systemPrompt, leadToUserMessage, DRAFT_SCHEMA } from "./prompts.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

export async function draftReply(lead, business, { mock = false } = {}) {
  if (mock) return mockDraft(lead, business);

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: systemPrompt(business),
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: {
      format: { type: "json_schema", schema: DRAFT_SCHEMA },
    },
    messages: [{ role: "user", content: leadToUserMessage(lead) }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(
      `Model declined to draft for lead ${lead._id} (${lead.name || lead.email}). Review this lead manually.`
    );
  }

  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error(`Empty response for lead ${lead._id}`);
  return JSON.parse(text);
}

// Deterministic offline drafts so the pipeline (sources → drafting → delivery
// → state) can be tested end-to-end without an API key. Live drafts from
// Claude are far more specific — this is plumbing-test quality only.
function mockDraft(lead, business) {
  const first = (lead.name || "there").split(/\s+/)[0];
  const service = lead.service || "your project";
  return {
    reply_subject: `Re: ${service} — ${business.name}`,
    reply_body: `Hi ${first},\n\nJust saw your message about ${service} — happy to help. ${
      lead.message ? `You mentioned: "${lead.message.slice(0, 80)}..." — ` : ""
    }I'd love to get you a quick answer. Easiest next step is a short call: ${
      business.phone
    }${business.booking_link ? `, or grab a time here: ${business.booking_link}` : ""}.\n\n${business.owner_name}\n${business.name}`,
    followup_1: `Hi ${first}, just making sure my note yesterday didn't get buried. Still happy to help with ${service} whenever you're ready. — ${business.owner_name}`,
    followup_2: `Hi ${first}, last check-in from me — no pressure at all. If the timing isn't right, no worries; we're here when you need us. — ${business.owner_name}`,
    lead_quality: lead.message ? "warm" : "cold",
    notes: "[MOCK DRAFT — set ANTHROPIC_API_KEY in .env for real drafts] Verify service details before sending.",
  };
}
