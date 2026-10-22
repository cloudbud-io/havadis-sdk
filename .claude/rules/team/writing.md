# Writing

Applies to everything you write: replies, plans, reports, UI copy, i18n strings, docs, code comments, and commit messages.

- Be concise. Lead with the result or answer, then only the details needed to act on it. No filler, no restating the request, no repeated summaries.
- Never use `--`, em dashes (—), or en dashes (–) between words or sentences; they make text feel AI-generated. Use a period, comma, colon, or parentheses instead. Command-line flags in code are fine.
- Avoid stock AI phrasing: "seamless", "robust", "leverage", "delve", "elevate", "unlock", "it's not just X, it's Y", and Turkish equivalents such as "sorunsuz bir deneyim" or "bir üst seviyeye taşıyın".
- Write like a person on the team: plain words, short sentences, specific facts instead of adjectives.

## Turkish
When the text is Turkish (UI copy, `tr.json` and other i18n files, content, docs, replies), follow the TDK spelling rules:
- The conjunctions "de/da" and "ki" are written separately ("sen de", "biliyorum ki"); the suffixes are attached ("evde", "evdeki"). The conjunction "de/da" never becomes "te/ta".
- The question particle "mı/mi/mu/mü" is written separately and follows vowel harmony ("geliyor musun?").
- Suffixes on proper nouns, brands, and abbreviations take an apostrophe and follow pronunciation: "Google'a", "iOS'ta", "API'ye", "SMS'e", "PDF'i".
- "Her şey" and "bir şey" are written separately; "hiçbir", "birçok", and "herhangi" are joined.
- Never replace ı, İ, ğ, ş, ç, ö, ü with ASCII letters in user-facing text. In code, use Turkish-aware case conversion and sorting (`toLocaleUpperCase('tr-TR')`, `localeCompare(a, b, 'tr')`), because `'i'.toUpperCase()` gives "I", not "İ".
- Formats: "1.234,56 ₺", "22.10.2026", "%20".
- Keep the form of address (siz or sen) consistent across the product.
