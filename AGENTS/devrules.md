# Development rules

Development rules of this package. Unlike `AGENTS/changelog.md` and `AGENTS/documentation.md`, this file is not shared with other AtomForge packages.

## General

- Keep changes focused and consistent with the existing code style. Edit the sources, never generated output.
- Preserve the public API and its behavior unless a breaking change is explicitly requested. A change that may require action from users is breaking: follow `AGENTS/changelog.md` and the *Upgrading chapter* rules in `AGENTS/documentation.md`.
- A change to the public API or its behavior is also a documentation change: update the documentation in the same task, following `AGENTS/documentation.md`.
- Before finishing, run the checks listed below and report what passed or failed.
- Only commit, push, or publish when asked.

## Project

- Source: `src/index.ts` is the package entry point. Tests: `src/*.test.ts`, run with Bun. `dist/` is built with tsup.
- Test: `bun test` · Typecheck: `bun run typecheck` · Build: `bun run build`
- Release with Ship (`@atom-forge/ship`): `bun run pub <patch|minor|major>` · Verify: `bun run pub-check`. The checks that must pass before publishing are listed in `ship.verify` in `package.json`.
