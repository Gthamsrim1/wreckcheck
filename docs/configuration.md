---
title: Configuration
description: Set release policy thresholds and preserve visibility for accepted risks.
---

# Configuration

Place a `.wreckcheck.yml` file in the project root to decide which findings block CI and which ones are accepted as exceptions.

```yaml
policy:
  # Lowest active severity that causes --ci to fail.
  failOn: high

  # Findings to report separately, but exclude from the score and CI decision.
  ignore:
    - build:missing-lint-script
    - docker:missing-ignore-node-modules
```

`policy:` is optional. The following is equivalent:

```yaml
failOn: high
ignore:
  - build:missing-lint-script
```

## `failOn`

`failOn` is the lowest severity that fails a `--ci` run. The default is `critical`.

| Value | CI fails for |
| --- | --- |
| `critical` | critical findings only |
| `high` | high and critical findings |
| `medium` | medium, high, and critical findings |
| `low` | low or higher findings |
| `info` | every finding |

## `ignore`

`ignore` is a list of stable finding IDs. Ignored findings are not hidden: terminal output puts them in an **Ignored** section, and JSON preserves them under `findings.ignored`. They do not affect the score, risk level, or CI exit code.

```yaml
policy:
  failOn: medium
  ignore:
    - environment:env-mismatch
    - docker:floating-base-image
```

Use an ignore only after recording why the risk is acceptable and setting a date to revisit it. The complete ID catalog is on [Checks](/checks).

## Custom config path

Pass `--config` when policy lives outside the project root. The path is resolved relative to the directory being scanned.

```sh
wreckcheck ./apps/api --config ../../config/release-policy.yml --ci
```

Use `--skip-config` to run with the built-in policy (`failOn: critical`, no ignored IDs):

```sh
wreckcheck . --skip-config --ci
```

## Validation

Configuration is deliberately strict. WreckCheck reports an error for malformed YAML, an unknown `failOn` value, or an `ignore` value that is not a list of strings. A typo cannot silently weaken the policy.

## How scoring works

Every active finding subtracts from a score that starts at 100. The highest severity also caps the score, so one serious issue cannot be masked by an otherwise clean scan.

| Severity | Penalty | Maximum score when present |
| --- | ---: | ---: |
| critical | 15 | 40 |
| high | 8 | 65 |
| medium | 4 | 85 |
| low | 1 | 98 |
| info | 0 | 100 |

The risk level follows the highest active severity: critical is `blocked`, high is `risky`, medium is `review`, and low/info is `safe`.
