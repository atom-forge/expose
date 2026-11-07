/**
 * Allow-list layer between server data and the client: nothing leaves unless a view names it.
 *
 * A view receives the source row and what the earlier views built, and returns only its own part. Later parts
 * overwrite earlier keys; a view that wants to add to a key reads it from `output` and marks it `Stacked`.
 * Never spread `source` in a view: that would let every column out.
 */
export type View<S, O, R extends Part> = (source: S, output: Readonly<O>) => R;

/**
 * What a view may return: a plain object. The run-time merge is an object spread, so a promise would lose its data and
 * an array or a string would become numbered keys. Only symbol keys are excluded, so no field name can collide.
 */
export type Part = object & {
	readonly [Symbol.iterator]?: never; // arrays, maps, sets
	readonly [Symbol.toStringTag]?: never; // promises
	readonly [Symbol.hasInstance]?: never; // functions
	readonly [Symbol.toPrimitive]?: never; // dates
};

declare const stacked: unique symbol;
/** Marks a key that adds to the earlier value instead of replacing it; the view does the adding with `output`. */
export type Stacked<T> = T & { readonly [stacked]?: true };

/** The keys of `B` overwrite the keys of `A`, as the merge at run time does; `Stacked` keys add up. */
export type Merge<A, B> = {
	[K in keyof A | keyof B]: K extends keyof B
		? K extends keyof A ? (typeof stacked extends keyof B[K] ? A[K] & B[K] : B[K]) : B[K]
		: K extends keyof A ? A[K] : never;
};

type Nullish<S> = null extends S ? null : undefined extends S ? null : never;

function run(source: any, views: View<any, any, any>[], start: any) {
	let output = start;
	for (const view of views) output = { ...output, ...view(source, Object.freeze(output)) };
	return output;
}

/** Builds the output of a row (null and undefined become null, so an optional relation needs no check at the call). */
export function expose<S, A extends Part>(source: S, a: View<NonNullable<S>, {}, A>): A | Nullish<S>;
export function expose<S, A extends Part, B extends Part>(source: S, a: View<NonNullable<S>, {}, A>, b: View<NonNullable<S>, A, B>): Merge<A, B> | Nullish<S>;
export function expose<S, A extends Part, B extends Part, C extends Part>(source: S, a: View<NonNullable<S>, {}, A>, b: View<NonNullable<S>, A, B>, c: View<NonNullable<S>, Merge<A, B>, C>): Merge<Merge<A, B>, C> | Nullish<S>;
export function expose<S, A extends Part, B extends Part, C extends Part, D extends Part>(source: S, a: View<NonNullable<S>, {}, A>, b: View<NonNullable<S>, A, B>, c: View<NonNullable<S>, Merge<A, B>, C>, d: View<NonNullable<S>, Merge<Merge<A, B>, C>, D>): Merge<Merge<Merge<A, B>, C>, D> | Nullish<S>;
export function expose(source: any, ...views: View<any, any, any>[]) {
	return source === null || source === undefined ? null : run(source, views, {});
}

/** Names a combination of views; the result is a view itself. */
export function compose<S1, A extends Part, S2, B extends Part>(a: View<S1, {}, A>, b: View<S2, A, B>): View<S1 & S2, {}, Merge<A, B>>;
export function compose<S1, A extends Part, S2, B extends Part, S3, C extends Part>(a: View<S1, {}, A>, b: View<S2, A, B>, c: View<S3, Merge<A, B>, C>): View<S1 & S2 & S3, {}, Merge<Merge<A, B>, C>>;
export function compose(...views: View<any, any, any>[]) {
	return (source: any, output: any) => run(source, views, output);
}

/**
 * Makes a view factory for an entity: `S` lists the fields that may go out by name, the factory takes the names.
 * The list exists only in the types: never pass it names from a request, and leave objects off `S`.
 */
export function fieldsOf<S>() {
	return <K extends keyof S>(...names: K[]) =>
		(source: Pick<S, K>): Pick<S, K> => {
			const picked = {} as Pick<S, K>;
			for (const name of names) picked[name] = source[name];
			return picked;
		};
}
