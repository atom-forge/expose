---
type: chapter
---
# Views

A view has the shape `(source, output) => ownPart`. `source` is the row, and `output` is what the earlier views have built. The view returns only its own part; `expose` does the merging.

## Naming fields with `fieldsOf`

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

## Later views overwrite

The parts merge from left to right, so a later key replaces an earlier one, in the types as well:

```ts
const output = expose(row, identity, () => ({ name: 'Anonymous' }));
// { id: 'u1', name: 'Anonymous' }
```

## Reading the earlier output

A view can build on what is already there. `output` is frozen, so a view cannot change it in place:

```ts
const label = (_source: unknown, output: Readonly<{ name: string; email: string }>) => ({
	label: `${output.name} <${output.email}>`,
});

expose(row, identity, contact, label);
```

## Composing views

`compose` names a combination of views. The result is a view, so it can be passed to `expose` or composed further. Its source type requires the fields of all of its views:

```ts
import { compose } from '@atom-forge/expose';

const card = compose(identity, contact);
const output = expose(row, card);
```

A composed view keeps what earlier views built, like any other view.

## Adding to a key with `Stacked`

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
