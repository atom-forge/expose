# AI README: @atom-forge/expose

A typed allow-list layer between server data and the client: nothing goes out unless a *view* names it. Use it when a server returns database rows to a client. It has no dependencies and works with any database layer or transport.

The [documentation](./docs/en/index.md) is authoritative where the two disagree; see [README.md](./README.md) for installation.

## Rules

- Copy plain fields with `fieldsOf`; write a view by hand for computed fields and nested data.
- A view names every field it returns. Never spread `source`, and never return a nested row as it is: run it through its own view.
- A view says *what* goes out, not *who* may get it. Do the permission check before the call.
- A view is synchronous and returns a plain object; anything else is a compile error.
- A later view overwrites earlier keys. To add to a key instead, read it from `output`, build a new value, and mark it `Stacked`.
- `output` is frozen only at the top level: do not write into its nested values.
- The allowed list of `fieldsOf<S>()` exists only in the types: never pass it names from a request, and leave objects off `S`.

## API

```ts
type View<S, O, R extends Part> = (source: S, output: Readonly<O>) => R;
type Part;          // a plain object: promises, arrays, strings, dates, maps and functions are compile errors
type Stacked<T>;    // marks a key that adds up; types only, the view does the adding
type Merge<A, B>;   // keys of B overwrite keys of A; Stacked keys become A[K] & B[K]

// 1–4 views. null and undefined become null without running a view;
// the result type includes null only if the type of source allows it.
function expose(source, a, b?, c?, d?): Output | null;

// 2–3 views. The result is a view; its source type requires the fields of all its views.
// For more views than the limit, compose a composed view.
function compose(a, b, c?): View;

// Any number of names of S. The row needs only the named fields.
function fieldsOf<S>(): <K extends keyof S>(...names: K[]) => (source: Pick<S, K>) => Pick<S, K>;
```

## Minimal example

```ts
import { compose, expose } from '@atom-forge/expose';

const identity = (source: { id: string; name: string }) => ({
	id: source.id,
	name: source.name,
});
const contact = (source: { email: string }) => ({ email: source.email });
const card = compose(identity, contact);

const row = { id: 'u1', name: 'Ada', email: 'ada@example.com', passwordHash: 'secret' };

const output = expose(row, card);
// { id: 'u1', name: 'Ada', email: 'ada@example.com' }; passwordHash is not on the type either
```

## Common extensions

Name plain fields with `fieldsOf`, and gather an application's views into a plain `views` object, with the views per entity in their own files:

```ts
export const fields = fieldsOf<{ id: string; name: string; email: string }>(); // server/views/user.ts
export const views = { user }; // import * as user from './user'
return rows.map(row => expose(row, views.user.fields('id', 'name')));
```

A view that adds to a key:

```ts
const links = <N extends string>(...names: N[]) =>
	(source: { links: Record<string, string> }, output: Readonly<Record<string, any>>) => {
		const picked = {} as Partial<Record<N, string>>;
		for (const name of names) if (Object.prototype.hasOwnProperty.call(source.links, name)) picked[name] = source.links[name];
		return { links: { ...output.links, ...picked } as Stacked<Partial<Record<N, string>>> };
	};
```

Type its `output` as `Readonly<Record<string, any>>`, so it fits after any earlier view.

## Pitfalls

- The library cannot stop code from returning a row without calling it; a project that needs this adds its own guard test.
- Without the `Stacked` mark, the types say the key was replaced, even though the view added to it.

## Documentation map

[`docs/en/index.md`](./docs/en/index.md) covers getting started, views, organizing an application, the API reference, the pitfalls, and upgrading. The Hungarian translation is [`docs/hu/index.md`](./docs/hu/index.md).
