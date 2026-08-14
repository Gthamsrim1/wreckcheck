---
title: Checks
description: What WreckCheck checks before a release and how each finding is classified.
---

# Checks

WreckCheck evaluates six release-risk areas. Checks run concurrently, and one check error does not suppress results from the others.

## Secrets

The secret scanner examines files in the working tree for provider-specific credential shapes. It skips `.git`, dependencies, common build output directories, coverage, and files larger than 1 MiB. It reports file and line information, but never includes the matched secret value.

| Finds | Severity | Finding ID |
| --- | --- | --- |
| AWS access keys | critical | `security:aws-access-key` |
| GitHub tokens | critical | `security:github-token` |
| Stripe secret keys | critical | `security:stripe-secret-key` |
| OpenAI API keys | critical | `security:openai-api-key` |
| PEM, EC, and OpenSSH private keys | critical | `security:private-key` |

The scan covers files as they exist now. A credential removed from the working tree but still present in Git history is outside this check’s scope.

## Environment files

When a `.env` file is present, WreckCheck checks Git tracking and ignore rules. If both `.env` and `.env.example` exist, it also reports variables documented in the example but missing from the actual environment file.

| Condition | Severity | Finding ID |
| --- | --- | --- |
| `.env` is tracked by Git | critical | `environment:env-tracked` |
| `.env` is not ignored | high | `environment:env-not-ignored` |
| `.env.example` variables are missing from `.env` | medium | `environment:env-mismatch` |

## Dependencies

For npm and pnpm projects, WreckCheck delegates vulnerability discovery to the project’s own `npm audit --json` or `pnpm audit --json`. npm findings include installed version, fixed version when available, direct/transitive status, and advisory links. Yarn and Bun audit support is not available yet.

| Condition | Severity | Finding ID |
| --- | --- | --- |
| Known dependency vulnerability | from the audit advisory | `dependencies:vulnerability` |

## Docker

Docker checks apply when a root-level `Dockerfile` exists. WreckCheck parses it once and evaluates the build configuration against several safety rules.

| Condition | Severity | Finding ID |
| --- | --- | --- |
| Hard-coded secret in `ENV` or `ARG` | critical | `docker:embedded-secret` |
| Sensitive `.env` or `.env.*` path included by `COPY .` | high | `docker:missing-ignore-env`, `docker:missing-ignore-env-wildcard` |
| Missing `.dockerignore` with `COPY .` | medium | `docker:no-dockerignore` |
| Floating base image or no `USER` instruction | medium | `docker:floating-base-image`, `docker:root-user` |
| `.git` not excluded from context | medium | `docker:missing-ignore-git` |
| `node_modules` not excluded from context | low | `docker:missing-ignore-node-modules` |

A base image is considered floating when it has no tag, uses `latest`, or uses a partial numeric version such as `20` or `20.1`. Exact tags and digest-pinned images are accepted.

## Build configuration

For Node.js projects, WreckCheck checks the release scripts declared in `package.json`.

| Missing script | Severity | Finding ID |
| --- | --- | --- |
| `build` | medium | `build:missing-build-script` |
| `test` | medium | `build:missing-test-script` |
| `lint` | low | `build:missing-lint-script` |

## Verification

Verification converts a failing or timed-out project command into a high-severity finding. The command result itself is also included in terminal and JSON output.

| Condition | Severity | Finding ID |
| --- | --- | --- |
| A verification command fails | high | `verification:command-failed` |
| A verification command exceeds two minutes | high | `verification:command-timed-out` |

See [Usage](/usage#verification-behavior) for adapters and execution details.
