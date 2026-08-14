---
title: Installation
description: Install WreckCheck globally, per project, or run it on demand.
---

# Installation

WreckCheck requires Node.js 20 or later. Use the method that fits how your team works.

## Run on demand

`npx` is the fastest way to use the CLI without adding it to a project:

```sh
npx wreckcheck .
```

Use this for an occasional local review or when you want to check a directory before adding WreckCheck to CI.

## Add it to a project

Install WreckCheck as a development dependency when it belongs in the repository’s repeatable release workflow:

```sh
npm install --save-dev wreckcheck
```

Then add a script to `package.json`:

```json
{
  "scripts": {
    "release:check": "wreckcheck --ci"
  }
}
```

Run it with your package manager:

```sh
npm run release:check
```

## Install globally

For a command available in every local checkout:

```sh
npm install --global wreckcheck
wreckcheck .
```

## Verify the install

Run a scan in a small project directory. A terminal report should identify the project and end with a ship-readiness score. If WreckCheck cannot find a Node package manager for dependency auditing, it still runs the checks that apply; it simply skips npm/pnpm audit.

Next, learn how to use [CI mode and machine-readable output](/usage).
