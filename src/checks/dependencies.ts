import fs from "fs";
import path from "path";
import https from "https";
import type { CheckResult } from "../runner";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function fetchLatestVersion(packageName: string): Promise<string | null> {
  return new Promise((resolve) => {
    const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`;

    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json.version ?? null);
          } catch {
            resolve(null);
          }
        });
      })
      .on("error", () => resolve(null));
  });
}

function parseMajor(version: string): number | null {
  // Strip leading ^ ~ >= etc.
  const clean = version.replace(/^[\^~>=<\s]+/, "").trim();
  const major = parseInt(clean.split(".")[0], 10);
  return isNaN(major) ? null : major;
}

export async function checkDependencies(): Promise<CheckResult> {
  const pkgPath = path.join(process.cwd(), "package.json");

  if (!fs.existsSync(pkgPath)) {
    return {
      checkName: "deps",
      status: "skip",
      messages: [{ level: "info", text: "No package.json found" }],
    };
  }

  const pkg: PackageJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  const depEntries = Object.entries(allDeps);

  if (depEntries.length === 0) {
    return {
      checkName: "deps",
      status: "pass",
      messages: [{ level: "info", text: "No dependencies found" }],
    };
  }

  const messages: CheckResult["messages"] = [];
  let status: CheckResult["status"] = "pass";

  // Check up to 20 deps to avoid hammering npm registry
  const toCheck = depEntries.slice(0, 20);

  const results = await Promise.all(
    toCheck.map(async ([name, installedRange]) => {
      const latest = await fetchLatestVersion(name);
      return { name, installedRange, latest };
    }),
  );

  for (const { name, installedRange, latest } of results) {
    if (!latest) continue;

    const installedMajor = parseMajor(installedRange);
    const latestMajor = parseMajor(latest);

    if (installedMajor === null || latestMajor === null) continue;

    const majorsBehind = latestMajor - installedMajor;

    if (majorsBehind >= 2) {
      status = "warn";
      messages.push({
        level: "warn",
        text: `${name} is ${majorsBehind} major version(s) behind (you: ${installedRange}, latest: ${latest})`,
      });
    } else if (majorsBehind === 1) {
      messages.push({
        level: "info",
        text: `${name} has a new major version available (you: ${installedRange}, latest: ${latest})`,
      });
    }
  }

  if (depEntries.length > 20) {
    messages.push({
      level: "info",
      text: `Only checked 20 of ${depEntries.length} dependencies to avoid rate limiting`,
    });
  }

  if (messages.length === 0) {
    messages.push({
      level: "info",
      text: `All ${toCheck.length} checked dependencies are up to date`,
    });
  }

  return { checkName: "deps", status, messages };
}
