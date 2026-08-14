# wreckcheck

[![npm version](https://img.shields.io/npm/v/wreckcheck.svg)](https://www.npmjs.com/package/wreckcheck)
[![license](https://img.shields.io/npm/l/wreckcheck.svg)](https://www.npmjs.com/package/wreckcheck)

Find what will wreck your release.

WreckCheck scans a project for the things that quietly break a deploy — committed
secrets, an unignored `.env`, vulnerable dependencies, a Dockerfile that ships as
root, a missing build script — and turns them into one verdict on whether the
project is ready to ship.

```
  SHIP READINESS

  62 / 100

   ⚠ HIGH RISK
```

## Install

Run it without installing:

```bash
npx wreckcheck .          # scan the current directory
npx wreckcheck ./my-app   # scan somewhere else
```

Or install it globally:

```bash
npm install -g wreckcheck
wreckcheck
```

Requires Node.js 20 or newer. Nothing is uploaded anywhere — every check runs
locally against the working tree.

## Usage

```
wreckcheck [directory]
```

| Option | Effect |
| --- | --- |
| `--verify` | Also run the project's own build, lint, and test commands. See the note under [Verification](#verification) — these currently run either way |
| `--ci` | Print JSON instead of a report, and exit non-zero when the policy fails. Implies `--verify` |
| `--sarif <file>` | Write a SARIF 2.1.0 report, in either mode |
| `--config <file>` | Use a config file other than `.wreckcheck.yml` |
| `--skip-config` | Ignore the project's config and use the default policy |

Only `--ci` sets an exit code. An interactive run always exits 0 and leaves the
decision to whoever is reading the report.

## What it checks

| Check | Finds |
| --- | --- |
| **Secrets** | AWS access keys, GitHub tokens, Stripe and OpenAI keys, and private keys hard-coded in source |
| **Environment** | A `.env` that is committed or unignored, and variables `.env.example` documents but `.env` does not set |
| **Dependencies** | Known vulnerabilities, via the project's own `npm audit` or `pnpm audit` |
| **Docker** | Secrets in `ENV`/`ARG`, floating base images, no non-root `USER`, and sensitive paths a `COPY .` would pull in |
| **Build** | Missing `build`, `test`, and `lint` scripts |
| **Verification** | The project's own build, lint, and test commands failing or hanging |

The secrets check scans the working tree as it is on disk, not Git history, so a
credential that was committed and later removed is not reported.

## Scoring

Every finding has a severity, and severity drives both numbers in the report.

The **score** starts at 100 and subtracts a penalty per finding — 15 for
critical, 8 for high, 4 for medium, 1 for low. The most severe finding also caps
the score, so a single critical issue holds the project below 40 however clean
the rest of the scan is.

The **risk level** follows the most severe finding on its own:

| Verdict | Meaning |
| --- | --- |
| `✓ SAFE TO SHIP` | Nothing above low severity |
| `⚠ REVIEW BEFORE SHIPPING` | At least one medium finding |
| `⚠ HIGH RISK` | At least one high finding |
| `✖ BLOCKED` | At least one critical finding |

## Configuration

Drop a `.wreckcheck.yml` in the project root:

```yaml
policy:
  # Lowest severity that fails a --ci run. Defaults to critical.
  failOn: high

  # Findings to report but not fail on.
  ignore:
    - build:missing-lint-script
    - docker:missing-ignore-node-modules
```

The keys also work at the top level, without the `policy:` wrapper. A project
with no config file uses the default policy: fail on critical only, ignore
nothing.

Ignored findings are never hidden — they are listed separately in the terminal
report and kept under `findings.ignored` in the JSON, so a suppressed issue
stays visible.

An invalid `failOn` or `ignore` value is an error rather than a fallback, so a
typo cannot silently weaken the policy.

### Finding IDs

The IDs used in `ignore` are stable and safe to pin.

| Category | IDs |
| --- | --- |
| Security | `security:aws-access-key`, `security:github-token`, `security:stripe-secret-key`, `security:openai-api-key`, `security:private-key` |
| Environment | `environment:env-tracked`, `environment:env-not-ignored`, `environment:env-mismatch` |
| Docker | `docker:no-dockerignore`, `docker:missing-ignore-env`, `docker:missing-ignore-env-wildcard`, `docker:missing-ignore-git`, `docker:missing-ignore-node-modules`, `docker:floating-base-image`, `docker:root-user`, `docker:embedded-secret` |
| Build | `build:missing-build-script`, `build:missing-test-script`, `build:missing-lint-script` |
| Dependencies | `dependencies:vulnerability` |
| Verification | `verification:command-failed`, `verification:command-timed-out`, `verification:no-project-adapter`, `verification:missing-script` |

## Verification

With `--verify`, WreckCheck also runs the project's own commands and reports the
ones that fail. The first toolchain that recognises the project wins:

| Adapter | Detected by | Runs |
| --- | --- | --- |
| npm | `package.json` | `lint`, `test`, `build`, stopping at the first failure |
| Go | `go.mod` | `go test ./...`, then `go vet ./...` |
| Rust | `Cargo.toml` | `cargo test`, then `cargo clippy` |
| Python | `pyproject.toml` or `requirements.txt` | `pytest` |

Commands are spawned without a shell and capped at two minutes. On timeout the
whole process group is terminated, so a hung test runner or a dev server cannot
outlive the scan.

This is the one part of WreckCheck that executes project code, which is why it
is meant to be opt-in.

> **Known issue:** verification currently runs on every scan. `ScanContext.verify`
> is set from `--verify` and from the action's `verify` input, but no check reads
> it, so neither flag changes what happens today.

## CI

```bash
wreckcheck --ci --sarif results.sarif
```

CI mode prints JSON — project, config, score, risk level, verification results,
and active plus ignored findings — and exits 1 when any active finding is at
least as severe as `failOn`.

### GitHub Actions

A GitHub Action ships alongside the CLI, so you do not have to install it
yourself:

```yaml
- uses: Gthamsrim1/wreckcheck/packages/action@v0.2.0
  with:
    verify: true

- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: wreckcheck-results.sarif
```

The action writes a job summary, annotates each finding on the diff, and writes
SARIF to `wreckcheck-results.sarif` (override with the `WRECKCHECK_SARIF`
environment variable). It fails the job using the same `.wreckcheck.yml` policy
as the CLI.

## License

BSD-3-Clause