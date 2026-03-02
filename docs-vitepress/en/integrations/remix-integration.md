# Remix Integration

Remix is a full-stack web framework built on web standards. QuickModel fits naturally into
the Remix data model — use DTOs in `loader` functions to coerce and type API/DB results, in
`action` functions to validate form submissions, and across the client/server boundary to
ensure consistent types throughout the request lifecycle.

## Key Patterns

| Pattern                     | QuickModel API                                           |
| --------------------------- | -------------------------------------------------------- |
| Loader data coercion        | `new Dto(raw)` / `createMany(rawArray)` in `loader`      |
| Action form validation      | `qCheckRules(dto)` → return errors or redirect           |
| Type-safe route boundary    | `$qSerialize()` → `json(serialized)` → `new Dto(data)`   |
| Async uniqueness check      | `qCheckRulesAsync()` with DB query in `action`           |
| Partial update (PATCH)      | `existing.$qCopy(formPatch)` → save patched instance     |
| Change-set detection        | `existing.$qDiff(updated)` → only send changed fields    |
| Computed fields in response | `@QComputed` — included automatically in `$qSerialize()` |

## Installation

```bash
npm install quickmodel
```

Enable decorators in `tsconfig.json` (Remix projects use Vite + TypeScript):

```json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
	}
}
```

## Model Setup

```typescript
// app/models/article.dto.ts
import { QModel, Quick, QRule, QField, QComputed } from 'quickmodel';

interface IArticle {
	id: string;
	title: string;
	body: string;
	authorId: string;
	published: boolean;
	views: number;
	publishedAt: Date | null;
}

@Quick(
	{
		id: 'string',
		title: 'string',
		body: 'string',
		authorId: 'string',
		published: 'boolean',
		views: 'number',
		publishedAt: Date,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
export class ArticleDto extends QModel<IArticle> {
	@QField({ label: 'Title', required: true })
	@QRule(
		(v: string) => v.trim().length >= 5,
		'Title must be at least 5 chars'
	)
	@QRule(
		(v: string) => v.trim().length <= 160,
		'Title must be at most 160 chars'
	)
	declare title: string;

	@QField({ label: 'Body', required: true })
	@QRule((v: string) => v.trim().length >= 20, 'Body too short')
	declare body: string;

	declare id: string;
	declare authorId: string;
	declare published: boolean;
	declare views: number;
	declare publishedAt: Date | null;

	@QComputed()
	get excerpt(): string {
		return this.body.length > 200
			? `${this.body.slice(0, 200)}…`
			: this.body;
	}

	@QComputed()
	get readingTimeMin(): number {
		return Math.ceil(this.body.split(/\s+/).length / 200);
	}
}
```

## Loader — Coercing DB / API Results

```typescript
// app/routes/articles._index.tsx
import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { ArticleDto } from '~/models/article.dto';
import { db } from '~/db.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const rows = await db.article.findMany({
    orderBy: { publishedAt: 'desc' },
    where: { published: true },
  });

  // Coerce all DB rows into typed, validated DTOs
  const { instances: articles } = ArticleDto.createMany(rows);

  // Serialize to JSON-safe plain objects before crossing the wire
  return json({ articles: articles.map((a) => a.$qSerialize()) });
}

export default function ArticlesPage() {
  const { articles: raw } = useLoaderData<typeof loader>();

  // Rehydrate into typed DTOs on the client
  const articles = raw.map((r) => new ArticleDto(r));

  return (
    <ul>
      {articles.map((article) => (
        <li key={article.id}>
          <h2>{article.title}</h2>
          <p>{article.excerpt}</p>           {/* @QComputed */}
          <small>{article.readingTimeMin} min read · {article.views} views</small>
        </li>
      ))}
    </ul>
  );
}
```

::: tip Serialize before `json()`, rehydrate after `useLoaderData()`
Remix serializes loader data as JSON over the wire. `Date` fields become ISO strings in
transit — but `$qSerialize()` handles this automatically (Dates → ISO strings) and
`new ArticleDto(raw)` rehydrates them back (ISO strings → Dates) on the client.
:::

## Action — Validating Form Submissions

