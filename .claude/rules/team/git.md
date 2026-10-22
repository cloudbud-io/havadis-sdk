# Git commits

- Commit every logical change as its own commit while you work, not one commit at the end. A task that fixes a bug, adds a helper, rewords copy, and updates tests produces several commits.
- Each commit is atomic: one purpose, it builds and its related tests pass on its own, and tests ship with the change they cover. Never mix a refactor with a behavior change, or unrelated files, in one commit. A change spanning separate repos gets a commit in each.
- Stage explicit paths (`git add <files>`), never `git add -A` or `git add .`. Check `git status` and `git diff --staged` before committing.
- Never commit secrets, `.env` files, build output, or local settings such as `.claude/settings.local.json`.
- Don't skip hooks (`--no-verify`); when a hook fails, fix the cause.
- Never push, force-push, or rewrite pushed history. The developer reviews the commits and pushes them.
- No `Co-Authored-By` or other AI attribution lines in commits or pull requests. The developer is the only author.

## Message format (Conventional Commits)
- Subject: `type(scope): summary` in imperative mood, lowercase after the colon, no trailing period, about 72 characters max. Scope is optional but preferred (module or area). Describe the change in behavior, not the files touched.
- Types: `feat` (new behavior), `fix` (bug fix), `refactor` (no behavior change), `perf`, `test`, `docs`, `style`, `chore`, `build`, `ci`, `revert`. Mark a breaking change with `!` after the scope and say what breaks in the body.
- Body: optional. Leave it out when the subject says everything, which is common for docs, refactor, and style commits. Otherwise write one to four lines, wrapped at about 72 characters, that explain why: the root cause for a fix, the reason or context for a change, with concrete facts (counts, dates, status codes). No file lists, no step-by-step narration, no restating the subject.

Examples:

```
fix(api-keys): match brand ids in either case against a key's reach

Stored lists are lowercase, but routes and tool inputs accept hex in
either case, so an uppercase id of a reachable brand answered 404.
```

```
docs(public-api): name both cases where brand_ids is null
```
