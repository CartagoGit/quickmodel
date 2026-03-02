# Astro Integration

QuickModel works seamlessly in Astro projects — both on the server (API routes, Astro Actions,
content loaders) and in client-side islands (React, Solid, Vue, Svelte). DTO validation at the
edge, `createMany()` for build-time data loading, and `$qSerialize()` for safe server→client
data transfer are the three key integration patterns.

## Key patterns

| Use case                      | QuickModel solution                                      |
| ----------------------------- | -------------------------------------------------------- |
| API route validation          | DTO + `$qCheckRules()` in `.ts` endpoints                |
| Astro Actions (type-safe RPC) | DTO inside `defineAction()` handler                      |
| Content collections           | `createMany()` for bulk coercion of collection entries   |
| Build-time data loading       | `createMany()` in `getStaticPaths()` / `getCollection()` |
| Island data hydration         | `$qSerialize()` as Astro props                           |
| Form handling                 | `fromFormData()` static constructor                      |

## Defining a DTO

```typescript
// src/dto/contact.dto.ts
import { QModel, Quick, QField, QRule } from 'quickmodel';

interface IContact {
	name: string;
	email: string;
	message: string;
	createdAt: Date;
}

@Quick(
	{
		name: 'string',
		email: 'string',
		message: 'string',
		createdAt: Date,
	},
	{ unknownPropertyPolicy: 'strip' }
)
export class ContactDto extends QModel<IContact> {
	@QField({ label: 'Name', required: true })
	@QRule((v: string) => v.trim().length >= 2, 'Name too short')
	declare name: string;

	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule((v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Invalid email')
	declare email: string;

	@QField({ label: 'Message', required: true })
	@QRule((v: string) => v.trim().length >= 10, 'Message too short')
	declare message: string;

	declare createdAt: Date;
}
```

## API Route — POST endpoint

```typescript
// src/pages/api/contact.ts
import type { APIRoute } from 'astro';
import { ContactDto } from '../../dto/contact.dto';

export const POST: APIRoute = async ({ request }) => {
	const body = await request.json();
	const dto = new ContactDto({ ...body, createdAt: new Date() });

	const { valid, errors } = dto.$qCheckRules();
	if (!valid) {
		return Response.json({ errors }, { status: 422 });
	}

	// persist / send email
	await saveContact(dto.$qSerialize());

	return Response.json({ ok: true }, { status: 201 });
};
```

## Astro Actions — Type-Safe Mutations

Astro Actions provide end-to-end type-safe server functions. QuickModel handles coercion and
validation before your business logic:

```typescript
// src/actions/index.ts
import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { ContactDto } from '../dto/contact.dto';

export const server = {
	contact: defineAction({
		input: z.object({
			name: z.string(),
			email: z.string(),
			message: z.string(),
		}),
		handler: async (input) => {
			const dto = new ContactDto({ ...input, createdAt: new Date() });
			const { valid, errors } = dto.$qCheckRules();

			if (!valid) {
				throw new Error(errors.map((e) => e.message).join(', '));
			}

			await saveContact(dto.$qSerialize());
			return { ok: true };
		},
	}),
};
```

Using the action in a component:

```astro
---
// No server logic needed in the .astro file
---
<form>
  <input name="name" />
  <input name="email" type="email" />
  <textarea name="message"></textarea>
  <button type="submit">Send</button>
</form>

<script>
  import { actions } from 'astro:actions';

  document.querySelector('form')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target as HTMLFormElement));
    const { error } = await actions.contact(data);
    if (error) console.error(error.message);
  });
</script>
```

## FormData Handling

Astro form actions often use `multipart/form-data`. Use the static `fromFormData()` constructor:

```typescript
// src/pages/api/signup.ts
import type { APIRoute } from 'astro';
import { SignupDto } from '../../dto/signup.dto';

export const POST: APIRoute = async ({ request }) => {
	const formData = await request.formData();
	const dto = SignupDto.fromFormData(formData);

	const { valid, errors } = dto.$qCheckRules();
	if (!valid) {
		return Response.json({ errors }, { status: 422 });
	}

	return Response.json({ message: 'Account created' }, { status: 201 });
};
```

## Build-Time Data Loading — `getStaticPaths()`

Use `createMany()` to coerce and validate data at build time:

