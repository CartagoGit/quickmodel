// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * Svelte 5 Integration Patterns — QuickModel
 *
 * Verifies QuickModel patterns as used in Svelte 5 / SvelteKit apps.
 * No Svelte packages imported — pure TypeScript logic only.
 *
 * Key patterns:
 * - Svelte 5 runes ($state, $derived) simulation
 * - Svelte stores (writable/readable) simulation
 * - SvelteKit form actions: server-side form coercion + validation
 * - SvelteKit load function: createMany() for SSR data
 * - diff() for change detection (Svelte reactive updates)
 */
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QComputed, QField } from '@/decorators';
import { $qCheckRules } from '@/core/helpers/q-check-rules';
import { $qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';

// ---------------------------------------------------------------------------
// 1. Svelte 5 runes simulation — $state wrapping QModel
// ---------------------------------------------------------------------------

// Simulate Svelte 5 $state rune: a mutable reactive cell
class SvelteState<TVal> {
	private _value: TVal;
	constructor(initial: TVal) {
		this._value = initial;
	}
	get current(): TVal {
		return this._value;
	}
	set current(val: TVal) {
		this._value = val;
	}
}

// Simulate Svelte 5 $derived rune: computed from other state
class SwelteDerived<TVal> {
	private computeFn: () => TVal;
	constructor(computeFn: () => TVal) {
		this.computeFn = computeFn;
	}
	get current(): TVal {
		return this.computeFn();
	}
}

interface INote {
	id: string;
	title: string;
	body: string;
	pinned: boolean;
	createdAt: Date;
}

@Quick(
	{
		id: 'string',
		title: 'string',
		body: 'string',
		pinned: 'boolean',
		createdAt: Date,
	},
	{ unknownPropertyPolicy: 'strip' }
)
class NoteModel extends QModel<INote> {
	declare id: string;
	declare title: string;
	declare body: string;
	declare pinned: boolean;
	declare createdAt: Date;

	@QComputed()
	get preview(): string {
		return this.body.slice(0, 60);
	}

	@QComputed()
	get charCount(): number {
		return this.body.length;
	}
}

describe('Svelte 5 — runes ($state / $derived) simulation', () => {
	test('$state holds a QModel and exposes its properties', () => {
		const note = new SvelteState(
			new NoteModel({
				id: 'n1',
				title: 'Hello Svelte',
				body: 'Svelte 5 is fast',
				pinned: false,
				createdAt: new Date(),
			})
		);
		expect(note.current.title).toBe('Hello Svelte');
	});

	test('$derived recomputes when $state model changes via merge()', () => {
		const note = new SvelteState(
			new NoteModel({
				id: 'n2',
				title: 'Draft',
				body: 'Initial body',
				pinned: false,
				createdAt: new Date(),
			})
		);
		const preview = new SwelteDerived(
			() =>
				(note.current.$qSerialize() as Record<string, unknown>)[
					'preview'
				] as string
		);
		expect(preview.current).toBe('Initial body');
		// Update via immutable merge — re-assign state
		note.current = note.current.$qCopy({ body: 'Updated body content' });
		expect(preview.current).toBe('Updated body content');
	});

	test('$derived charCount updates after merge()', () => {
		const note = new SvelteState(
			new NoteModel({
				id: 'n3',
				title: 'Count',
				body: 'abc',
				pinned: false,
				createdAt: new Date(),
			})
		);
		const charCount = new SwelteDerived(
			() =>
				(note.current.$qSerialize() as Record<string, unknown>)[
					'charCount'
				] as number
		);
		expect(charCount.current).toBe(3);
		note.current = note.current.$qCopy({ body: 'abcdef' });
		expect(charCount.current).toBe(6);
	});

	test('pinned toggle via merge()', () => {
		const state = new SvelteState(
			new NoteModel({
				id: 'n4',
				title: 'Toggle',
				body: 'body',
				pinned: false,
				createdAt: new Date(),
			})
		);
		expect(state.current.pinned).toBe(false);
		state.current = state.current.$qCopy({ pinned: true });
		expect(state.current.pinned).toBe(true);
	});

	test('getSchema() returns json schema for the model', () => {
		const note = new NoteModel({
			id: 'n5',
			title: 'Schema',
			body: 'body',
			pinned: false,
			createdAt: new Date(),
		});
		const schema = note.$qGetSchema('json');
		expect(schema).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// 2. Svelte store simulation (writable/readable)
// ---------------------------------------------------------------------------

// Simulate Svelte writable store
class WriteableStore<TVal> {
	private _value: TVal;
	private subscribers: Array<(val: TVal) => void> = [];

	constructor(initial: TVal) {
		this._value = initial;
	}

	subscribe(sub: (val: TVal) => void): () => void {
		this.subscribers.push(sub);
		sub(this._value); // immediate emit
		return () => {
			this.subscribers = this.subscribers.filter(
				(listener) => listener !== sub
			);
		};
	}

	set(val: TVal): void {
		this._value = val;
		this.subscribers.forEach((listener) => listener(val));
	}

	update(updaterFn: (prev: TVal) => TVal): void {
		this.set(updaterFn(this._value));
	}

	get(): TVal {
		return this._value;
	}
}

interface ITaskItem {
	id: string;
	label: string;
	done: boolean;
}

@Quick(
	{ id: 'string', label: 'string', done: 'boolean' },
	{ unknownPropertyPolicy: 'keep' }
)
class TaskModel extends QModel<ITaskItem> {
	declare id: string;
	declare label: string;
	declare done: boolean;
}

describe('Svelte — writable store wrapping QModel', () => {
	test('store emits initial value on subscribe', () => {
		const store = new WriteableStore(
			new TaskModel({ id: 't1', label: 'Buy milk', done: false })
		);
		let received: TaskModel | null = null;
		store.subscribe((val) => {
			received = val;
		});
		expect(received).not.toBeNull();
		expect((received as unknown as TaskModel).label).toBe('Buy milk'); // @quickmodel-rule-ignore: no-as-unknown
	});

	test('update() via merge() triggers subscriber', () => {
		const store = new WriteableStore(
			new TaskModel({ id: 't2', label: 'Write tests', done: false })
		);
		const values: boolean[] = [];
		store.subscribe((val) => values.push(val.done));
		store.update((prev) => prev.$qCopy({ done: true }));
		expect(values).toEqual([false, true]);
	});

	test('unsubscribe() stops receiving updates', () => {
		const store = new WriteableStore(
			new TaskModel({ id: 't3', label: 'Task', done: false })
		);
		const values: boolean[] = [];
		const unsub = store.subscribe((val) => values.push(val.done));
		unsub();
		store.update((prev) => prev.$qCopy({ done: true }));
		expect(values).toHaveLength(1); // only initial emit
	});

	test('serialize() works on store value', () => {
		const store = new WriteableStore(
			new TaskModel({ id: 't4', label: 'Serialize', done: true })
		);
		const out = store.get().$qSerialize() as Record<string, unknown>;
		expect(out['label']).toBe('Serialize');
		expect(out['done']).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 3. SvelteKit form actions — server-side coercion + validation
// ---------------------------------------------------------------------------

class NewsletterForm {
	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
		'Invalid email address'
	)
	email = '';

	@QField({ widget: 'input', label: 'Name', required: true })
	@QRule(
		(value: string) => value.trim().length >= 2,
		'Name must be at least 2 chars'
	)
	name = '';

	@QField({ widget: 'input', label: 'Frequency' })
	@QRule(
		(value: string) => ['daily', 'weekly', 'monthly'].includes(value),
		'Frequency must be daily, weekly, or monthly'
	)
	frequency = 'weekly';
}

// Simulate SvelteKit form action: +page.server.ts → actions.subscribe
interface IFormActionResult {
	status: 'success' | 'fail';
	data?: Record<string, unknown>;
	errors?: Record<string, string>;
}

function kitFormAction(formData: Record<string, string>): IFormActionResult {
	const form = new NewsletterForm();
	form.email = formData['email'] ?? '';
	form.name = formData['name'] ?? '';
	form.frequency = formData['frequency'] ?? 'weekly';

	const validation = $qCheckRules(form);
	if (!validation.valid) {
		const errors: Record<string, string> = {};
		for (const err of validation.errors) {
			if (!errors[err.field]) errors[err.field] = err.message;
		}
		return { status: 'fail', errors };
	}

	return {
		status: 'success',
		data: { email: form.email, name: form.name, frequency: form.frequency },
	};
}

describe('SvelteKit — form actions (server-side validation)', () => {
	test('valid form data returns success', () => {
		const result = kitFormAction({
			email: 'user@svelte.dev',
			name: 'Svelte Dev',
			frequency: 'weekly',
		});
		expect(result.status).toBe('success');
		expect(result.data!['email']).toBe('user@svelte.dev');
	});

	test('invalid email returns fail with errors', () => {
		const result = kitFormAction({
			email: 'not-an-email',
			name: 'Dev',
			frequency: 'weekly',
		});
		expect(result.status).toBe('fail');
		expect(result.errors!['email']).toBeDefined();
	});

	test('missing name returns fail with name error', () => {
		const result = kitFormAction({
			email: 'user@svelte.dev',
			name: 'A',
			frequency: 'weekly',
		});
		expect(result.status).toBe('fail');
		expect(result.errors!['name']).toBeDefined();
	});

	test('invalid frequency returns fail with frequency error', () => {
		const result = kitFormAction({
			email: 'user@svelte.dev',
			name: 'Valid Name',
			frequency: 'biweekly',
		});
		expect(result.status).toBe('fail');
		expect(result.errors!['frequency']).toBeDefined();
	});

	test('multiple invalid fields return all errors', () => {
		const result = kitFormAction({
			email: 'bad',
			name: 'X',
			frequency: 'unknown',
		});
		expect(result.status).toBe('fail');
		expect(Object.keys(result.errors ?? {})).toHaveLength(3);
	});
});

// ---------------------------------------------------------------------------
// 4. SvelteKit load function — createMany() for SSR data
// ---------------------------------------------------------------------------

interface IEvent {
	id: string;
	name: string;
	startDate: Date;
	endDate: Date;
	capacity: number;
}

@Quick(
	{
		id: 'string',
		name: 'string',
		startDate: Date,
		endDate: Date,
		capacity: 'number',
	},
	{ unknownPropertyPolicy: 'strip' }
)
class EventModel extends QModel<IEvent> {
	declare id: string;
	declare name: string;
	declare startDate: Date;
	declare endDate: Date;
	declare capacity: number;

	@QComputed()
	get durationDays(): number {
		const diffMs = this.endDate.getTime() - this.startDate.getTime();
		return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	}
}

// Simulate SvelteKit load function (+page.server.ts → load)
async function kitLoadFunction(apiResponse: object[]): Promise<{
	events: object[];
	count: number;
}> {
	await Bun.sleep(1);
	const { instances } = EventModel.createMany(apiResponse as any[]);
	return {
		events: instances.map((evt) => evt.$qSerialize()),
		count: instances.length,
	};
}

describe('SvelteKit — load function with createMany()', () => {
	test('load coerces all events from API response', async () => {
		const raw = [
			{
				id: 'e1',
				name: 'SvelteConf',
				startDate: '2024-09-01T00:00:00.000Z',
				endDate: '2024-09-03T00:00:00.000Z',
				capacity: 300,
			},
			{
				id: 'e2',
				name: 'WebSummit',
				startDate: '2024-11-11T00:00:00.000Z',
				endDate: '2024-11-14T00:00:00.000Z',
				capacity: 5000,
			},
		];
		const { events, count } = await kitLoadFunction(raw);
		expect(events).toHaveLength(2);
		expect(count).toBe(2);
	});

	test('@QComputed durationDays is calculated correctly', async () => {
		const raw = [
			{
				id: 'e3',
				name: '3-Day Event',
				startDate: '2024-06-01T00:00:00.000Z',
				endDate: '2024-06-04T00:00:00.000Z',
				capacity: 100,
			},
		];
		const { events } = await kitLoadFunction(raw);
		const evt = events[0] as Record<string, unknown>;
		expect(evt['durationDays']).toBe(3);
	});

	test('dates are coerced from ISO strings during load', () => {
		const evt = new EventModel({
			id: 'e4',
			name: 'Test',
			startDate: '2024-01-01T00:00:00.000Z',
			endDate: '2024-01-02T00:00:00.000Z',
			capacity: 50,
		});
		expect(evt.startDate).toBeInstanceOf(Date);
		expect(evt.endDate).toBeInstanceOf(Date);
	});

	test('unknown fields from API are stripped', async () => {
		const raw = [
			{
				id: 'e5',
				name: 'Event',
				startDate: new Date(),
				endDate: new Date(),
				capacity: 20,
				internalRef: 'secret',
			},
		];
		const { events } = await kitLoadFunction(raw);
		const evt = events[0] as Record<string, unknown>;
		expect('internalRef' in evt).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// 5. Async validation — Svelte async form composable
// ---------------------------------------------------------------------------

const takenSlugs = new Set([
	'hello-world',
	'svelte-tutorial',
	'getting-started',
]);

class BlogPostForm {
	@QField({ widget: 'input', label: 'Slug', required: true })
	@QRule(async (value: string) => {
		await Bun.sleep(3);
		return !takenSlugs.has(value.toLowerCase());
	}, 'Slug already in use')
	@QRule(
		(value: string) => /^[a-z0-9-]+$/.test(value),
		'Slug: only lowercase letters, digits, hyphens'
	)
	@QRule((value: string) => value.length >= 3, 'Slug too short')
	slug = '';

	@QField({ widget: 'input', label: 'Title', required: true })
	@QRule(
		(value: string) => value.trim().length >= 5,
		'Title must be at least 5 chars'
	)
	title = '';
}

describe('Svelte — async slug uniqueness validation', () => {
	test('available slug passes async validation', async () => {
		const form = new BlogPostForm();
		form.slug = 'my-new-post';
		form.title = 'My New Post Title';
		const result = await $qCheckRulesAsync(form);
		expect(result.valid).toBe(true);
	});

	test('taken slug fails async validation', async () => {
		const form = new BlogPostForm();
		form.slug = 'hello-world';
		form.title = 'Hello World Post';
		const result = await $qCheckRulesAsync(form);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'slug')).toBe(true);
	});

	test('invalid slug format fails sync rule', async () => {
		const form = new BlogPostForm();
		form.slug = 'Invalid Slug!';
		form.title = 'Some Title Here';
		const result = await $qCheckRulesAsync(form, { mode: 'serial' });
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'slug')).toBe(true);
	});
});
