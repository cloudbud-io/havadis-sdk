---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
  - "**/*.svelte"
  - "**/*.astro"
  - "**/*.html"
  - "**/*.css"
  - "**/*.scss"
  - "**/*.dart"
---

# UI / UX

Follow established UI/UX practice by default, without being asked.

- Mobile-first and fully responsive: start at ~360px wide and scale up; no horizontal scroll; touch targets at least 44px.
- Modern and clean: clear visual hierarchy, generous whitespace, a consistent spacing scale, few font sizes and weights, and restrained color. Remove borders, shadows, icons, and decoration that don't help the user.
- No unnecessary text. Every label, hint, and sentence must help the user understand or act. Cut helper text that repeats the label, instructions for obvious actions, redundant headings, and filler. Keep what drives decisions: the value proposition, clear calls to action, errors, and empty-state guidance.
- Every data-driven view has loading, empty, error, and success states. Disable submit while a request is in flight and prevent double submits.
- Forms: mark required fields with `*` and leave optional ones unlabeled; show validation next to the field; align side-by-side inputs on the same line; keep the user's input after an error.
- Use the project's design system components and tokens (colors, spacing, typography); no hard-coded colors or sizes.
- Accessibility: semantic elements, labels for inputs, alt text, visible focus, keyboard navigation, WCAG AA contrast.
- Ask for permissions (notifications, tracking/ATT, location, camera) in context, when the user reaches the feature that needs it, after a short explanation, never on first launch.
- Mobile: keep focused inputs and sheets above the keyboard, respect safe areas, and use platform-native patterns so it feels native.
- Confirm destructive actions and state the consequence ("scheduled posts will move back to drafts").
- Copy is short, clear, and framed around user benefit. All user-facing strings go through the project's i18n system when it has one.
- Keep locale files key-parallel: add every new key to all of them (e.g. `tr.json` and `en.json`) and check that each key you reference with `t('…')` exists, since missing keys only show up at runtime.
