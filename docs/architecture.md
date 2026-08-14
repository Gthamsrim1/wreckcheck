---
title: Architecture
description: Understand the packages and data flow behind a WreckCheck scan.
---

# Architecture

WreckCheck is a pnpm workspace built around a small, reusable scan core. The published `wreckcheck` CLI composes the internal packages; checks and reporters can also be used directly by integrations inside the workspace.

## Packages

| Package | Responsibility |
| --- | --- |
| `@wreckcheck/core` | Project discovery, scanning orchestration, config and policy, scoring, IDs, fingerprints, and verification adapters. |
| `@wreckcheck/checks` | Secrets, environment, dependencies, Docker, build, and verification checks. |
| `@wreckcheck/reporter` | Terminal, JSON, SARIF, and GitHub job-summary renderers. |
| `wreckcheck` | The public command-line interface. |
| `@wreckcheck/action` | GitHub Action wrapper that writes summaries, annotations, SARIF, and job status. |

## Scan flow

```text
CLI or GitHub Action
         │
         ├── loadConfig() ──► policy: failOn + ignored IDs
         │
         └── scan(rootDir, checks)
                    │
                    ├── discoverProject()
                    │
                    └── run checks concurrently
                            │
                            ▼
                    ScanResult
                       ├── findings
                       ├── verification results
                       └── project metadata
                            │
                            ▼
                policy filter → score + risk level → reporter
```

The scanner isolates checks from each other: if one throws, its error is written to standard error and the remaining checks still contribute results. Findings use stable IDs so policy and downstream automation can target them safely.

## Policy and reporting

The scanner returns all findings. Reporters apply the policy by splitting them into active and ignored groups. Only active findings influence the score, risk level, and `shouldFail()` decision. SARIF intentionally renders the supplied findings directly, while terminal and JSON reporting preserve the active/ignored distinction.

## Project discovery

Before checks run, `discoverProject()` infers:

- package manager from a root lockfile (`pnpm`, Yarn, Bun, or npm);
- language from TypeScript/JavaScript configuration;
- a recognized framework from `package.json` dependencies;
- whether the project has Git metadata or Docker configuration.

That context lets a check choose the correct audit command and lets reporters make the scan intelligible at a glance.

## Extending WreckCheck

A check implements the `Check` interface from `@wreckcheck/core`: it has an ID, a name, a category, and an async `run(context)` method that returns findings and duration. Add it to the `checks` array in `@wreckcheck/checks` to include it in the standard scan.

Reporters receive a `ScanResult` and, where policy-aware, a `WreckCheckConfig`. This keeps detection logic separate from presentation and makes it straightforward to add another output format.

For the exported interfaces and functions, see the [API reference](/api/).
