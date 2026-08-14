---
title: Getting started
description: Run your first WreckCheck scan and understand the release verdict.
---

# Getting started

WreckCheck looks for the conditions that commonly turn an ordinary deployment into a release incident: exposed credentials, unsafe environment files, vulnerable dependencies, risky Docker settings, and missing or failing release checks.

It scans a project directory and produces a score, a risk level, and actionable findings. The scan stays on your machine; WreckCheck does not send project files anywhere.

## Your first scan

From the root of a project, run:

```sh
npx wreckcheck .
```

You can also scan a different directory:

```sh
npx wreckcheck ./services/api
```

The terminal report begins with project detection, then gives the release verdict and groups active findings by severity.

```text
SHIP READINESS

           84 / 100

           ✓ SAFE TO SHIP
```

## Read the verdict

WreckCheck derives the score and risk level from findings that are active under your policy. Ignored findings remain visible in reports, but do not affect the verdict or CI exit code.

| Verdict | Trigger | What to do |
| --- | --- | --- |
| `✓ SAFE TO SHIP` | Only low or info findings, or none | Ship with the usual review process. |
| `⚠ REVIEW BEFORE SHIPPING` | At least one medium finding | Resolve or explicitly accept the risk before release. |
| `⚠ HIGH RISK` | At least one high finding | Treat the release as at risk and fix the blocker. |
| `✖ BLOCKED` | At least one critical finding | Do not ship before remediation and any needed credential rotation. |

## What happens in a scan

1. WreckCheck discovers basic project facts: language, package manager, framework, Git, and Docker usage.
2. The checks inspect the working tree concurrently.
3. Findings are filtered through `.wreckcheck.yml`, scored, and rendered for the terminal or CI.

For the full catalog, see [Checks](/checks). For a release pipeline, continue to [Usage](/usage).

::: warning Verification executes project commands
In the current release, the verification check runs for recognized projects even without `--verify`. A Node project can therefore run its `lint`, `test`, and `build` scripts; Go, Rust, and Python projects have analogous commands. Scan only code you trust until this behavior is made properly opt-in.
:::
