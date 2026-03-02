# SWR Integration

SWR is Vercel's React data fetching library built around stale-while-revalidate semantics.
QuickModel pairs naturally with SWR — use `createMany()` in the fetcher to coerce raw API
responses into typed DTOs, `$qCopy()` for optimistic mutations, and `$qSerialize()` for
cache normalization.

## Key Patterns

| Pattern                 | QuickModel API                                             |
| ----------------------- | ---------------------------------------------------------- |
| Coerce fetcher response | `createMany(data)` → typed `instances[]`                   |
| Single resource fetch   | `new UserDto(raw)` in `fetcher`                            |
| Optimistic mutation     | `$qCopy(patch)` → new instance → `mutate(optimistic, ...)` |
| Cache normalization     | `$qSerialize()` / `new Dto(cached)` round-trip             |
| Derived computed fields | `@QComputed` recalculated on every DTO access              |
| Validation before POST  | `dto.$qCheckRules()` → abort or submit                     |
| Change detection        | `dto.$qIsDirty()` → skip unnecessary PUT calls             |

## Installation

```bash
npm install quickmodel swr
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

## Model Setup

```typescript
// models/post.dto.ts
import { QModel, Quick, QRule, QField, QComputed } from 'quickmodel';

interface IPost {
	id: string;
	title: string;
	body: string;
	authorId: string;
	published: boolean;
	views: number;
	createdAt: Date;
}

@Quick(
	{
		id: 'string',
		title: 'string',
		body: 'string',
		authorId: 'string',
		published: 'boolean',
		views: 'number',
		createdAt: Date,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
export class PostDto extends QModel<IPost> {
	@QField({ label: 'Title', required: true })
	@QRule(
		(v: string) => v.trim().length >= 3,
		'Title must be at least 3 chars'
	)
	@QRule(
		(v: string) => v.trim().length <= 120,
		'Title must be at most 120 chars'
	)
	declare title: string;

	@QField({ label: 'Body', required: true })
	@QRule((v: string) => v.trim().length >= 10, 'Body too short')
	declare body: string;

	declare id: string;
	declare authorId: string;
	declare published: boolean;
	declare views: number;
	declare createdAt: Date;

	@QComputed()
	get excerpt(): string {
		return this.body.length > 160
			? `${this.body.slice(0, 160)}…`
			: this.body;
	}

	@QComputed()
	get readingTimeMin(): number {
		return Math.ceil(this.body.split(/\s+/).length / 200);
	}
}
```

## Basic useSWR Hook

Use SWR's `fetcher` to coerce raw API responses into typed DTOs. `createMany()` skips items
that fail coercion and returns them in `errors[]`, so your UI never receives a broken object.

```typescript
// hooks/usePosts.ts
import useSWR from 'swr';
import { PostDto } from '../models/post.dto';

async function fetchPosts(url: string): Promise<PostDto[]> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const raw = (await res.json()) as unknown[];
	const { instances } = PostDto.createMany(raw);
	return instances;
}

export function usePosts() {
	const { data, error, isLoading, mutate } = useSWR<PostDto[]>(
		'/api/posts',
		fetchPosts
	);
	return { posts: data ?? [], error, isLoading, mutate };
}
```

```tsx
// components/PostList.tsx
export function PostList() {
	const { posts, isLoading } = usePosts();

	if (isLoading) return <p>Loading…</p>;

	return (
		<ul>
			{posts.map((post) => (
				<li key={post.id}>
					<h2>{post.title}</h2>
					<p>{post.excerpt}</p>{' '}
					{/* @QComputed — included automatically */}
					<small>{post.readingTimeMin} min read</small>
				</li>
			))}
		</ul>
	);
}
```

## Single Resource with useSWR

```typescript
// hooks/usePost.ts
import useSWR from 'swr';
import { PostDto } from '../models/post.dto';

async function fetchPost(url: string): Promise<PostDto> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return new PostDto((await res.json()) as Record<string, unknown>);
}

export function usePost(id: string) {
	const {
		data: post,
		mutate,
		isLoading,
	} = useSWR<PostDto>(id ? `/api/posts/${id}` : null, fetchPost);
	return { post, mutate, isLoading };
}
```

## Optimistic Updates with `$qCopy()`

`$qCopy()` returns a new immutable `PostDto` — pass it directly to `mutate()` as the
optimistic value, then revalidate after the server confirms the change.

```typescript
// hooks/useUpdatePost.ts
import useSWR, { useSWRConfig } from 'swr';
import { PostDto } from '../models/post.dto';

