---
name: final-review
description: Final cleanup and hardening pass over the code changed in this session. Audits dead code, SOLID/DRY, security (OWASP Top 10), fraud, and readability, applies the confirmed fixes, then verifies with lint, types, build, and tests. Run once feature work is done.
disable-model-invocation: true
argument-hint: "[extra scope or focus]"
---

# Final cleanup and hardening pass

All feature work for this session is done. This pass reviews the code you implemented in this session. Do not add features or change observable behavior.

## Scope
Files created or modified in this session (from the conversation, `git status`, and `git diff`), plus the files that directly reference them. Do not refactor unrelated legacy code.

Extra scope or focus from the user (may be empty): $ARGUMENTS

## Phase 1: Audit (no code changes yet)
1. Trace every change end to end: entry point → service/handler → data layer → response and side effects.
2. Dead code: run the Find and Verify steps of `../dead-code/SKILL.md` (relative to this skill's directory).
3. SOLID and DRY: duplicated logic, functions with more than one responsibility, concrete dependencies where an abstraction already exists, leaky layers, magic strings and numbers, speculative abstractions.
4. Security and fraud: go through `../security-audit/checklist.md` for the changed code.
5. Readability: unclear names, deep nesting, long functions, drift from project conventions.

Present the audit as one table:

| # | Item | Location (file:line) | Category | Severity | Proposed action |
|---|------|----------------------|----------|----------|-----------------|

Category: dead code, SOLID-DRY, security, fraud, or readability. Severity: high, medium, or low.

Wait for confirmation before Phase 2, unless every item is low severity.

## Phase 2: Apply
1. Remove all confirmed dead code completely: no commented-out code, no "deprecated" markers, no TODOs.
2. Fix all high and medium security and fraud items, using existing project patterns (validators, guards, middleware, error types) instead of new ones.
3. Refactor for SOLID/DRY only where it removes duplication or clarifies responsibility. Keep functions small, names explicit, and dependencies injected.
4. Generalize only when there are 2+ concrete call sites today or a documented near-term need. If you generalize, keep the public API minimal and typed.
5. Follow the existing code style, naming, folder structure, and lint rules. Don't add a library without stating why.
6. Commit as described in Commits below.

## Phase 3: Verify
1. Run lint, type check, build, and the full test suite. Fix anything you broke.
2. Add or update tests for the security fixes and refactored logic. Delete a test only when the code it covers was removed.
3. Confirm there is no behavior change: same inputs produce the same outputs and side effects, except where a security fix intentionally rejects invalid input.

## Commits
Commit as you go, one logical change per commit, following the team git rule:
- Subject: `type(scope): summary` in imperative mood, lowercase after the colon, no trailing period, about 72 characters max. Describe the behavior change, not the files.
- Body only when the subject isn't enough: one to four lines on why, with concrete facts (counts, dates, status codes). No file lists, no narration.
- Dead code removals and SOLID/DRY cleanups are `refactor`; security and fraud fixes are `fix`. Never mix a refactor with a fix. Tests go in the commit of the change they cover.
- No `Co-Authored-By` or other AI attribution lines; the developer is the only author. Never push.

Example:

```
fix(orders): compute the order total on the server

Checkout trusted the total sent by the client, so an edited request
could pay less than the cart price.
```

## Output
Keep it concise: tables and short bullets, one line per item, no repeated explanations. Skip sections with nothing to report.

1. What was removed (file and function list), what was refactored and why, which security and fraud issues were fixed and how.
2. What you found but deliberately did not change, with the reason.
3. Remaining risks and recommendations for a follow-up task.
