---
name: EAS monorepo installs
description: Non-obvious dependency-install behavior for the Expo app's EAS builds.
---

EAS treats the Expo app as part of the pnpm workspace when the workspace manifest and root pnpm lockfile are included in the build archive. Its frozen install validates the app importer in the root lockfile, so a nested package-lock.json cannot repair a stale pnpm-lock.yaml.

**Why:** A successful build previously used npm, while later failures switched to pnpm and stopped before Android compilation because the root lockfile still referenced a removed workspace dependency.

**How to apply:** Keep the root pnpm lockfile synchronized with every workspace package before an EAS build. Treat nested npm lockfiles and EAS queue delays as separate concerns; do not create a new Expo account for dependency-install failures.