export function useUpdatePost(id: string) {
	const { mutate } = useSWRConfig();
	const { post } = usePost(id);

	async function updatePost(patch: Partial<IPost>): Promise<void> {
		if (!post) return;

		// $qCopy() creates a new immutable instance with the applied patch
		const optimistic = post.$qCopy(patch);

		await mutate(
			`/api/posts/${id}`,
			// Optimistic update: show new state immediately
			async () => {
				const res = await fetch(`/api/posts/${id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(optimistic.$qSerialize()),
				});
				if (!res.ok) throw new Error('Update failed');
				return new PostDto(
					(await res.json()) as Record<string, unknown>
				);
			},
			{
				optimisticData: optimistic,
				rollbackOnError: true,
				revalidate: true,
			}
		);
	}

	return { updatePost };
}
```

::: tip `$qCopy()` is always safe for optimistic UI
`$qCopy()` runs the full QuickModel deserialization pipeline — so `@QComputed` fields like
`excerpt` and `readingTimeMin` are recalculated automatically in the optimistic instance.
The user sees consistent derived data even before the server responds.
:::

## Validation Before Mutation

Run `$qCheckRules()` before sending a PUT/PATCH to catch client-side errors early:

```typescript
// hooks/usePublishPost.ts
import { PostDto } from '../models/post.dto';

export function usePublishPost(post: PostDto) {
	const { mutate } = useSWRConfig();

	async function publish(): Promise<{ ok: boolean; errors?: string[] }> {
		const draft = post.$qCopy({ published: true });

		// Validate before hitting the network
		const { valid, errors } = draft.$qCheckRules();
		if (!valid) {
			return {
				ok: false,
				errors: errors.map((e) => `${e.field}: ${e.message}`),
			};
		}

		await mutate(`/api/posts/${post.id}`, async () => {
			const res = await fetch(`/api/posts/${post.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(draft.$qSerialize()),
			});
			if (!res.ok) throw new Error('Publish failed');
			return new PostDto((await res.json()) as Record<string, unknown>);
		});

		return { ok: true };
	}

	return { publish };
}
```

## Skip Unnecessary PUT Calls with `$qIsDirty()`

Track user edits locally and only send the request when the model has actually changed:

```typescript
// components/PostEditor.tsx
function PostEditor({ id }: { id: string }) {
  const { post, mutate } = usePost(id);
  const [draft, setDraft] = React.useState<PostDto | null>(null);

  // Initialize draft when post loads
  React.useEffect(() => {
    if (post) setDraft(post.$qCopy({})); // snapshot baseline
  }, [post]);

  async function save() {
    if (!draft) return;
    // Skip the network call if nothing actually changed
    if (!draft.$qIsDirty()) {
      console.log('No changes detected — skipping save');
      return;
    }

    await mutate(`/api/posts/${id}`, async () => {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft.$qSerialize()),
      });
      return new PostDto((await res.json()) as Record<string, unknown>);
    });
  }

  if (!draft) return null;

  return (
    <div>
      <input
        value={draft.title}
        onChange={(e) => setDraft(draft.$qCopy({ title: e.target.value }))}
      />
      <textarea
        value={draft.body}
        onChange={(e) => setDraft(draft.$qCopy({ body: e.target.value }))}
      />
      <button onClick={save} disabled={!draft.$qIsDirty()}>
        Save changes
      </button>
    </div>
  );
}
```

## Cache Normalization

Store serialized data in the SWR cache and rehydrate when needed. `$qSerialize()` produces
plain JSON-safe objects — ideal for SWR's internal cache format.

```typescript
import { mutate } from 'swr';

// Pre-populate the cache after a POST (avoid an extra GET)
async function createPost(input: Partial<IPost>): Promise<PostDto> {
	const res = await fetch('/api/posts', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	});
	const newPost = new PostDto((await res.json()) as Record<string, unknown>);

	// Inject into the SWR cache — no extra round trip needed
	await mutate(`/api/posts/${newPost.id}`, newPost, { revalidate: false });

	// Also update the list cache optimistically
	await mutate(
		'/api/posts',
		(existing: PostDto[] = []) => [newPost, ...existing],
		{ revalidate: false }
	);

	return newPost;
}
```

## SWR with Global State (useSWRImmutable)

For reference data that rarely changes, use `useSWRImmutable` to avoid unnecessary revalidation:

```typescript
import useSWRImmutable from 'swr/immutable';

interface ICategory {
	id: string;
	name: string;
	slug: string;
}

@Quick({ id: 'string', name: 'string', slug: 'string' })
class CategoryDto extends QModel<ICategory> {
	declare id: string;
	declare name: string;
	declare slug: string;
}

async function fetchCategories(url: string): Promise<CategoryDto[]> {
	const res = await fetch(url);
	const raw = (await res.json()) as unknown[];
	return CategoryDto.createMany(raw).instances;
}

export function useCategories() {
	return useSWRImmutable<CategoryDto[]>('/api/categories', fetchCategories);
}
```

## See Also

- [React Integration](./react-integration) — hooks, useReducer, and context
- [TanStack Query Integration](./tanstack-query-integration) — server state with caching
- [Zustand Integration](./zustand-integration) — local state management
- [Validation](/en/guide/validation) — `@QRule` and `qCheckRules()`
