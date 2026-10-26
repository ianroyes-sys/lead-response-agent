#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { fetchLeads } from "./sources.js";
import { draftReply } from "./draft.js";
import { writeDraftFile, appendLog, notifySlack } from "./deliver.js";
import { loadState, markProcessed, isProcessed, resetState } from "./state.js";

function parseArgs(argv) {
  const args = { command: argv[0] ?? "run", flags: {} };
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === "--mock") args.flags.mock = true;
    else if (argv[i] === "--source") args.flags.source = argv[++i];
    else if (argv[i] === "--force") args.flags.force = true;
  }
  return args;
}

async function processNewLeads(cfg, { mock = false, source, force = false } = {}) {
  const state = loadState();
  const leads = await fetchLeads(source ?? cfg.source);
  const fresh = force ? leads : leads.filter((l) => !isProcessed(state, l));

  if (fresh.length === 0) {
    console.log(`No new leads (${leads.length} total, all already handled).`);
    return 0;
  }

  console.log(`${fresh.length} new lead${fresh.length === 1 ? "" : "s"} — drafting replies${mock ? " (mock mode)" : ""}...\n`);

  let drafted = 0;
  for (const lead of fresh) {
    const label = lead.name || lead.email || lead.phone || lead._id;
    try {
      const draft = await draftReply(lead, cfg.business, { mock });
      const file = writeDraftFile(cfg, lead, draft);
      appendLog(cfg, lead, draft);
      const slacked = await notifySlack(cfg, lead, draft);
      markProcessed(state, lead);
      drafted++;
      console.log(`  ✓ ${label} [${draft.lead_quality}] → ${file}${slacked ? " (+ Slack)" : ""}`);
    } catch (err) {
      console.error(`  ✗ ${label}: ${err.message}`);
    }
  }
  console.log(`\nDone. ${drafted}/${fresh.length} drafts ready for your approval in the outbox.`);
  return drafted;
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  const cfg = loadConfig();

  const needsKey = (command === "run" || command === "watch") && !flags.mock;
  if (needsKey && !process.env.ANTHROPIC_API_KEY) {
    console.error(
      "No ANTHROPIC_API_KEY found. Either:\n" +
        "  1. Copy .env.example to .env and add your key (console.anthropic.com), or\n" +
        "  2. Run with --mock to test the pipeline without an API key.\n"
    );
    process.exit(1);
  }

  switch (command) {
    case "run":
      await processNewLeads(cfg, flags);
      break;

    case "watch": {
      const minutes = cfg.poll_minutes;
      console.log(`Watching ${flags.source ?? cfg.source} every ${minutes} min. Ctrl-C to stop.\n`);
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          await processNewLeads(cfg, flags);
        } catch (err) {
          console.error(`Watch cycle failed: ${err.message}`);
        }
        await new Promise((r) => setTimeout(r, minutes * 60 * 1000));
      }
    }

    case "reset":
      resetState();
      console.log("State cleared — all leads will be treated as new on the next run.");
      break;

    default:
      console.log(`Usage:
  node src/index.js run [--source <csv-or-sheet-url>] [--mock] [--force]
  node src/index.js watch [--source <csv-or-sheet-url>]
  node src/index.js reset

  run    Process new leads once and exit.
  watch  Poll for new leads on an interval (config: poll_minutes).
  reset  Forget which leads were already handled.`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
