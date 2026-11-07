import { describe, expect, test } from 'bun:test';
import { compose, expose, fieldsOf, type Stacked } from './index.js';

const user = {
	id: 'u1',
	name: 'Test User',
	email: 'a@b.hu',
	passwordHash: 'secret',
	links: { home: 'h', work: 'w', private: 'p' } as Record<string, string>,
};

const identity = (source: { id: string; name: string }) => ({ id: source.id, name: source.name });
const email = (source: { email: string }) => ({ email: source.email });

/** Adds the named links to `links` of the output, next to the ones earlier views added. */
const links = <N extends string>(...names: N[]) =>
	(source: { links: Record<string, string> }, output: Readonly<Record<string, any>>) => {
		const picked = {} as Partial<Record<N, string>>;
		for (const name of names) if (Object.prototype.hasOwnProperty.call(source.links, name)) picked[name] = source.links[name];
		return { links: { ...output.links, ...picked } as Stacked<Partial<Record<N, string>>> };
	};

const card = compose(identity, links('home'));

describe('expose', () => {
	test('only what a view names goes out', () => {
		expect(expose(user, identity)).toEqual({ id: 'u1', name: 'Test User' });
		expect(JSON.stringify(expose(user, identity))).not.toContain('secret');
	});

	test('later keys overwrite earlier ones', () => {
		expect(expose(user, identity, () => ({ name: 'Other' }))).toEqual({ id: 'u1', name: 'Other' });
	});

	test('a view sees the earlier output and cannot change it', () => {
		const seen: unknown[] = [];
		expose(user, identity, (_source, output) => {
			seen.push(output.id);
			expect(() => {
				(output as { id: string }).id = 'x';
			}).toThrow();
			return {};
		});
		expect(seen).toEqual(['u1']);
	});

	test('null and undefined become null, without running a view', () => {
		const view = () => {
			throw new Error('must not run');
		};
		expect(expose(null as typeof user | null, view)).toBeNull();
		expect(expose(undefined as typeof user | undefined, view)).toBeNull();
	});

	test('falsy rows that are not null still run', () => {
		expect(expose(0, source => ({ value: source }))).toEqual({ value: 0 });
	});

	test('it takes four views', () => {
		const out = expose(user, identity, email, () => ({ a: 1 }), () => ({ b: 2 }));
		expect(out).toEqual({ id: 'u1', name: 'Test User', email: 'a@b.hu', a: 1, b: 2 });
	});
});

describe('compose', () => {
	test('composed views build on each other', () => {
		const out = expose(user, compose(identity, email, (_source, output) => ({ label: `${output.name} <${output.email}>` })));
		expect(out.label).toBe('Test User <a@b.hu>');
		expect(out).not.toHaveProperty('passwordHash');
	});

	test('a composed view keeps what earlier views built', () => {
		const out = expose(user, links('work'), card);
		expect(out.links).toEqual({ work: 'w', home: 'h' });
	});

	test('a composed view can be composed further', () => {
		const out = expose(user, compose(card, email));
		expect(Object.keys(out).sort()).toEqual(['email', 'id', 'links', 'name']);
	});
});

test('views gathered in a plain object work at the call', () => {
	const views = { user: { identity, avatar: links('home') } };
	const out = expose(user, views.user.identity, views.user.avatar);
	expect(out).toEqual({ id: 'u1', name: 'Test User', links: { home: 'h' } });
});

describe('Stacked', () => {
	test('stacked views add up, and a missing name is left out', () => {
		const out = expose(user, card, links('work', 'missing'));
		expect(out.links).toEqual({ home: 'h', work: 'w' });
	});

	test('an inherited name is not picked', () => {
		const out = expose(user, links('toString'));
		expect(Object.keys(out.links)).toEqual([]);
	});

	test('a view that does not stack replaces the key', () => {
		const out = expose(user, card, () => ({ links: {} }));
		expect(out.links).toEqual({});
	});
});

