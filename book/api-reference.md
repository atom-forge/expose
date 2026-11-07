---
type: chapter
---
# API reference

## `expose(source, ...views)`

```ts
function expose<S, A>(source: S, a: View<NonNullable<S>, {}, A>): A | Nullish<S>;
```

Runs the views on `source` from left to right and returns the merged output. It takes one to four views; the signature above shows one. For more, combine some with `compose`.

If `source` is `null` or `undefined`, it returns `null` and runs no view. The result type includes `null` only when the type of `source` allows a missing value.

## `compose(...views)`

```ts
function compose<S1, A, S2, B>(a: View<S1, {}, A>, b: View<S2, A, B>): View<S1 & S2, {}, Merge<A, B>>;
```

Returns a new view that runs the given views in order, on top of the output it receives. It takes two or three views; the signature above shows two. For more, compose a composed view.

## `fieldsOf<S>()`

```ts
function fieldsOf<S>(): <K extends keyof S>(...names: K[]) => (source: Pick<S, K>) => Pick<S, K>;
```

Returns a factory that takes field names of `S` and returns a view copying those fields. The list of allowed fields exists only in the types: at run time the view copies the names it receives.

## `View<S, O, R>`

```ts
type View<S, O, R> = (source: S, output: Readonly<O>) => R;
```

`S` is the source the view reads, `O` is the output built before it, and `R` is the part it returns. `R` must be a plain object, returned synchronously.

## `Stacked<T>`

Marks the type of a key that adds to the earlier value instead of replacing it. It affects the types only; the view does the adding with `output`.

## `Merge<A, B>`

The type of merging `B` over `A`: the keys of `B` overwrite the keys of `A`, and `Stacked` keys become `A[K] & B[K]`.
