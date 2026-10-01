# exactpass

[Español](README.es.md)

[![tests](https://github.com/25Dark25/exactpass/actions/workflows/test.yml/badge.svg)](https://github.com/25Dark25/exactpass/actions/workflows/test.yml)

A local generator for passwords, passphrases and binary keys. It calculates the exact entropy of what it generates and refuses to generate anything below the minimum you set (128 bits by default). No dependencies, no network access, no telemetry. A web page and a command-line tool share the same small core.

![exactpass web interface](docs/screenshot.png)

## Features

- **Exact entropy, not an estimate.** The tool counts the real number of possible secrets, including when you require at least one character of each type.
- **Mandatory minimum.** If the configuration does not reach the threshold, nothing is generated and you are told what to change. Without `--length` it picks the shortest length that meets the minimum.
- **Uniform sampling.** Only `crypto.getRandomValues`, with rejection sampling to avoid modulo bias.
- **Three kinds of secret:** passwords, passphrases (from a word list) and binary keys (hex, base64, base64url).
- **Analysis with explicit assumptions:** classical search and Grover's algorithm. Time estimates use only the rates you provide.
- **Local.** The web page has a strict Content Security Policy, stores nothing and makes no third-party requests.
- **English and Spanish** in the web page, the CLI and all messages.

## Quick start

Requires [Node.js](https://nodejs.org) 22 or later. There is nothing to install.

```bash
git clone https://github.com/25Dark25/exactpass.git
cd exactpass
npm test
npm start
```

Then open <http://127.0.0.1:8080>. Use `npm start -- 8181` for a different port.

Do not open `index.html` straight from disk: browsers block ES modules on `file://` URLs. That is why the project includes a tiny server, which listens only on `127.0.0.1`.

## Download and verify a release

Releases are on the [Releases page](https://github.com/25Dark25/exactpass/releases). Each one contains the zip, a detached OpenPGP signature (`.asc`) and the SHA-256 of the zip in the release notes.

**PGP key fingerprint:** `A7FC EDEA D7E6 C343 7312  284A 442D A687 E0FF 73EE`

- Published at keys.openpgp.org: <https://keys.openpgp.org/vks/v1/by-fingerprint/A7FCEDEAD7E6C3437312284A442DA687E0FF73EE>
- Also on GitHub: <https://github.com/25Dark25.gpg>

```bash
# Linux / macOS
curl -sSL https://github.com/25Dark25.gpg | gpg --import
# Windows (PowerShell)
Invoke-WebRequest https://github.com/25Dark25.gpg -OutFile 25Dark25.gpg; gpg --import 25Dark25.gpg

gpg --fingerprint A7FCEDEAD7E6C3437312284A442DA687E0FF73EE   # must match the fingerprint above
gpg --verify exactpass-0.1.2.zip.asc exactpass-0.1.2.zip       # use the file names of the release you downloaded
```

`gpg` will report a good signature and also warn that the key is not certified; that is expected. What matters is that the fingerprint is the same in several independent places (this README, the release notes and keys.openpgp.org). A valid signature shows the file was published by whoever controls that key, not who that person is.

To check the hash: `sha256sum exactpass-0.1.2.zip` (Linux/macOS) or `Get-FileHash exactpass-0.1.2.zip -Algorithm SHA256` (PowerShell).

## Usage

### Web

Choose the type of secret, set the minimum entropy and press Generate. The ruler shows the exact entropy against the 128, 192 and 256-bit marks and your minimum. The **ES** button (or `?lang=es` in the URL) switches the page to Spanish.

### Command line

```bash
node bin/exactpass.js password                       # >= 128 bits, shortest length that meets it
node bin/exactpass.js password --min-bits 256 --no-symbols
node bin/exactpass.js passphrase --wordlist wordlists/eff_large_wordlist.txt --separator " "
node bin/exactpass.js key --bytes 32 --format base64url
node bin/exactpass.js password --json
node bin/exactpass.js password --lang es             # or set EXACTPASS_LANG=es
```

The secret goes to stdout and the report to stderr, so you can pipe the secret without the analysis. The exit code is 0 on success and 2 for an invalid configuration or one that does not reach the minimum.

| Option | Mode | Description |
|---|---|---|
| `--min-bits N` | all | Mandatory minimum entropy (default 128) |
| `--length N` | password | Length (default: shortest that meets the minimum) |
| `--no-symbols` | password | Letters and digits only |
| `--exclude-lookalikes` | password | Exclude `0 O 1 l I \|` |
| `--no-require-each` | password | Do not require one character of each type |
| `--wordlist FILE` | passphrase | Word list (required) |
| `--words N` | passphrase | Number of words (default: fewest that meet the minimum) |
| `--separator S` | passphrase | Separator (default `-`) |
| `--capitalize` | passphrase | Capitalize each word (adds no entropy) |
| `--bytes N` | key | 1 to 1024 (default 32) |
| `--format F` | key | `hex`, `base64` or `base64url` |
| `--rate N`, `--qrate N` | all | Rates for the time estimates |
| `--json` | all | JSON output |
| `--lang en\|es` | all | Language |

## How the entropy is calculated

**Password.** For disjoint character groups of sizes g₁…g_k, with C = Σgᵢ and length L, the number of strings that contain at least one character of every group follows from inclusion–exclusion:

```
N = Σ over subsets S of the groups of (−1)^|S| · (C − Σ_{i∈S} gᵢ)^L        entropy = log2(N)
```

To generate one, every character is drawn uniformly from the whole alphabet and the entire string is discarded if a group is missing. The result is uniform over those N strings. The tempting alternative, forcing one character per group and filling the rest, makes some strings more likely than others, so `L · log2(C)` would overstate the entropy.

**Passphrase.** With a list of W unique words and n words, entropy = n · log2(W). That is the entropy of the *string* only if different word sequences always give different strings; the tool checks this (Sardinas–Patterson) and warns when it cannot guarantee it, in which case the figure is an upper bound.

**Key.** 8 × bytes.

| Configuration | Entropy |
|---|---|
| Default password (20 characters, 86-symbol alphabet) | 128.39 bits |
| Passphrase of 10 words from the EFF list (7776 words) | 129.25 bits |
| 32-byte key | 256 bits |

**Estimates.** Classical search needs about 2^(bits−1) guesses on average. Grover's algorithm needs about (π/4)·2^(bits/2) sequential iterations. A duration is shown only if you give `--rate` / `--qrate`; those are your assumptions and depend on the KDF and the hardware.

## Is this "post-quantum"?

A symmetric secret is only affected by Grover's algorithm, which reduces a search of 2ⁿ to about 2^(n/2) iterations and parallelizes poorly. 128 bits corresponds to the lowest NIST reference level (AES-128 key search) and 256 bits leaves a wide margin at no practical cost. What a quantum computer breaks is *public-key* cryptography (RSA, elliptic curves) through Shor's algorithm, which is outside the scope of this tool. For something you type by hand and that a slow KDF protects, 80 to 112 bits can be reasonable; that is an explicit choice (`--min-bits`), never the default.

## Limits

- The entropy figure describes the **generation process**. It says nothing about a secret you chose yourself.
- Time estimates depend on rates you supply. They are assumptions, not measurements.
- Secrets live in immutable JavaScript strings: they cannot be reliably erased from memory, and the operating system may write them to swap.
- The web page overwrites the clipboard 30 seconds after you copy, even if you copied something else in the meantime.
- This is not a password manager. It stores nothing.
- There has been no independent security audit.

## Verification

- `npm test` covers the rejection-sampling boundary, statistical uniformity (with a negative control that must reject a biased sampler), exact counting checked against brute force and against a second method, agreement between the reported entropy and the empirical Shannon entropy of the generator, a deterministic fuzz test, the CLI, the word list, and parity between the English and Spanish messages.
- Continuous integration (`.github/workflows/test.yml`) runs the tests on Linux, Windows and macOS with Node 22 and 24, and checks that the project has no dependencies.
- Tested manually on Windows and Linux (CLI and web). The web page was exercised in Chromium; Firefox and Safari have not been tested.
- During development five faults were injected by hand (rejection sampling removed, the minimum check disabled, the inclusion–exclusion sign flipped, the separator check disabled, the biased class sampler restored) and the tests caught all five. This was not automated.

## Project layout

```
exactpass/
├── index.html            web page
├── serve.js              local server (127.0.0.1 only, whitelisted routes)
├── bin/exactpass.js      command line
├── src/                  core
│   ├── rng.js            randomness and unbiased sampling
│   ├── entropy.js        exact counting and estimates
│   ├── generate.js       password, passphrase and key
│   └── i18n.js           English and Spanish messages
├── web/                  app.js, style.css
├── test/                 test suite
└── wordlists/            EFF long word list
```

The core in `src/` is the part to audit. It has no dependencies.

## Word list and licenses

The code is MIT licensed. `wordlists/eff_large_wordlist.txt` is © Electronic Frontier Foundation under CC BY 3.0 US; see [wordlists/README.md](wordlists/README.md). Using a different list is fine: the entropy depends only on the number of unique words.

## Development

This project was developed with the help of Claude (Anthropic) and directed, tested and published by its author. Treat it like any unaudited security code: read `src/`, run the tests, and judge it by what can be verified rather than by who wrote it.

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md).
