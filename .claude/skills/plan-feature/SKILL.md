---
name: plan-feature
description: End-to-end analysis and an implementation plan for a new feature, redesign, or multi-file bug fix, before any code is written. Use when the user asks to analyze and plan ("e2e analiz et", "derinlemesine analiz", "implementasyon planı", "planla") or describes a feature that spans several layers.
argument-hint: "<feature or problem description>"
---

# Plan a feature

Task: $ARGUMENTS

Don't edit code while planning.

## 1. Understand
- Restate the goal and the value to the user in two or three sentences, and list your assumptions.
- Ask only the questions whose answers change the design.

## 2. Analyze end to end
- Find every layer the change touches: UI → state and API client → route or controller → service → data layer, schema, and security rules → background jobs, notifications, analytics, admin screens.
- List the existing components, helpers, constants, validators, and patterns to reuse.
- For a bug, find the root cause with evidence (file:line) before planning a fix; don't plan around a symptom.

## 3. Present the plan
Keep it scannable: one or two lines per item, no prose paragraphs, and skip sections that don't apply.

- **Approach**: the chosen design. Mention a rejected alternative only when there is a real trade-off, in one line.
- **Steps**: in implementation order, each one testable on its own, with the files it touches.
- **Data**: schema, security rule, and migration changes, and backward compatibility.
- **UI/UX**: states, mobile behavior, and user-facing copy, following the UI/UX and marketing best practices for the product's audience.
- **Security and fraud**: authorization, input validation, client-trusted values, rate limits, race conditions (see `../security-audit/checklist.md`, relative to this skill's directory).
- **Edge cases and failure modes.**
- **Verification**: the tests to add and how you'll confirm it works.
- **Risks and open questions.**

## 4. Stop
Wait for approval. Once approved, implement step by step, and verify and commit each step before starting the next.

## Commits
Commit as you go, one logical change per commit, following the team git rule:
- Each plan step becomes at least one commit: `feat` for new behavior, `fix` for bug fixes, `refactor` for preparatory changes that don't change behavior. Tests go in the commit of the change they cover.
- Subject: `type(scope): summary` in imperative mood, lowercase after the colon, no trailing period, about 72 characters max. Describe the behavior change, not the files.
- Body only when the subject isn't enough: one to four lines on why, with concrete facts (counts, dates, status codes). No file lists, no narration.
- No `Co-Authored-By` or other AI attribution lines; the developer is the only author. Never push.

Example:

```
feat(api-keys): treat a key without a brand list as reaching none

Every key now has a list, so "no list" no longer means every brand.
A missing list maps to none and the schema defaults to an empty list.
```
