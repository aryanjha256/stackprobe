import fs from "fs";
import path from "path";
import type { CheckResult } from "../runner";

// Lightweight circular dependency detector — no external deps needed for basic cases.
// For deeper analysis, users can install `madge` and we'll use that if available.

type Graph = Map<string, Set<string>>;

function resolveImport(
  fromFile: string,
  importPath: string,
  extensions: string[],
): string | null {
  if (!importPath.startsWith(".")) return null; // skip node_modules

  const base = path.resolve(path.dirname(fromFile), importPath);

  // Try exact path
  if (fs.existsSync(base)) return base;

  // Try with extensions
  for (const ext of extensions) {
    if (fs.existsSync(base + ext)) return base + ext;
  }

  // Try index file
  for (const ext of extensions) {
    const indexPath = path.join(base, `index${ext}`);
    if (fs.existsSync(indexPath)) return indexPath;
  }

  return null;
}

function extractImports(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const imports: string[] = [];

    // Match ES imports — but NOT "import type" (type-only imports are erased at runtime)
    const esImportRegex =
      /import\s+(?!type\s+)(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
    // Match require: require('...')
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    let match;
    while ((match = esImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  } catch {
    return [];
  }
}

function walkDirectory(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip common ignored dirs
      if (
        entry.isDirectory() &&
        ![
          "node_modules",
          ".git",
          "dist",
          "build",
          ".next",
          "coverage",
        ].includes(entry.name)
      ) {
        files.push(...walkDirectory(fullPath, extensions));
      } else if (
        entry.isFile() &&
        extensions.some((ext) => entry.name.endsWith(ext))
      ) {
        files.push(fullPath);
      }
    }
  } catch {
    // skip unreadable dirs
  }

  return files;
}

function buildGraph(files: string[], extensions: string[]): Graph {
  const graph: Graph = new Map();

  for (const file of files) {
    const imports = extractImports(file);
    const resolved = new Set<string>();

    for (const imp of imports) {
      const resolvedPath = resolveImport(file, imp, extensions);
      if (resolvedPath) resolved.add(resolvedPath);
    }

    graph.set(file, resolved);
  }

  return graph;
}

function findCycles(graph: Graph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string, stack: string[]): void {
    visited.add(node);
    inStack.add(node);

    const neighbors = graph.get(node) ?? new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...stack, node]);
      } else if (inStack.has(neighbor)) {
        // Found a cycle — record it
        const cycleStart = stack.indexOf(neighbor);
        if (cycleStart !== -1) {
          cycles.push([...stack.slice(cycleStart), node, neighbor]);
        }
      }
    }

    inStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

function relativize(filePath: string): string {
  return path.relative(process.cwd(), filePath);
}

export async function checkCircular(): Promise<CheckResult> {
  const cwd = process.cwd();

  // Determine if it's a TS or JS project
  const isTs = fs.existsSync(path.join(cwd, "tsconfig.json"));
  const extensions = isTs
    ? [".ts", ".tsx", ".js", ".jsx", ".mjs"]
    : [".js", ".jsx", ".mjs", ".cjs"];

  // Find src dir or fall back to cwd
  const srcDir = fs.existsSync(path.join(cwd, "src"))
    ? path.join(cwd, "src")
    : cwd;

  const files = walkDirectory(srcDir, extensions);

  if (files.length === 0) {
    return {
      checkName: "circular",
      status: "skip",
      messages: [
        {
          level: "info",
          text: `No ${extensions.join("/")} files found to analyze`,
        },
      ],
    };
  }

  const graph = buildGraph(files, extensions);
  const cycles = findCycles(graph);

  if (cycles.length === 0) {
    return {
      checkName: "circular",
      status: "pass",
      messages: [
        {
          level: "info",
          text: `No circular dependencies found across ${files.length} files`,
        },
      ],
    };
  }

  const messages: CheckResult["messages"] = [
    {
      level: "error",
      text: `Found ${cycles.length} circular dependency chain(s)`,
    },
  ];

  // Show up to 3 cycles to keep output readable
  for (const cycle of cycles.slice(0, 3)) {
    messages.push({
      level: "warn",
      text: cycle.map(relativize).join(" → "),
    });
  }

  if (cycles.length > 3) {
    messages.push({
      level: "info",
      text: `...and ${cycles.length - 3} more. Fix the above first.`,
    });
  }

  return {
    checkName: "circular",
    status: "fail",
    messages,
  };
}
