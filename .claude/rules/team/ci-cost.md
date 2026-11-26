---
paths:
  - ".github/**"
  - "**/.github/**"
---

# CI/CD cost

Hosted runner minutes are billed per job, rounded up to the minute. A workflow holds only the steps it cannot do its job without.

## Don't add
- Add nothing that makes a run longer unless the user asks for that exact thing: no test, lint, type check, e2e, coverage, security scan, native build (Android, iOS), or diagnostic step, and no extra job, matrix entry, or `schedule`. Run checks locally before committing, as the workflow rule says.
- When asked to add something, first say how long it runs, how often it triggers, and the minutes per month, then build the cheapest form that does the job.
- No step that calls a paid API or an LLM. No artifact upload except on failure.

## When writing or editing a workflow
- One run per change: don't repeat on `push` to main what the pull request already ran. Run on main only to deploy.
- Filter triggers with `paths` or `paths-ignore`, so a change that can't affect the result starts nothing: docs for a build, specs and docs for a deploy. First check that the workflow is not a required status check and that no step reads an ignored path.
- Set `concurrency` on every workflow. Checks cancel the run a newer push replaces. Deploys queue without cancelling, so an older commit can't finish last.
- Set `timeout-minutes` on every job, about twice its normal time. The default is 6 hours.
- Linux runners only. macOS minutes cost ten times as much, Windows twice.
- One job instead of several small ones: each job pays its own setup and its own rounding.
- Cheapest step first, so a failing run stops early. No step repeats work another step did.
- Use the setup action's built-in dependency cache. Don't cache what takes longer to restore than to rebuild.
- Remove steps that only print diagnostics.