describe('fieldsOf', () => {
	const fields = fieldsOf<{ id: string; name: string; email: string; phone: string | null; fax: string; city: string }>();
	const row = { id: 'u1', name: 'Ada', email: 'a@b', phone: null, fax: 'f', city: 'c', passwordHash: 'secret' };

	test('only the named fields go out', () => {
		expect(expose(row, fields('name', 'id'))).toEqual({ name: 'Ada', id: 'u1' });
	});

	test('the row needs only the named fields', () => {
		expect(expose({ id: 'u1', name: 'Ada' }, fields('id', 'name'))).toEqual({ id: 'u1', name: 'Ada' });
	});

	test('the number of names is not limited', () => {
		expect(Object.keys(expose(row, fields('id', 'name', 'email', 'phone', 'fax', 'city')))).toEqual(['id', 'name', 'email', 'phone', 'fax', 'city']);
	});

	test('it combines with other views and in compose', () => {
		const out = { id: 'u1', mail: 'a@b' };
		const mail = (source: { email: string }) => ({ mail: source.email });
		expect(expose(row, fields('id'), mail)).toEqual(out);
		expect(expose(row, compose(fields('id'), mail))).toEqual(out);
	});

	test('a missing row stays null', () => {
		expect(expose(null as typeof row | null, fields('id'))).toBeNull();
	});
});

interface Declared {
	id: string;
}

// Compile-time checks: `bun run typecheck` fails if one of these stops being an error.
export function typeChecks() {
	const out = expose(user, card);
	const name: string = out.name;
	const home = out.links.home;
	// @ts-expect-error The password is not on the output.
	out.passwordHash;
	// @ts-expect-error This link was not named.
	out.links.work;
	// @ts-expect-error The row was read without the field a view needs.
	expose({ id: 'x' }, identity);
	const nullable = expose(user as typeof user | null, identity);
	// @ts-expect-error The result may be null.
	nullable.id;
	const stackedUp = expose(user, card, links('work'));
	const work = stackedUp.links.work;
	const stillHome = stackedUp.links.home;
	const replaced = expose(user, card, () => ({ links: {} }));
	// @ts-expect-error A plain `{}` replaces the earlier value: it is not stacked.
	replaced.links.home;
	const overwritten = expose(user, identity, () => ({ name: 1 }));
	const count: number = overwritten.name;
	const fields = fieldsOf<{ id: string; name: string; phone: string | null }>();
	const named = expose({ id: 'x', name: 'y', phone: null, secret: 'z' }, fields('id', 'phone'));
	const id: string = named.id;
	const phone: string | null = named.phone;
	// @ts-expect-error This field was not named.
	named.name;
	// @ts-expect-error No such field.
	fields('nmae');
	// @ts-expect-error The field is not on the allowed type.
	fields('secret');
	// @ts-expect-error The row was read without the named field.
	expose({ id: 'x' }, fields('name'));
	// @ts-expect-error The type of the column does not fit.
	expose({ name: 1 }, fields('name'));
	// @ts-expect-error A promise would lose its data.
	expose(user, async () => ({ a: 1 }));
	// @ts-expect-error An array would become numbered keys.
	expose(user, () => ['a']);
	// @ts-expect-error A string would become numbered keys.
	expose(user, () => 'a');
	// @ts-expect-error A number has nothing to merge.
	expose(user, () => 1);
	// @ts-expect-error A date has nothing to merge.
	expose(user, () => new Date());
	// @ts-expect-error A map has nothing to merge.
	expose(user, () => new Map<string, string>());
	// @ts-expect-error A function has nothing to merge.
	expose(user, () => () => 1);
	// @ts-expect-error Nothing returned.
	expose(user, () => {});
	// @ts-expect-error null has nothing to merge.
	expose(user, () => (user.id ? { a: 1 } : null));
	// @ts-expect-error It is checked in every position.
	expose(user, identity, async () => ({ a: 1 }));
	// @ts-expect-error It is checked in compose too.
	compose(identity, async () => ({ a: 1 }));
	const collidingNames = expose(user, () => ({ then: 'x', call: 'y', length: 1, iterator: 'z' }));
	const thenField: string = collidingNames.then;
	const either = expose(user, () => (user.id ? { a: 1 } : {}));
	const empty = expose(user, () => ({}));
	const declared = expose(user, (source): Declared => ({ id: source.id }));
	const label = (_source: unknown, output: Readonly<{ name: string }>) => ({ label: output.name });
	const labelled: string = expose({ name: 'y' }, fields('name'), label).label;
	// @ts-expect-error `name` is not built yet when `label` runs.
	expose({ name: 'y' }, label, fields('name'));
	return { name, home, work, stillHome, count, id, phone, labelled, thenField, either, empty, declared };
}
