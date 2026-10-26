import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { csvToObjects } from "./csv.js";
import { ROOT } from "./config.js";

// Turns a Google Sheets share URL into its CSV export URL.
// Works with any sheet shared as "Anyone with the link can view" — no OAuth,
// no service account, nothing for the business owner to install.
function sheetsCsvUrl(url) {
  const m = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) throw new Error(`Not a Google Sheets URL: ${url}`);
  const gid = url.match(/[#&?]gid=(\d+)/)?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
}

// A stable ID per lead so we never draft twice for the same person+message.
export function leadId(lead) {
  const key = [lead.email, lead.phone, lead.name, lead.message]
    .map((v) => (v ?? "").toLowerCase().trim())
    .join("|");
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export async function fetchLeads(source) {
  let text;
  if (/^https?:\/\//.test(source)) {
    const url = source.includes("docs.google.com/spreadsheets")
      ? sheetsCsvUrl(source)
      : source;
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      throw new Error(
        `Could not fetch leads from ${url} (HTTP ${res.status}). ` +
          `If this is a Google Sheet, make sure it's shared as "Anyone with the link can view".`
      );
    }
    text = await res.text();
  } else {
    const file = path.isAbsolute(source) ? source : path.join(ROOT, source);
    if (!fs.existsSync(file)) throw new Error(`Lead file not found: ${file}`);
    text = fs.readFileSync(file, "utf8");
  }

  const leads = csvToObjects(text).filter((l) => l.name || l.email || l.phone);
  for (const lead of leads) lead._id = leadId(lead);
  return leads;
}