```typescript
---
// src/pages/products/[slug].astro
import { ProductModel } from '../../models/product.model';

export async function getStaticPaths() {
  const rawProducts = await fetch('https://api.example.com/products')
    .then(r => r.json());

  const { instances, errors } = ProductModel.createMany(rawProducts);

  if (errors.length) {
    console.warn(`${errors.length} products skipped during build`);
  }

  return instances.map(product => ({
    params: { slug: product.slug },
    props: { product: product.$qSerialize() },
  }));
}

const { product } = Astro.props;
---

<h1>{product.name}</h1>
<p>{product.description}</p>
```

## Server-Side Content with Content Collections

For CMS-driven content, combine Astro content collections with `createMany()`:

```typescript
// src/pages/blog/index.astro (server script block)
import { getCollection } from 'astro:content';
import { BlogPostModel } from '../../models/blog-post.model';

const entries = await getCollection('blog');
const rawPosts = entries.map((entry) => entry.data);

const { instances: posts, errors } = BlogPostModel.createMany(rawPosts);
// posts → BlogPostModel[] with Date coercion, all @QComputed fields ready
```

## Island Hydration — Passing DTOs as Props

`$qSerialize()` returns a plain serializable object, safe to pass as Astro props across the
server/client boundary:

```astro
---
import UserProfile from '../components/UserProfile.tsx';
import { UserModel } from '../models/user.model';

const raw = await fetchUser(Astro.params.id!);
const user = new UserModel(raw);
---

<!-- user.$qSerialize() is a plain object — safe to serialize as Astro prop -->
<UserProfile client:load user={user.$qSerialize()} />
```

```tsx
// src/components/UserProfile.tsx (React island)
import { UserModel } from '../models/user.model';

export default function UserProfile({ user }: { user: object }) {
	// Re-hydrate the model on the client
	const model = new UserModel(user);
	const { valid } = model.$qCheckRules();

	return (
		<div>
			<h2>{model.displayName}</h2>
			{!valid && <p>Profile incomplete</p>}
		</div>
	);
}
```

## Async Validation — Email Uniqueness

For Astro API routes that need async validation (e.g. database lookups):

```typescript
// src/pages/api/register.ts
import type { APIRoute } from 'astro';
import { qCheckRulesAsync } from 'quickmodel/forms';
import { RegistrationDto } from '../../dto/registration.dto';

export const POST: APIRoute = async ({ request }) => {
	const body = await request.json();
	const dto = new RegistrationDto(body);

	const result = await qCheckRulesAsync(dto, { mode: 'parallel' });
	if (!result.valid) {
		return Response.json({ errors: result.errors }, { status: 422 });
	}

	await createUser(dto.$qSerialize());
	return Response.json({ ok: true }, { status: 201 });
};
```

## Middleware — Reusable Validation Factory

```typescript
// src/middleware/validate-dto.ts
import type { APIContext } from 'astro';
import { QModel } from 'quickmodel';

export function validateDto<TDto extends QModel<object>>(
	DtoClass: new (data: object) => TDto,
	bodyFn: (ctx: APIContext) => Promise<object>
) {
	return async (ctx: APIContext) => {
		const body = await bodyFn(ctx);
		const dto = new DtoClass(body);
		const { valid, errors } = dto.$qCheckRules();
		if (!valid) {
			return Response.json({ errors }, { status: 422 });
		}
		return dto; // return typed DTO for use in the handler
	};
}
```

## Comparison: Astro + QuickModel vs Zod alone

| Feature                           | Zod                      | QuickModel                    |
| --------------------------------- | ------------------------ | ----------------------------- |
| Coercion at input boundary        | `z.coerce.*`             | `@Quick({ date: Date })`      |
| Rich validation rules             | `.refine()`              | `@QRule` with full access     |
| Instance methods (`$qCopy()` etc) | ❌                       | ✅ full OOP model lifecycle   |
| `fromFormData()` support          | Manual                   | ✅ built-in                   |
| Works in Astro Actions            | ✅ (as `input` schema)   | ✅ (as handler-level logic)   |
| Serialization for SSR props       | Manual `.parse()` output | `$qSerialize()` — always safe |

::: tip Astro + Zod for Action schemas, QuickModel for business logic
The best of both worlds: use Zod's `input` schema in `defineAction()` for Astro's type inference,
then immediately construct a QuickModel DTO for richer coercion, `@QRule` validation, and
`$qCopy()` update patterns.
:::

## See Also

- [Validation](/en/guide/validation) — `@QRule` and `qCheckRules()`
- [Coercion](/en/guide/transformers) — `@Quick` type transformers
- [Remix Integration](./remix-integration) — similar SSR + form pattern
- [Backend Integration](./backend-integration) — Express / Fastify / Hono
