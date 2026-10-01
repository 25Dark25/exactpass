# Changelog

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
