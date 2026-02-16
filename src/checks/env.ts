import fs from "fs";
import path from "path";
import type { CheckResult } from "../runner";

function parseEnvKeys(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, "utf-8");
  const keys: string[] = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      keys.push(trimmed.slice(0, eqIndex).trim());
    }
  }

  return keys;
}

export async function checkEnv(): Promise<CheckResult> {
  const cwd = process.cwd();
  const envPath = path.join(cwd, ".env");
  const envExamplePath = path.join(cwd, ".env.example");

  const envExists = fs.existsSync(envPath);
  const envExampleExists = fs.existsSync(envExamplePath);

  // No env files at all — probably not a project that uses them
  if (!envExists && !envExampleExists) {
    return {
      checkName: "env",
      status: "pass",
      messages: [
        { level: "info", text: "No .env files found — skipping env check" },
      ],
    };
  }

  const messages: CheckResult["messages"] = [];
  let status: CheckResult["status"] = "pass";

  // .env exists but no .env.example — risk of secrets being committed
  if (envExists && !envExampleExists) {
    status = "warn";
    messages.push({
      level: "warn",
      text: ".env found but .env.example is missing",
    });
    messages.push({
      level: "info",
      text: "Create .env.example with keys but no real values so others can onboard",
    });
    return { checkName: "env", status, messages };
  }

  // Both exist — check for drift
  const envKeys = parseEnvKeys(envPath);
  const exampleKeys = parseEnvKeys(envExamplePath);

  // Keys in .env but not in .env.example (forgotten to document)
  const undocumented = envKeys.filter((k) => !exampleKeys.includes(k));

  // Keys in .env.example but not in .env (potentially missing locally)
  const missing = exampleKeys.filter((k) => !envKeys.includes(k));

  if (undocumented.length > 0) {
    status = "warn";
    messages.push({
      level: "warn",
      text: `Keys in .env but missing from .env.example: ${undocumented.join(", ")}`,
    });
  }

  if (missing.length > 0) {
    status = "warn";
    messages.push({
      level: "warn",
      text: `Keys in .env.example but missing from your .env: ${missing.join(", ")}`,
    });
    messages.push({
      level: "info",
      text: "These may be required — check with your team or docs",
    });
  }

  if (messages.length === 0) {
    messages.push({
      level: "info",
      text: ".env and .env.example are in sync",
    });
  }

  return { checkName: "env", status, messages };
}