```typescript
// app/routes/articles.new.tsx
import type { ActionFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { qCheckRules } from 'quickmodel/forms';
import { ArticleDto } from '~/models/article.dto';
import { db } from '~/db.server';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  // Build a DTO from form data — coercion handles string→boolean, etc.
  const dto = new ArticleDto({
    id: crypto.randomUUID(),
    title: formData.get('title') as string,
    body: formData.get('body') as string,
    authorId: 'author-1', // from session in real app
    published: formData.get('published') === 'on',
    views: 0,
    publishedAt: null,
  });

  const { valid, errors } = qCheckRules(dto);

  if (!valid) {
    // Return field errors to the form
    return json(
      {
        errors: errors.reduce(
          (acc, e) => ({ ...acc, [e.field]: e.message }),
          {} as Record<string, string>
        ),
      },
      { status: 422 }
    );
  }

  // Save to DB using the plain interface
  await db.article.create({ data: dto.$qToInterface() });

  return redirect(`/articles/${dto.id}`);
}

export default function NewArticlePage() {
  const actionData = useActionData<typeof action>();

  return (
    <Form method="post">
      <label>
        Title
        <input type="text" name="title" />
        {actionData?.errors.title && (
          <span className="error">{actionData.errors.title}</span>
        )}
      </label>
      <label>
        Body
        <textarea name="body" rows={10} />
        {actionData?.errors.body && (
          <span className="error">{actionData.errors.body}</span>
        )}
      </label>
      <label>
        <input type="checkbox" name="published" />
        Publish immediately
      </label>
      <button type="submit">Create article</button>
    </Form>
  );
}
```

## Action — Partial Update (PATCH)

```typescript
// app/routes/articles.$id.edit.tsx
export async function action({ request, params }: ActionFunctionArgs) {
	const { id } = params as { id: string };

	// Load existing record
	const row = await db.article.findUniqueOrThrow({ where: { id } });
	const existing = new ArticleDto(row);

	const formData = await request.formData();

	// Apply only the fields present in the form
	const updated = existing.$qCopy({
		title: formData.get('title') as string,
		body: formData.get('body') as string,
	});

	// Validate the patched state
	const { valid, errors } = qCheckRules(updated);
	if (!valid) {
		return json(
			{
				errors: errors.reduce(
					(acc, e) => ({ ...acc, [e.field]: e.message }),
					{} as Record<string, string>
				),
			},
			{ status: 422 }
		);
	}

	// Only persist the changed fields
	const diff = existing.$qDiff(updated);
	if (Object.keys(diff).length > 0) {
		await db.article.update({ where: { id }, data: diff });
	}

	return redirect(`/articles/${id}`);
}
```

## Async Validation — Uniqueness by Slug

```typescript
// app/models/article-create.dto.ts
import { QModel, Quick, QRule } from 'quickmodel';
import { qCheckRulesAsync } from 'quickmodel/forms';
import { db } from '~/db.server';

@Quick({ title: 'string', slug: 'string' })
class ArticleCreateDto {
	@QRule(
		async (slug: string) =>
			!(await db.article.findFirst({ where: { slug } })),
		'This slug is already taken'
	)
	slug = '';

	title = '';
}

// In the action:
export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const dto = Object.assign(new ArticleCreateDto(), {
		title: formData.get('title') as string,
		slug: formData.get('slug') as string,
	});

	const { valid, errors } = await qCheckRulesAsync(dto);
	if (!valid) {
		return json({ errors }, { status: 422 });
	}

	// ... proceed to create
}
```

## Resource Route — Pure API Endpoint

```typescript
// app/routes/api.articles.$id.ts
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { ArticleDto } from '~/models/article.dto';
import { db } from '~/db.server';

export async function loader({ params }: LoaderFunctionArgs) {
	const { id } = params as { id: string };
	const row = await db.article.findUniqueOrThrow({ where: { id } });
	const dto = new ArticleDto(row);
	return json(dto.$qSerialize());
}

export async function action({ request, params }: ActionFunctionArgs) {
	const { id } = params as { id: string };

	if (request.method === 'DELETE') {
		await db.article.delete({ where: { id } });
		return json({ deleted: true });
	}

	if (request.method === 'PATCH') {
		const row = await db.article.findUniqueOrThrow({ where: { id } });
		const existing = new ArticleDto(row);
		const patch = (await request.json()) as Partial<IArticle>;
		const updated = existing.$qCopy(patch);

		await db.article.update({
			where: { id },
			data: updated.$qToInterface(),
		});

		return json(updated.$qSerialize());
	}

	return json({ error: 'Method not allowed' }, { status: 405 });
}
```

## See Also

- [Backend Integration](./backend-integration) — Express, Fastify, Hono
- [Prisma Integration](./prisma-integration) — ORM layer with DTOs
- [Validation](/en/guide/validation) — `@QRule`, `qCheckRules()`, `qCheckRulesAsync()`
