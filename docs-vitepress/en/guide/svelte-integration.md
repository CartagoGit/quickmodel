# Svelte 5 Integration

QuickModel integrates with **Svelte 5** and **SvelteKit** through runes, stores, and form actions. Use plain classes for form validation and `QModel` for reactive state and server-side coercion.

## Key Separation

| Use case                        | Approach                                    |
| ------------------------------- | ------------------------------------------- |
| Svelte 5 `$state` reactive form | Plain TS class + `@QRule` + `qCheckRules()` |
| `$derived` computed from model  | `QModel` + `serialize()` + getter           |
| SvelteKit form actions          | `QModel` + `@Quick()` + `checkRules()`      |
| Svelte stores (`writable`)      | `QModel` wrapped in a writable store        |

## Installation

```bash
npm install @cartago-git/quickmodel
```

Enable decorators in `tsconfig.json`:

```json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
	}
}
```

## Svelte 5 Runes — `$state` + `$derived`

```svelte
<script lang="ts">
import { QModel, Quick, QComputed } from '@cartago-git/quickmodel';

@Quick(
  { id: 'string', title: 'string', body: 'string', pinned: 'boolean', createdAt: Date },
  { unknownPropertyPolicy: 'strip' }
)
class NoteModel extends QModel<INote> {
  declare id: string;
  declare title: string;
  declare body: string;
  declare pinned: boolean;
  declare createdAt: Date;

  @QComputed()
  get preview(): string { return this.body.slice(0, 60); }

  @QComputed()
  get charCount(): number { return this.body.length; }
}

// $state wraps a QModel instance
let note = $state(new NoteModel({
  id: 'n1', title: 'Hello', body: 'Initial content',
  pinned: false, createdAt: new Date(),
}));

// @QComputed getters are TypeScript class getters — access them directly on the instance
let preview   = $derived(note.preview);    // string — inferred from NoteModel
let charCount = $derived(note.charCount);  // number — inferred from NoteModel

function updateBody(newBody: string) {
  // copy() is IMMUTABLE — reassign the $state variable
  note = note.copy({ body: newBody });
}
</script>

<textarea
  value={note.body}
  oninput={e => updateBody(e.target.value)}
/>
<p>Preview: {preview}</p>
<p>Characters: {charCount}</p>
```

::: tip Immutable merge with $state
Since `copy()` returns a new instance, Svelte's `$state` reactivity fires automatically when you reassign the variable. This is the recommended pattern.
:::

## Svelte Stores (Svelte 4 / compatible with Svelte 5)

```typescript
// stores/taskStore.ts
import { writable } from 'svelte/store';
import { QModel, Quick } from '@cartago-git/quickmodel';

@Quick(
	{ id: 'string', label: 'string', done: 'boolean' },
	{ unknownPropertyPolicy: 'keep' }
)
class TaskModel extends QModel<ITask> {
	declare id: string;
	declare label: string;
	declare done: boolean;
}

function createTaskStore(initial: ITask) {
	const { subscribe, update } = writable(new TaskModel(initial));

	return {
		subscribe,
		toggle: () => update((task) => task.copy({ done: !task.done })),
		setLabel: (label: string) => update((task) => task.copy({ label })),
	};
}

export const task = createTaskStore({
	id: 't1',
	label: 'Buy milk',
	done: false,
});
```

```svelte
<script>
import { task } from './stores/taskStore';
</script>

<input type="checkbox" checked={$task.done} onchange={() => task.toggle()} />
<span>{$task.label}</span>
```

## SvelteKit Form Actions

Validate and coerce incoming form data on the server:

```typescript
// src/routes/newsletter/+page.server.ts
import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { qCheckRules } from '@cartago-git/quickmodel/core/helpers/q-check-rules';

class NewsletterForm {
	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Invalid email address'
	)
	email = '';

	@QRule((v: string) => v.trim().length >= 2, 'Name required')
	name = '';

	@QRule(
		(v: string) => ['daily', 'weekly', 'monthly'].includes(v),
		'Invalid frequency'
	)
	frequency = 'weekly';
}

export const actions: Actions = {
	subscribe: async ({ request }) => {
		const data = await request.formData();
		const form = new NewsletterForm();
		form.email = (data.get('email') as string) ?? '';
		form.name = (data.get('name') as string) ?? '';
		form.frequency = (data.get('frequency') as string) ?? 'weekly';

		const validation = qCheckRules(form);
		if (!validation.valid) {
			const errors = Object.fromEntries(
				validation.errors.map((e) => [e.field, e.message])
			);
			return fail(422, { errors });
		}

		// proceed with valid data
		return { success: true };
	},
};
```

## SvelteKit Load — createMany() for SSR

```typescript
// src/routes/events/+page.server.ts
import type { PageServerLoad } from './$types';
import { QModel, Quick, QComputed } from '@cartago-git/quickmodel';

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
		return Math.ceil(
			(this.endDate.getTime() - this.startDate.getTime()) /
				(1000 * 60 * 60 * 24)
		);
	}
}

export const load: PageServerLoad = async ({ fetch }) => {
	const raw = await fetch('/api/events').then((r) => r.json());
	const { instances } = EventModel.createMany(raw);
	return { events: instances.map((evt) => evt.serialize()) };
};
```

## Async Validation in SvelteKit

```typescript
// Async slug uniqueness check
class BlogPostForm {
	@QRule(async (slug: string) => {
		const res = await fetch(`/api/slugs/check?slug=${slug}`);
		const { available } = await res.json();
		return available;
	}, 'Slug already in use')
	@QRule((v: string) => /^[a-z0-9-]+$/.test(v), 'Invalid slug format')
	slug = '';
}

// In a +page.server.ts action using qCheckRulesAsync
import { qCheckRulesAsync } from '@cartago-git/quickmodel/core/helpers/q-check-rules-async';

const result = await qCheckRulesAsync(form, { mode: 'serial' });
```

## diff() — Track Form Changes

```typescript
const original = new ArticleModel({ ... });
// User edits
const edited = original.copy({ title: 'Updated Title' });

original.diff(edited);
// → { title: { before: 'Old Title', after: 'Updated Title' } }
```
