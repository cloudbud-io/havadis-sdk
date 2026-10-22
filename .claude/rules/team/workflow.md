# Workflow

- Analyze end to end before changing code: trace the flow from its entry point (screen, route, job, webhook) through services to the data layer and side effects, and read the code around what you change.
- For a large or ambiguous task (new feature, several layers, schema or security rule change, auth or payments), propose a short plan first and implement once it is agreed, unless told to go ahead. `/plan-feature` does this in depth.
- Ask only when the answer changes the design; otherwise pick the conventional option and say which one.
- For fast-moving frameworks and SDKs, check the installed version's docs instead of relying on memory.
- Before calling the task done:
  - Run lint, type check, build, and the relevant tests, and fix what you broke. If the project has a `verify` skill, follow it.
  - If the lint script auto-fixes the whole repo (`--fix`), lint only the files you changed.
  - For runtime checks, first see whether dev servers are already running (`lsof -i :<port>`). A process serving compiled output (`node dist/...`) doesn't pick up changes; rebuild and restart it before checking.
  - Separate pre-existing failures from yours by checking them on the base commit, and report both.
  - Re-read the request and confirm every requirement is covered.
- Report what changed, how it was verified, what was not verified (for example screens behind a login you couldn't open), and remaining risks. Never claim something works without running it.
