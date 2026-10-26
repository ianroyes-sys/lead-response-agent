import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./config.js";
import { objectsToCsv } from "./csv.js";

const QUALITY_EMOJI = { hot: "🔥", warm: "🙂", cold: "🧊", spam: "🚫" };

function outboxDir(cfg) {
  const dir = path.isAbsolute(cfg.delivery.outbox_dir)
    ? cfg.delivery.outbox_dir
    : path.join(ROOT, cfg.delivery.outbox_dir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// One human-readable markdown file per lead: the owner opens it, reads the
// draft, copies it into their email/SMS, done.
export function writeDraftFile(cfg, lead, draft) {
  const dir = outboxDir(cfg);
  const safeName = (lead.name || lead.email || lead._id).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const file = path.join(dir, `${new Date().toISOString().slice(0, 10)}-${safeName}-${lead._id.slice(0, 6)}.md`);
  const body = `# ${QUALITY_EMOJI[draft.lead_quality] ?? ""} ${lead.name || "Unknown"} — ${draft.lead_quality.toUpperCase()}

**Contact:** ${lead.email || "—"} ${lead.phone ? `/ ${lead.phone}` : ""}
**Asked about:** ${lead.service || "—"}  |  **Source:** ${lead.source || "—"}
**Their message:** ${lead.message || "(none)"}

> **Agent notes:** ${draft.notes}

---

## ✉️ Reply (send now)

**Subject:** ${draft.reply_subject}

${draft.reply_body}

---

## ⏰ Follow-up 1 (tomorrow, if no reply)

${draft.followup_1}

---

## ⏰ Follow-up 2 (day 3, if no reply)

${draft.followup_2}
`;
  fs.writeFileSync(file, body);
  return file;
}

// Rolling CSV of everything drafted — doubles as the client-facing log
// ("here's every lead we answered this month").
export function appendLog(cfg, lead, draft) {
  const file = path.join(outboxDir(cfg), "drafts-log.csv");
  const row = {
    drafted_at: new Date().toISOString(),
    lead_id: lead._id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    service: lead.service,
    quality: draft.lead_quality,
    subject: draft.reply_subject,
    reply: draft.reply_body,
    followup_1: draft.followup_1,
    followup_2: draft.followup_2,
    notes: draft.notes,
  };
  const headers = Object.keys(row);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, objectsToCsv([row], headers));
  } else {
    fs.appendFileSync(file, objectsToCsv([row], headers).split("\n").slice(1).join("\n"));
  }
  return file;
}

export async function notifySlack(cfg, lead, draft) {
  const url = cfg.delivery.slack_webhook_url;
  if (!url) return false;
  const text = [
    `${QUALITY_EMOJI[draft.lead_quality] ?? ""} *New lead: ${lead.name || lead.email || "Unknown"}* (${draft.lead_quality})`,
    `*Asked about:* ${lead.service || "—"} · *Contact:* ${lead.email || lead.phone || "—"}`,
    `*Notes:* ${draft.notes}`,
    "",
    `*Draft reply — approve & send:*`,
    `>>> ${draft.reply_body}`,
  ].join("\n");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    console.error(`  ⚠ Slack notify failed (HTTP ${res.status}) — draft still saved to outbox.`);
    return false;
  }
  return true;
}
