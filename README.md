# @atom-forge/expose

A typed allow-list layer between server data and the client: nothing goes out unless a *view* names it, so a new column stays on the server by default.

For coding assistants, see [README-AI.md](./README-AI.md).

## Installation

```bash
bun add @atom-forge/expose
```

## Example

```ts
import { compose, expose } from '@atom-forge/expose';

const identity = (source: { id: string; name: string }) => ({ id: source.id, name: source.name });
const contact = (source: { email: string }) => ({ email: source.email });
const card = compose(identity, contact);

const row = { id: 'u1', name: 'Ada', email: 'ada@example.com', passwordHash: 'secret' };

expose(row, card);
// { id: 'u1', name: 'Ada', email: 'ada@example.com' }
```

## Documentation

- [The Expose book](https://books.atom-forge.eu) — the full documentation as a multi-page book.
- [English documentation](docs/en/index.md) ([magyarul](docs/hu/index.md)) — the same documentation shipped with the package, including the upgrade notes.
- [AI guide](README-AI.md) — the entry point for coding agents using the package.
