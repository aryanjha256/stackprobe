import fs from "fs";
import path from "path";
import type { CheckResult } from "../runner";

function parseMinNodeVersion(enginesField: string): number | null {
  // Handle patterns like: ">=16.0.0", "^18", "14.x", ">=14 <20"
  const match = enginesField.match(/(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function getCurrentNodeMajor(): number {
  return parseInt(process.version.replace("v", "").split(".")[0], 10);
}

export async function checkEngine(): Promise<CheckResult> {
  const pkgPath = path.join(process.cwd(), "package.json");

  if (!fs.existsSync(pkgPath)) {
    return {
      checkName: "engine",
      status: "skip",
      messages: [{ level: "info", text: "No package.json found" }],
    };
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const messages: CheckResult["messages"] = [];
  let status: CheckResult["status"] = "pass";
  const currentMajor = getCurrentNodeMajor();

  // Check if engines.node is specified
  if (!pkg.engines?.node) {
    return {
      checkName: "engine",
      status: "warn",
      messages: [
        {
          level: "warn",
          text: 'No "engines.node" field in package.json',
        },
        {
          level: "info",
          text: `Add "engines": { "node": ">=${currentMajor}.0.0" } so consumers know what Node version is required`,
        },
      ],
    };
  }

  const specifiedMin = parseMinNodeVersion(pkg.engines.node);

  if (specifiedMin === null) {
    messages.push({
      level: "warn",
      text: `Could not parse engines.node value: "${pkg.engines.node}"`,
    });
    status = "warn";
  } else {
    // Check for EOL Node versions (anything below 18 as of 2024)
    const EOL_THRESHOLD = 18;

    if (specifiedMin < EOL_THRESHOLD) {
      status = "warn";
      messages.push({
        level: "warn",
        text: `engines.node specifies >= ${specifiedMin}, but Node ${specifiedMin} is End-of-Life`,
      });
      messages.push({
        level: "info",
        text: `Consider bumping to >= ${EOL_THRESHOLD} (current LTS)`,
      });
    } else {
      messages.push({
        level: "info",
        text: `engines.node = "${pkg.engines.node}" — looks good`,
      });
    }

    // Check if currently running Node satisfies the requirement
    if (currentMajor < specifiedMin) {
      status = "fail";
      messages.push({
        level: "error",
        text: `You are running Node ${currentMajor} but this project requires Node >= ${specifiedMin}`,
      });
    }
  }

  return { checkName: "engine", status, messages };
}
