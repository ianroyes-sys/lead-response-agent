import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, "..");

// Minimal .env loader — no dependency needed. Values already in the
// environment win over the file.
export function loadEnv(file = path.join(ROOT, ".env")) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (process.env[key] !== undefined) continue;
    process.env[key] = raw.replace(/^["']|["']$/g, "");
  }
}

const DEFAULTS = {
  // Which business this agent works for — shown to Claude so drafts sound
  // like they come from a real person at a real company.
  business: {
    name: "Your Business Name",
    vertical: "generic",
    owner_name: "Owner",
    phone: "(555) 555-0100",
    booking_link: "",
    service_area: "your local area",
    tone: "friendly, professional, and prompt",
  },
  // Where new leads come from. `source` can be:
  //   - a local CSV path (columns: name,email,phone,message,service,source, any extra kept)
  //   - a Google Sheets share URL (File > Share > Anyone with link can view)
  source: "data/sample-leads.csv",
  // Where approved-pending drafts go.
  delivery: {
    outbox_dir: "outbox",
    slack_webhook_url: "", // optional: paste an Incoming Webhook URL to get drafts in Slack
  },
  poll_minutes: 5,
};

export function loadConfig() {
  loadEnv();
  const file = path.join(ROOT, "config.json");
  let user = {};
  if (fs.existsSync(file)) {
    user = JSON.parse(fs.readFileSync(file, "utf8"));
  }
  const cfg = {
    ...DEFAULTS,
    ...user,
    business: { ...DEFAULTS.business, ...user.business },
    delivery: { ...DEFAULTS.delivery, ...user.delivery },
  };
  if (process.env.SLACK_WEBHOOK_URL) {
    cfg.delivery.slack_webhook_url = process.env.SLACK_WEBHOOK_URL;
  }
  return cfg;
}
