---
type: chapter
---
# Pitfalls

The allow-list holds only as far as the views name their fields. These are the things the library cannot check for you.

> [!danger] Spreading the source
> ```ts
> const bad = (source: User) => ({ ...source });
> ```
> This lets every column out, including those added later. Name each field.

> [!danger] Returning a nested object as it is
> ```ts
> const bad = (source: Post) => ({ author: source.author });
> ```
> The whole `author` row goes out. Run it through its own view: `author: expose(source.author, identity)`.

> [!danger] Passing names from a request to `fields`
> The list of allowed fields in `fieldsOf<S>()` exists only in the types. `fields(...request.fields)` with a cast copies whatever the caller asks for. Name the fields in the code.

> [!danger] Listing an object in the type of `fieldsOf`
> A field on that type goes out as it is, so an object goes out whole, with every key it gets later. Leave it off and write a view for it.

> [!warning] Treating a view as a permission check
> A view says what goes out, not who may get it. Do the permission check before the call.

> [!warning] Changing a nested value of `output`
> `output` is frozen only at the top level. A view that writes into `output.links` changes an earlier view's value. Build a new object instead, as in the stacking example of [[views|Views]].

> [!bug] Forgetting the `Stacked` mark
> Without it, the types say the key was replaced even though your view added to it, so the earlier names are missing from the output type.
