#!/usr/bin/env node

import { Command } from "commander";
import { runAudit } from "./runner";
import { loadConfig } from "./config";

const program = new Command();

program
  .name("stackprobe")
  .description("Audit your project before it becomes a problem")
  .version("0.1.0");

program
  .command("audit")
  .description("Run all checks on the current project")
  .option("--json", "Output results as JSON (useful for CI)")
  .option("--fix", "Attempt to auto-fix issues where possible (coming soon)")
  .option(
    "--only <checks>",
    "Run only specific checks (comma-separated: deps,env,license,engine,circular)",
  )
  .action(async (options) => {
    const config = await loadConfig();

    // Merge CLI --only flag into config
    if (options.only) {
      config.only = options.only.split(",").map((s: string) => s.trim());
    }

    await runAudit({
      json: options.json ?? false,
      fix: options.fix ?? false,
      config,
    });
  });

program.parse(process.argv);
