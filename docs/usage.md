---
title: Usage
description: Use WreckCheck locally, in CI, and with JSON or SARIF output.
---

# Usage

```text
wreckcheck [directory]
```

If no directory is supplied, WreckCheck scans the current directory.

## Command options

| Option | Description |
| --- | --- |
| `--verify` | Marks the scan as verification-enabled. This currently does not change execution behavior; see the note below. |
| `--ci` | Prints JSON and returns a non-zero exit code when the policy fails. |
| `--sarif <file>` | Writes a SARIF 2.1.0 report in either terminal or CI mode. |
| `--config <file>` | Loads a configuration file relative to the scanned directory. |
| `--skip-config` | Uses the default policy and ignores `.wreckcheck.yml`. |

## Local workflow

Use the default report while you are resolving findings:

```sh
wreckcheck .
wreckcheck ./apps/web --sarif wreckcheck.sarif
```

Interactive runs always exit with code `0`. The report is intended to guide a human decision without interrupting local work.

## CI workflow

CI mode emits formatted JSON to standard output and exits with code `1` when any active finding reaches the configured `failOn` severity.

```sh
wreckcheck . --ci --sarif wreckcheck-results.sarif
```

The JSON document includes project detection, resolved configuration, score, risk level, command verification summaries, active and ignored findings, and elapsed scan time.

```json
{
  "score": 84,
  "riskLevel": "safe",
  "findings": {
    "active": [],
    "ignored": []
  }
}
```

## GitHub Actions

The repository ships a GitHub Action that writes a job summary, creates annotations for findings, writes SARIF, and applies the project policy to the job result.

```yaml
- name: Check release readiness
  uses: Gthamsrim1/wreckcheck/packages/action@v0.2.0
  with:
    verify: true

- name: Upload WreckCheck SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: wreckcheck-results.sarif
```

The action writes `wreckcheck-results.sarif` by default. Set `WRECKCHECK_SARIF` to choose a different path.

## Verification behavior

Verification runs only the first adapter that recognizes a project. Commands run without a shell, stop at the first failure, and are capped at two minutes. Captured output is trimmed to keep reports readable.

| Project | Detected by | Commands |
| --- | --- | --- |
| Node.js | `package.json` | available `lint`, `test`, then `build` scripts |
| Go | `go.mod` | `go test ./...`, then `go vet ./...` |
| Rust | `Cargo.toml` | `cargo test`, then `cargo clippy` |
| Python | `pyproject.toml` or `requirements.txt` | `pytest` |

::: warning Current behavior
Although `--verify` and the Action’s `verify` input communicate intent, the current verification check invokes these commands for any recognized project regardless of that setting. Do not run WreckCheck against untrusted code.
:::
