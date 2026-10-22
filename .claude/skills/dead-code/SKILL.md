---
name: dead-code
description: Find and safely remove unreferenced code (files, exports, functions, types, constants, imports, styles, i18n keys, config keys, env vars, tests) after project-wide verification. Use when asked to clean up dead or unused code ("referansı olmayan kod", "kullanılmayan dosyalar").
disable-model-invocation: true
argument-hint: "[path or area; defaults to this session's changes]"
---

# Dead code removal

Scope from the user (may be empty): $ARGUMENTS

If no scope is given, use the files created or modified in this session (`git status`, `git diff`) plus the files that reference them. Don't sweep unrelated legacy code unless the scope says so.

## Find
List candidates: unreferenced files, exports, functions, classes, components, types, constants, imports, styles and CSS classes, i18n keys, config keys, env vars, feature flags, routes, migrations, assets, and tests for removed code.

## Verify
A candidate is dead only when a project-wide search finds no reference. Check:
- String-based and dynamic references: lazy imports, `require(variable)`, reflection, i18n keys like `t('key')`, route tables, event names, DI providers and module registrations.
- Entry points used by convention instead of import: Next.js `app/` and `pages/` files, route handlers and middleware, NestJS modules and controllers, Cloud Functions exports, Flutter routes, `package.json` scripts, cron jobs, and workers.
- Config and infra: env files, CI workflows, Dockerfiles, Firestore and Storage rules, deployment config.
- Consumers outside this repo (public SDK or API exports). If you can't rule them out, flag the item instead of deleting it.

Record the evidence for each item: what you searched and what you found.

## Remove
Present the list (item, location, evidence) and wait for confirmation, unless the user already asked you to remove it. Then:
- Delete completely: no commented-out code, no "deprecated" markers, no TODOs.
- Repeat Find and Verify for anything that became unreferenced because of the removal.
- Run lint, type check, build, and tests, and fix anything that broke.

## Commits
Commit as you go, one logical change per commit, following the team git rule:
- Subject: `refactor(scope): remove …` (`chore` for tooling and config), imperative, lowercase after the colon, no trailing period, about 72 characters max. Group removals that belong together into one commit.
- Body only when the subject isn't enough: one to four lines on why it was dead, with concrete facts. No file lists, no narration.
- No `Co-Authored-By` or other AI attribution lines; the developer is the only author. Never push.

Example: `refactor(api-keys): remove the unused single-key helpers`

## Output
Short lists, one line per item, no narration: removed items (file and symbol), items kept with the reason, verification results.
