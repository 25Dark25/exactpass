# Changelog

## 0.1.3 - 2026-10-12

Fixes from a full audit of 0.1.2. The generator's output and entropy figures are unchanged.

- Web: the timed clipboard clear no longer fails silently. Browsers can refuse it (Firefox and Safari always do outside a click); the page now reports it and adds a **Clear clipboard** button that works everywhere.
- Web: the secret is removed from the page when you switch mode or generate again, not only hidden.
- Web: a word list with fewer than 2 words is rejected instead of showing "-Infinity bits per word".
- Word lists: lines with several words are rejected instead of silently keeping the last one; words with invisible or control characters, or not in Unicode NFC form, are rejected (they could make the stated entropy higher than what can actually be typed).
- Custom symbols (API) must be in NFC form.
- CLI: errors from Node (missing file, unknown option) show their message instead of only an internal code; extra arguments and options that belong to another mode are rejected instead of ignored.
- Server: invalid ports are rejected with a clear message; port 0 used to start a server that answered 403 to everything. Only regular files are served from `wordlists/`.
- README (Spanish): the language button is labeled ES, not EN.

## 0.1.2 - 2026-10-01

Initial public release.

- Password, passphrase and binary key generation with exact entropy and a mandatory minimum (128 bits by default).
- Exact counting by inclusion–exclusion; uniform sampling by whole-string rejection; unbiased integer sampling by rejection.
- Web interface (strict CSP, no storage, no third-party requests) and command-line tool sharing one dependency-free core.
- English and Spanish in the web page, the CLI and all messages.
- Passphrase separator check (Sardinas–Patterson) with a warning when the entropy figure would only be an upper bound.
- Test suite, and CI on Linux, Windows and macOS with Node 22 and 24.
- Requires Node.js 22 or later.
- Releases are published as a zip with a detached OpenPGP signature and its SHA-256 in the release notes.

Versions 0.1.0 and 0.1.1 were pre-release tests in a repository that has since been replaced. They are not supported.
