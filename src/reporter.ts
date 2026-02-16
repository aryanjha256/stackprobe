import type { CheckResult } from "./runner";

// ANSI color helpers — no external dependency needed
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

const STATUS_ICON: Record<CheckResult["status"], string> = {
  pass: `${c.green}✅${c.reset}`,
  warn: `${c.yellow}⚠ ${c.reset}`,
  fail: `${c.red}✗ ${c.reset}`,
  skip: `${c.dim}— ${c.reset}`,
};

const STATUS_LABEL: Record<CheckResult["status"], string> = {
  pass: `${c.green}PASS${c.reset}`,
  warn: `${c.yellow}WARN${c.reset}`,
  fail: `${c.red}FAIL${c.reset}`,
  skip: `${c.dim}SKIP${c.reset}`,
};

const LEVEL_PREFIX: Record<string, string> = {
  info: `${c.cyan}  →${c.reset}`,
  warn: `${c.yellow}  ⚠${c.reset}`,
  error: `${c.red}  ✗${c.reset}`,
};

function padRight(str: string, length: number): string {
  // Strip ANSI codes for length calculation
  const plain = str.replace(/\x1b\[[0-9;]*m/g, "");
  return str + " ".repeat(Math.max(0, length - plain.length));
}

export function reporter(results: CheckResult[], totalDuration: number): void {
  const colWidth = 14;

  for (const result of results) {
    const icon = STATUS_ICON[result.status];
    const label = STATUS_LABEL[result.status];
    const name = padRight(
      `${c.bold}${result.checkName}${c.reset}`,
      colWidth + c.bold.length + c.reset.length,
    );
    const duration = result.duration
      ? `${c.dim}(${result.duration}ms)${c.reset}`
      : "";

    console.log(`${icon} ${name} ${label}  ${duration}`);

    // Print messages underneath
    for (const msg of result.messages) {
      const prefix = LEVEL_PREFIX[msg.level] ?? "  ";
      console.log(`${prefix} ${msg.text}`);
    }

    // Blank line between checks for readability
    if (result.messages.length > 0) console.log("");
  }

  // Summary line
  const pass = results.filter((r) => r.status === "pass").length;
  const warn = results.filter((r) => r.status === "warn").length;
  const fail = results.filter((r) => r.status === "fail").length;
  const skip = results.filter((r) => r.status === "skip").length;

  console.log("─".repeat(48));
  console.log(
    `${c.bold}Summary${c.reset}  ` +
      `${c.green}${pass} passed${c.reset}  ` +
      (warn ? `${c.yellow}${warn} warned${c.reset}  ` : "") +
      (fail ? `${c.red}${fail} failed${c.reset}  ` : "") +
      (skip ? `${c.dim}${skip} skipped${c.reset}  ` : "") +
      `${c.dim}in ${totalDuration}ms${c.reset}`,
  );

  if (fail > 0) {
    console.log(
      `\n${c.red}${c.bold}Audit failed.${c.reset} Fix the issues above before shipping.\n`,
    );
  } else if (warn > 0) {
    console.log(
      `\n${c.yellow}Audit passed with warnings.${c.reset} Consider reviewing them.\n`,
    );
  } else {
    console.log(
      `\n${c.green}${c.bold}All checks passed. Ship it! 🚀${c.reset}\n`,
    );
  }
}
