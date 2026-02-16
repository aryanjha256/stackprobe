import { checkLicense } from "./checks/license";
import { checkEnv } from "./checks/env";
import { checkDependencies } from "./checks/dependencies";
import { checkEngine } from "./checks/engine";
import { checkCircular } from "./checks/circular";
import { reporter } from "./reporter";
import type { StackProbeConfig } from "./config";

export interface CheckMessage {
  level: "info" | "warn" | "error";
  text: string;
}

export interface CheckResult {
  checkName: string;
  status: "pass" | "warn" | "fail" | "skip";
  messages: CheckMessage[];
  duration?: number; // ms
}

export interface RunOptions {
  json: boolean;
  fix: boolean;
  config: StackProbeConfig;
}

// All available checks — add new ones here as you build them
const ALL_CHECKS: Record<string, () => Promise<CheckResult>> = {
  license: checkLicense,
  env: checkEnv,
  deps: checkDependencies,
  engine: checkEngine,
  circular: checkCircular,
};

export async function runAudit(options: RunOptions): Promise<void> {
  const { json, config } = options;
  const startTime = Date.now();

  if (!json) {
    console.log("\n🔍 \x1b[1mstackprobe\x1b[0m — auditing your project...\n");
  }

  const checksToRun = config.only
    ? Object.entries(ALL_CHECKS).filter(([name]) => config.only!.includes(name))
    : Object.entries(ALL_CHECKS).filter(
        ([name]) => !config.ignore?.includes(name),
      );

  const results: CheckResult[] = [];

  for (const [name, checkFn] of checksToRun) {
    const checkStart = Date.now();
    try {
      const result = await checkFn();
      result.duration = Date.now() - checkStart;
      results.push(result);
    } catch (err) {
      // If a check crashes, report it as a fail — don't crash the whole audit
      results.push({
        checkName: name,
        status: "fail",
        messages: [
          {
            level: "error",
            text: `Check crashed unexpectedly: ${(err as Error).message}`,
          },
        ],
        duration: Date.now() - checkStart,
      });
    }
  }

  const totalDuration = Date.now() - startTime;

  if (json) {
    console.log(JSON.stringify({ results, duration: totalDuration }, null, 2));
  } else {
    reporter(results, totalDuration);
  }

  // Exit with code 1 if any check failed — useful for CI
  const hasFail = results.some((r) => r.status === "fail");
  if (hasFail) process.exit(1);
}
