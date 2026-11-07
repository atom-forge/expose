<!-- Derived from the book in book/ (https://books.atom-forge.eu). Change the book first, then update this file and docs/hu/index.md. -->

# Expose

`@atom-forge/expose` is a small TypeScript library that decides what leaves the server: nothing goes to the client unless a *view* names it. When a table gets a new column, that column stays on the server until someone adds it to a view, and the compiler knows the exact shape of what went out.

It has no dependencies and works with any database layer or transport, because a view is a plain function.

## Getting started

### Installation

```sh
bun add @atom-forge/expose
```

The package is ESM-only and ships its own type declarations.

### Write a view and build an output

A view receives the source row and returns the part it is responsible for, naming every field. `expose` runs the views on a row and merges what they return:

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

### Naming plain fields

For fields copied as they are, `fieldsOf` saves writing the view by hand. Give it a type that lists what may go out by name, then name the fields at the call:

```ts
import { expose, fieldsOf } from '@atom-forge/expose';

type PublicUser = { id: string; name: string; email: string };
const fields = fieldsOf<PublicUser>();

const output = expose(row, fields('id', 'name'));
// { id: 'u1', name: 'Ada' }
```

### Rows that may be missing

`null` and `undefined` become `null` without running a view, so an optional relation needs no check at the call. The result type includes `null` only when the source type can be missing:

```ts
const author = row as typeof row | null;
const output = expose(author, identity); // { id: string; name: string } | null
```

## Views

A view has the shape `(source, output) => ownPart`. `source` is the row, and `output` is what the earlier views have built. The view returns only its own part; `expose` does the merging.

### Naming fields with `fieldsOf`

`fieldsOf<S>()` makes a view factory for an entity. `S` lists the fields that may go out by name; the factory takes the names and returns a view. Use it for fields copied as they are, and write a view by hand for computed fields and nested data.

```ts
import { expose, fieldsOf } from '@atom-forge/expose';

type PublicUser = { id: string; name: string; email: string };
const fields = fieldsOf<PublicUser>();

const output = expose(row, fields('id', 'name'));
// { id: 'u1', name: 'Ada' }

output.email; // compile error: it was not named
fields('nmae'); // compile error: no such field
fields('passwordHash'); // compile error: it is not on PublicUser
```

The row needs only the named fields, so a query that read just some of the columns fits, and naming a column it did not read is a compile error:

```ts
const partial = { id: 'u1', name: 'Ada' };

expose(partial, fields('id', 'name'));
expose(partial, fields('email')); // compile error: the row has no email
```

The number of names is not limited. The result is a view like any other, so it can be composed and combined with other views:

```ts
expose(row, fields('id', 'name'), contact);
```

The empty call in `fieldsOf<PublicUser>()` is needed because TypeScript cannot take one type argument by hand and infer another.

### Later views overwrite

The parts merge from left to right, so a later key replaces an earlier one, in the types as well:

```ts
const output = expose(row, identity, () => ({ name: 'Anonymous' }));
// { id: 'u1', name: 'Anonymous' }
```

### Reading the earlier output

A view can build on what is already there. `output` is frozen, so a view cannot change it in place:

```ts
const label = (_source: unknown, output: Readonly<{ name: string; email: string }>) => ({
	label: `${output.name} <${output.email}>`,
});

expose(row, identity, contact, label);
```

### Composing views

`compose` names a combination of views. The result is a view, so it can be passed to `expose` or composed further. Its source type requires the fields of all of its views:

```ts
import { compose } from '@atom-forge/expose';

const card = compose(identity, contact);
const output = expose(row, card);
```

A composed view keeps what earlier views built, like any other view.

### Adding to a key with `Stacked`

Sometimes several views contribute to one key, for example when each one picks a few named links. Such a view reads the key from `output`, returns the combined value, and marks it with `Stacked`. The mark tells the types that the key adds up instead of being replaced; the view itself does the adding at run time.

```ts
import { expose, type Stacked } from '@atom-forge/expose';

const links = <N extends string>(...names: N[]) =>
	(source: { links: Record<string, string> }, output: Readonly<Record<string, any>>) => {
		const picked = {} as Partial<Record<N, string>>;
		for (const name of names) if (Object.prototype.hasOwnProperty.call(source.links, name)) picked[name] = source.links[name];
		return { links: { ...output.links, ...picked } as Stacked<Partial<Record<N, string>>> };
	};

const row = { links: { home: 'h', work: 'w', private: 'p' } as Record<string, string> };

const output = expose(row, links('home'), links('work'));
// { links: { home: 'h', work: 'w' } }
// output.links.private; // compile error: it was not named
```

Declare `output` as `Readonly<Record<string, any>>` in such a view, so that it fits after any earlier view.

## Organizing an application

The library knows nothing about your entities. A practical layout keeps the views of each entity in one file and gathers them into a plain `views` object, so every call site reads the same way.

```ts
// server/views/user.ts
import { fieldsOf } from '@atom-forge/expose';

type PublicUser = { id: string; name: string; email: string };

export const fields = fieldsOf<PublicUser>();
export const privateSalary = (source: { salary: number }) => ({ salary: source.salary });
```

```ts
// server/views/index.ts
import * as user from './user';

export const views = { user };
```

```ts
// at a call site
import { expose } from '@atom-forge/expose';
import { views } from '../views';

return rows.map(row => expose(row, views.user.fields('id', 'name')));
```

### Who, and what

Keep two questions apart. The module decides *who* may get the data, with its usual permission check. A view only says *what* goes out, and it cannot check anything about the caller. When a view carries sensitive data, make that visible in its name and call it only after the check:

```ts
assertCanReadSalary(viewer, row); // your own permission check
return expose(row, views.user.fields('id', 'name'), views.user.privateSalary);
```

### Keeping raw rows out

The library cannot stop code from returning a row without calling `expose`. If that matters in your project, add a test that scans the server code for the outputs you want to forbid, with an explicit allow-list for the exceptions.

## API reference

### `expose(source, ...views)`

```ts
function expose<S, A>(source: S, a: View<NonNullable<S>, {}, A>): A | Nullish<S>;
```

Runs the views on `source` from left to right and returns the merged output. It takes one to four views; the signature above shows one. For more, combine some with `compose`.

If `source` is `null` or `undefined`, it returns `null` and runs no view. The result type includes `null` only when the type of `source` allows a missing value.

### `compose(...views)`

```ts
function compose<S1, A, S2, B>(a: View<S1, {}, A>, b: View<S2, A, B>): View<S1 & S2, {}, Merge<A, B>>;
```

Returns a new view that runs the given views in order, on top of the output it receives. It takes two or three views; the signature above shows two. For more, compose a composed view.

### `fieldsOf<S>()`

```ts
function fieldsOf<S>(): <K extends keyof S>(...names: K[]) => (source: Pick<S, K>) => Pick<S, K>;
```

Returns a factory that takes field names of `S` and returns a view copying those fields. The list of allowed fields exists only in the types: at run time the view copies the names it receives.

### `View<S, O, R>`

```ts
type View<S, O, R extends Part> = (source: S, output: Readonly<O>) => R;
```

`S` is the source the view reads, `O` is the output built before it, and `R` is the part it returns. `R` must be a plain object: a promise, an array, a string, a date, a map, a function or a possibly `null` value is a compile error, because it could not be merged.

### `Part`

What a view may return: a plain object. Only symbol keys are excluded, so a field named `then` or `length` is fine.

### `Stacked<T>`

Marks the type of a key that adds to the earlier value instead of replacing it. It affects the types only; the view does the adding with `output`.

### `Merge<A, B>`

The type of merging `B` over `A`: the keys of `B` overwrite the keys of `A`, and `Stacked` keys become `A[K] & B[K]`.

## Pitfalls

The allow-list holds only as far as the views name their fields. These are the things the library cannot check for you.

- **Spreading the source.** `({ ...source })` lets every column out, including those added later. Name each field.
- **Returning a nested object as it is.** `({ author: source.author })` sends the whole `author` row. Run it through its own view: `author: expose(source.author, identity)`.
- **Passing names from a request to `fields`.** The list of allowed fields in `fieldsOf<S>()` exists only in the types. `fields(...request.fields)` with a cast copies whatever the caller asks for. Name the fields in the code.
- **Listing an object in the type of `fieldsOf`.** A field on that type goes out as it is, so an object goes out whole, with every key it gets later. Leave it off and write a view for it.
- **Treating a view as a permission check.** A view says what goes out, not who may get it. Do the permission check before the call.
- **Changing a nested value of `output`.** `output` is frozen only at the top level. A view that writes into `output.links` changes an earlier view's value. Build a new object instead, as in the stacking example.
- **Forgetting the `Stacked` mark.** Without it, the types say the key was replaced even though your view added to it, so the earlier names are missing from the output type.

## Upgrading

0.1.0 is the first published version, so there is nothing to upgrade from yet.
