import fs from "fs";
import path from "path";
import type { CheckResult } from "../runner";

const LICENSE_NAMES = [
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "LICENCE",
  "LICENCE.md",
  "LICENCE.txt",
];

export async function checkLicense(): Promise<CheckResult> {
  const cwd = process.cwd();

  const found = LICENSE_NAMES.find((name) =>
    fs.existsSync(path.join(cwd, name)),
  );

  if (found) {
    // Try to read what kind of license it is
    const content = fs.readFileSync(path.join(cwd, found), "utf-8");
    let licenseType = "Unknown";

    if (/MIT License/i.test(content)) licenseType = "MIT";
    else if (/Apache License/i.test(content)) licenseType = "Apache 2.0";
    else if (/GNU GENERAL PUBLIC LICENSE/i.test(content)) licenseType = "GPL";
    else if (/ISC License/i.test(content)) licenseType = "ISC";
    else if (/BSD/i.test(content)) licenseType = "BSD";

    return {
      checkName: "license",
      status: "pass",
      messages: [
        {
          level: "info",
          text: `${found} found (${licenseType})`,
        },
      ],
    };
  }

  return {
    checkName: "license",
    status: "warn",
    messages: [
      {
        level: "warn",
        text: "No LICENSE file found — open source projects should have one",
      },
      {
        level: "info",
        text: "Add a LICENSE file. Not sure which? → https://choosealicense.com",
      },
    ],
  };
}
