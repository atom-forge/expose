# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-11-07

### Added
- Initial package setup: TypeScript sources built with tsup, Bun tests, CI, and releases with `@atom-forge/ship`.
- AtomForge agent instructions (`AGENTS.md`, `AGENTS/`), the documentation skeleton (book, `docs/en`, `docs/hu`, `README-AI.md`), `TODO.md`, and `notes/`.
- The allow-list API: `expose`, `compose`, `fieldsOf` for naming plain fields, and the `View`, `Part`, `Stacked` and `Merge` types. A view that returns anything but a plain object is a compile error. An application gathers its views into a plain `views` object.
- Releases: a tag-triggered publish workflow with npm Trusted Publishing, and public `publishConfig`.
- The documentation of the API: book chapters, English and Hungarian docs, `README.md`, `README-AI.md`, and AI Notes.
