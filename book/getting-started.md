---
type: chapter
---
# Getting started

## Installation

```sh
bun add @atom-forge/expose
```

The package is ESM-only and ships its own type declarations.

## Write a view

A view is a function that receives the source row and returns the part it is responsible for. It names every field it returns:

```ts
const identity = (source: { id: string; name: string }) => ({
	id: source.id,
	name: source.name,
});
```

## Build an output

`expose` runs the views on a row and merges what they return:

```ts
import { expose } from '@atom-forge/expose';

const identity = (source: { id: string; name: string }) => ({
	id: source.id,
	name: source.name,
});
const contact = (source: { email: string }) => ({ email: source.email });

const row = { id: 'u1', name: 'Ada', email: 'ada@example.com', passwordHash: 'secret' };

const output = expose(row, identity, contact);
// { id: 'u1', name: 'Ada', email: 'ada@example.com' }

output.email; // string
// output.passwordHash; // compile error: it is not on the output
```

`passwordHash` stays on the server because no view names it. The same holds for any column added to the table later.

## Naming plain fields

For fields copied as they are, `fieldsOf` saves writing the view by hand. Give it a type that lists what may go out by name, then name the fields at the call:

```ts
import { expose, fieldsOf } from '@atom-forge/expose';

type PublicUser = { id: string; name: string; email: string };
const fields = fieldsOf<PublicUser>();

const output = expose(row, fields('id', 'name'));
// { id: 'u1', name: 'Ada' }
```

## Rows that may be missing

`null` and `undefined` become `null` without running a view, so an optional relation needs no check at the call. The result type includes `null` only when the source type can be missing:

```ts
const author = row as typeof row | null;
const output = expose(author, identity); // { id: string; name: string } | null
```

Continue with [[views|Views]].
