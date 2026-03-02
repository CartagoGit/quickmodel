# Integración con Svelte 5

QuickModel funciona con las runes de Svelte 5 (`$state`, `$derived`), stores escribibles, SvelteKit form actions y funciones `load`.

## Patrones principales

| Caso de uso                      | Solución QuickModel                   |
| -------------------------------- | ------------------------------------- |
| Runes `$state` / `$derived`      | Clase plana + `qCheckRules()`         |
| Stores escribibles               | `writable(new Model(data))`           |
| SvelteKit form actions           | DTO en el servidor                    |
| Función `load` con datos masivos | `createMany()`                        |
| Validación asíncrona             | `@QRule` async + `qCheckRulesAsync()` |

## Runes de Svelte 5 — `$state` y `$derived`

```svelte
<!-- ProfileEditor.svelte -->
<script lang="ts">
  import { QField, QRule } from 'quickmodel';
  import { qCheckRules } from 'quickmodel/forms';

  class ProfileRune {
    @QField({ label: 'Bio', required: true })
    @QRule((v: string) => v.length >= 10, 'Bio muy corta')
    bio = $state('');

    @QField({ label: 'Seguidores' })
    @QRule((v: number) => v >= 0, 'Valor inválido')
    followers = $state(0);
  }

  const form = new ProfileRune();
  const validation = $derived(qCheckRules(form));
</script>

<input bind:value={form.bio} />
{#if !validation.valid}
  <p>{validation.errors[0]?.message}</p>
{/if}
```

::: tip Dos patrones disponibles

- **Clase plana** (arriba): solo `@QRule` + `@QField` — sin herencia de `QModel`. Ideal para formularios ligeros.
- **Con `QModel` + `@Quick`** (abajo): añade coerción, `copy()`, `serialize()` y `@QComputed`. Ideal para estado reactivo.
  :::

### Con QModel + @Quick

```svelte
<!-- NoteEditor.svelte -->
<script lang="ts">
  import { QModel, Quick, QField, QRule, QComputed } from 'quickmodel';

  @Quick(
    { id: 'string', title: 'string', body: 'string' },
    { unknownPropertyPolicy: 'strip' }
  )
  class NoteModel extends QModel<INote> {
    declare id: string;

    @QField({ label: 'Título', required: true })
    @QRule((v: string) => v.trim().length >= 2, 'Título muy corto')
    declare title: string;

    declare body: string;

    @QComputed()
    get preview(): string { return this.body.slice(0, 60); }
  }

  let note = $state(new NoteModel({ id: 'n1', title: 'Hola', body: '' }));

  // copy() es INMUTABLE — la reactividad de $state se activa al reasignar
  function update(patch: Partial<INote>) {
    note = note.$qCopy(patch) as NoteModel;
  }

  let preview = $derived(note.preview);
  let { valid, errors } = $derived(note.$qCheckRules());
</script>

<input bind:value={note.title} />
{#if !valid}<p>{errors[0]?.message}</p>{/if}
<p>Preview: {preview}</p>
```

## Stores escribibles

```typescript
// stores/user-record.store.ts
import { writable } from 'svelte/store';
import { QModel, Quick, QField, QRule } from 'quickmodel';

@Quick({ id: 'string', name: 'string', email: 'string', active: 'boolean' })
class UserRecord extends QModel<IUser> {
	declare id: string;
	declare name: string;

	@QField({ label: 'Email', widget: 'email' })
	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Email inválido'
	)
	declare email: string;

	declare active: boolean;
}

export function createUserStore(initial: IUser) {
	const record = new UserRecord(initial);
	const { subscribe, set } = writable(record);

	return {
		subscribe,
		update: (patch: Partial<IUser>) => {
			// copy() es INMUTABLE — captura la nueva instancia
			set(record.$qCopy(patch) as UserRecord);
		},
	};
}
```

## SvelteKit — Form Actions

```typescript
// src/routes/signup/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { RegistrationDto } from '$lib/dto/registration.dto';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();

		const dto = new RegistrationDto({
			username: formData.get('username'),
			email: formData.get('email'),
			password: formData.get('password'),
		});

		const { valid, errors } = dto.$qCheckRules();
		if (!valid) {
			return fail(422, { errors });
		}

		// Crear usuario...
		return { success: true };
	},
};
```

```svelte
<!-- src/routes/signup/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  export let form;
</script>

<form method="POST" use:enhance>
  <input name="username" />
  {#if form?.errors?.find(e => e.field === 'username')}
    <span>{form.errors.find(e => e.field === 'username').message}</span>
  {/if}
  <!-- ... -->
</form>
```

## Función load con createMany()

```typescript
// src/routes/products/+page.server.ts
import type { PageServerLoad } from './$types';
import { ProductDto } from '$lib/dto/product.dto';

export const load: PageServerLoad = async ({ fetch }) => {
	const rawItems = await fetch('/api/products').then((r) => r.json());
	const { instances, errors } = ProductDto.createMany(rawItems);

	if (errors.length) {
		console.warn(`${errors.length} productos no válidos`);
	}

	return {
		products: instances.map((p) => p.$qSerialize()),
	};
};
```

## Validación asíncrona — Slug único

```typescript
// lib/dto/post.dto.ts
import { QField, QRule } from 'quickmodel';
import { qCheckRulesAsync } from 'quickmodel/forms';

class PostDto {
	@QField({ label: 'Título', required: true })
	title = '';

	@QRule(async (slug: string) => {
		const exists = await checkSlugExists(slug);
		return !exists;
	}, 'Slug ya en uso')
	@QField({ label: 'Slug' })
	slug = '';
}

// Uso en un action:
const dto = new PostDto();
Object.assign(dto, formData);
const result = await qCheckRulesAsync(dto);
if (!result.valid) {
	return fail(422, { errors: result.errors });
}
```

::: tip Compatibilidad con Svelte 4
Para Svelte 4 (sin runes), usa stores escribibles convencionales. El patrón `copy()` inmutable sigue aplicando:

```typescript
store.update((prev) => prev.$qCopy(patch));
```

:::
