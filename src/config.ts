import path from "path";
import fs from "fs";

export interface StackProbeConfig {
  ignore?: string[]; // check names to skip
  only?: string[]; // run ONLY these checks
  failOn?: "warn" | "error"; // default: error only
}

const DEFAULT_CONFIG: StackProbeConfig = {
  ignore: [],
  failOn: "error",
};

export async function loadConfig(): Promise<StackProbeConfig> {
  const configPath = path.resolve(process.cwd(), "stackprobe.config.js");

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const userConfig = require(configPath) as Partial<StackProbeConfig>;
    return { ...DEFAULT_CONFIG, ...userConfig };
  } catch {
    console.warn(
      "\x1b[33m⚠  Could not load stackprobe.config.js — using defaults\x1b[0m",
    );
    return { ...DEFAULT_CONFIG };
  }
}
