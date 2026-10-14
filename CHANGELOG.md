# Changelog

## 0.1.4 - 2026-10-14

Fixes from a full audit of 0.1.3. The generator's output and entropy figures are unchanged for every input that 0.1.3 accepted correctly; the changes add rejections and fix messages.

- CLI/API: `--format constructor`, `toString` or `isPrototypeOf` (names inherited from `Object.prototype`) produced a constant value (`{}`, `[object Undefined]`, `false`) with exit code 0 and a report of 256 bits. Only `hex`, `base64` and `base64url` are accepted.
- API: `generatePassphrase` applies the same per-word checks as `parseWordlist` (non-empty strings, no whitespace, no invisible characters, NFC). Distinct objects, `1` next to `"1"` or NFC next to NFD forms used to pass and overstate the entropy. Alphabet and symbol arrays must contain single characters: `["ab", "a", "b"]` counted 27 strings of length 3 where only 26 exist.
- Passphrase separator: line breaks, control, invisible and non-NFC characters are rejected. A newline split the secret over several lines of stdout.
- Word lists: default-ignorable characters (variation selectors, grapheme joiner, Hangul fillers) are rejected, not only control and format characters. Files must be valid UTF-8: a Latin-1 list used to be accepted with U+FFFD in its words, and a UTF-16 list (PowerShell 5.1's default) failed with a misleading message.
- Passphrase `--capitalize`: lists whose capitalized words are not in NFC form are rejected. An entry such as `ΐx` became a sequence that looks like another entry (`Ϊ́x`) but counted as a different word. Capitalization itself is unchanged.
- Passphrase separator check (Sardinas–Patterson) runs in polynomial time. A 118-word list built for it took 86 s and 1.5 GB and then failed; it now takes milliseconds, with the same result for every list.
- CLI: without a mode, the usage goes to stderr, so `pw=$(exactpass)` no longer captures it; an unreachable passphrase minimum says so instead of blaming `--words`; `EXACTPASS_LANG` and `--lang` accept `es-ES`, `ES` or `es_ES.UTF-8`; modes such as `constructor` give the normal "Unknown mode" error.
- Server: port 80 works (browsers omit `:80` from the Host header); symbolic links are not followed, so only regular files are served.
- Web: text that a number field cannot parse is reported as an error instead of silently meaning "automatic".
- CI: actions pinned by commit SHA with Dependabot, one run per pull request commit, `persist-credentials: false`, job timeouts, and an `all-tests` job to require as a single check.

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
