# Code quality

Apply these to every change, without being asked.

## Before writing
- Search for an existing helper, component, hook, validator, service, or constant before writing a new one. Reuse or extend it; never create a parallel version.
- Follow the project's existing style, naming, folder structure, error types, and lint rules. Don't add a library without saying why.

## While writing
- SOLID: one responsibility per function, class, and component. Depend on abstractions that already exist in the codebase. Keep layers separate: no data access in UI or controllers, no HTTP concerns in the data layer.
- DRY: when the same logic or markup appears twice, extract it into a shared function, service, or component.
- No magic strings or numbers. Use named constants from the feature's or project's existing constants location: routes, collection and table names, event names, storage keys, status values, limits, timeouts.
- Generalize (generic class, function, or component) only when there are 2+ concrete call sites today or a documented near-term need. No speculative abstractions, wrappers, or plugin systems (YAGNI). Keep the public API minimal and typed.
- Small functions, explicit names, early returns instead of deep nesting. Code should be easy to read, maintain, and extend.

## Before finishing
- Remove everything your change left unreferenced: files, exports, functions, types, constants, imports, styles, i18n keys, config keys, env vars, tests. Confirm with a project-wide search first, including string-based and dynamic references.
- No commented-out code, no "deprecated" markers, no TODOs left behind.
- Don't refactor unrelated legacy code; mention what you noticed instead.
