# Security policy

## Reporting a vulnerability

Use **Security → Advisories → Report a vulnerability** on the repository page (GitHub private vulnerability reporting). Please do not open a public issue for security problems. Include the version or commit, steps to reproduce and the impact. Do not include real secrets.

## In scope

- Bias in sampling, or an entropy figure that does not match the real space of secrets.
- Any way to bypass the mandatory minimum (a "fail-open" case).
- Data leaks: network requests, persistent storage or a CSP bypass in the web page.
- The local server reachable from outside `127.0.0.1`, or serving files outside its whitelist.
- Misleading claims in the code or documentation.

## Out of scope

- Malware, keyloggers or a compromised clipboard, browser or operating system.
- The quality or authenticity of a word list other than the one included.
- Attack rates (`--rate`, `--qrate`): they are user assumptions, not results.

## Status

The project has not had an independent audit. Only the latest release is supported.
