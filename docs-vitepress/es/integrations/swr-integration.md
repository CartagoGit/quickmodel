# Integración con SWR

SWR (de Vercel) es una librería de data-fetching para React centrada en el estado del servidor.
QuickModel encaja de forma natural: usa DTOs para coercionar respuestas de API, adjuntar campos
calculados y validar mutaciones antes de enviarlas.

## Patrones clave

| Patrón                       | API QuickModel                                               |
| ---------------------------- | ------------------------------------------------------------ |
| Coerción de respuestas       | `createMany(rawArray)` en el fetcher de useSWR               |
| Campos calculados en caché   | `@QComputed` — disponibles al instanciar DTOs desde la caché |
| Actualización optimista      | `$qCopy(patch)` — crea instancia inmutable antes de mutate() |
| Validación antes de mutar    | `qCheckRules(dto)` — evita requests con datos inválidos      |
| Saltar PUT innecesario       | `existing.$qIsDirty()` — sólo llama a mutate si hay cambios  |
| Normalizar caché serializada | `$qSerialize()` para almacenar en caché como objeto plano    |

## Instalación

```bash
npm install quickmodel swr
```

## Configuración del modelo

```typescript
// src/models/post.dto.ts
import { QModel, Quick, QRule, QField, QComputed } from 'quickmodel';

interface IPost {
	id: number;
	userId: number;
	title: string;
	body: string;
	tags: string[];
	publishedAt: Date;
}

@Quick(
	{
		id: 'number',
		userId: 'number',
		title: 'string',
		body: 'string',
		tags: 'array',
		publishedAt: Date,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
export class PostDto extends QModel<IPost> {
	@QField({ label: 'Título', required: true })
	@QRule(
		(v: string) => v.trim().length >= 5,
		'El título debe tener al menos 5 caracteres'
	)
	@QRule(
		(v: string) => v.trim().length <= 120,
		'El título debe tener como máximo 120 caracteres'
	)
	declare title: string;

	@QField({ label: 'Cuerpo', required: true })
	@QRule((v: string) => v.trim().length >= 10, 'El cuerpo es demasiado corto')
	declare body: string;

	declare id: number;
	declare userId: number;
	declare tags: string[];
	declare publishedAt: Date;

	@QComputed()
	get tagCount(): number {
		return this.tags.length;
	}

	@QComputed()
	get preview(): string {
		return this.body.length > 150
			? `${this.body.slice(0, 150)}…`
			: this.body;
	}
}
```

## useSWR básico con `createMany()`

```typescript
// src/hooks/usePosts.ts
import useSWR from 'swr';
import { PostDto } from '@/models/post.dto';

async function fetchPosts(url: string): Promise<PostDto[]> {
	const res = await fetch(url);
	if (!res.ok) throw new Error('No se pudo cargar la lista de posts');
	const raw: unknown[] = await res.json();
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
// src/components/PostList.tsx
import { usePosts } from '@/hooks/usePosts';

export function PostList() {
	const { posts, isLoading } = usePosts();

	if (isLoading) return <p>Cargando…</p>;

	return (
		<ul>
			{posts.map((post) => (
				<li key={post.id}>
					<strong>{post.title}</strong> {/* @QComputed */}
					<span> · {post.tagCount} etiquetas</span>
					<p>{post.preview}</p>
				</li>
			))}
		</ul>
	);
}
```

## Recurso individual

```typescript
// src/hooks/usePost.ts
import useSWR from 'swr';
import { PostDto } from '@/models/post.dto';

async function fetchPost(url: string): Promise<PostDto> {
	const res = await fetch(url);
	if (!res.ok) throw new Error('Post no encontrado');
	return new PostDto(await res.json());
}

export function usePost(id: number) {
	return useSWR<PostDto>(`/api/posts/${id}`, fetchPost);
}
```

## Actualización optimista con `$qCopy()`

```typescript
// src/hooks/useUpdatePost.ts
import useSWR, { useSWRConfig } from 'swr';
import { qCheckRules } from 'quickmodel/forms';
import { PostDto } from '@/models/post.dto';

export function useUpdatePost(id: number) {
	const { mutate } = useSWRConfig();

	return async function updatePost(patch: Partial<IPost>): Promise<void> {
		const key = `/api/posts/${id}`;
		const currentData = await fetch(key).then((r) => r.json());
		const existing = new PostDto(currentData);

		// Aplicar el parche de forma inmutable
		const updated = existing.$qCopy(patch);

		// Validar antes de enviar
		const { valid, errors } = qCheckRules(updated);
		if (!valid) throw new Error(errors[0]?.message ?? 'Datos inválidos');

		// Saltar si no hay cambios reales
		if (!existing.$qIsDirty()) return;

		await mutate(
			key,
			async () => {
				const res = await fetch(key, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(updated.$qSerialize()),
				});
				if (!res.ok) throw new Error('Error al actualizar el post');
				return new PostDto(await res.json());
			},
			{
				optimisticData: updated,
				rollbackOnError: true,
				revalidate: false,
			}
		);
	};
}
```

## Persistencia en caché con `$qSerialize()`

```typescript
// src/lib/swr-local-storage-provider.ts
import { PostDto } from '@/models/post.dto';

export function localStorageProvider() {
	const map = new Map<string, unknown>(
		JSON.parse(localStorage.getItem('swr-cache') ?? '[]')
	);

	window.addEventListener('beforeunload', () => {
		// Serializar instancias QuickModel antes de guardar
		const entries = Array.from(map.entries()).map(([key, value]) => {
			if (value instanceof PostDto) return [key, value.$qSerialize()];
			return [key, value];
		});
		localStorage.setItem('swr-cache', JSON.stringify(entries));
	});

	return map;
}
```

## Datos de referencia con `useSWRImmutable`

```typescript
import useSWRImmutable from 'swr/immutable';
import { PostDto } from '@/models/post.dto';

// Los datos de referencia no cambian — se obtienen una vez
export function useArchivedPosts() {
	return useSWRImmutable<PostDto[]>('/api/posts/archived', async (url) => {
		const raw: unknown[] = await fetch(url).then((r) => r.json());
		const { instances } = PostDto.createMany(raw);
		return instances;
	});
}
```

## Ver también

- [Integración con React](./react-integration) — hooks y estado local
- [Integración con TanStack Query](./tanstack-query-integration) — alternativa para data fetching
- [Validación](/es/guide/validation) — `@QRule`, `qCheckRules()`
