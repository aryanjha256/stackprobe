## **`stackprobe`** — A CLI that audits your project and tells you what's wrong, outdated, or missing before it becomes a problem.

**The real problem it solves:**
Developers constantly discover issues the hard way — a `.env` variable missing in production, a package 3 major versions behind with breaking changes, no license file, mismatched Node engine versions, circular dependencies nobody noticed. `stackprobe` catches all of this _before_ you ship.

You run one command in any Node/JS project:

```bash
npx stackprobe audit
```

And you get a clean, readable report like:

```
Dependencies
   lodash is 4 major versions behind (installed: 1.x, latest: 4.x)
   axios has a known CVE — upgrade to 1.6.8+

Environment
   DATABASE_URL is used in code but missing from .env.example
   JWT_SECRET has no fallback and is not validated at startup

License
   MIT license found

Engine
   Your code uses Array.at() — not supported in Node < 16.6
   package.json specifies "node >= 14"  ← conflict
```
