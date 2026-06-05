---
description: Run the full local verification gate (lint + typecheck + unit tests) and make it pass.
allowed-tools: Bash(npm run check), Bash(npm run lint), Bash(npm run typecheck), Bash(npm run test), Bash(npm run test:*)
---
Run `npm run check` (lint + typecheck + unit tests) and report the result.

- If it passes, state plainly that lint, typecheck, and unit tests all pass.
- If anything fails, show the failing output, fix the underlying issue, and re-run until green. Do not suppress lint rules or skip tests to get past it.
- Do not claim the work is complete until `npm run check` passes — this is the same gate CI enforces (CI additionally runs `npm run build` and `npm run test:e2e`).
