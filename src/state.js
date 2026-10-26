import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./config.js";

const STATE_FILE = path.join(ROOT, ".state.json");

export function loadState() {
  if (!fs.existsSync(STATE_FILE)) return { processed: {} };
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { processed: {} };
  }
}

export function markProcessed(state, lead) {
  state.processed[lead._id] = {
    at: new Date().toISOString(),
    name: lead.name,
    email: lead.email,
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function isProcessed(state, lead) {
  return Boolean(state.processed[lead._id]);
}

export function resetState() {
  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
}
