# Integración con Remix

Remix es un framework full-stack basado en estándares web. QuickModel encaja de forma natural
en su modelo de datos: usa DTOs en `loader` para coercionar resultados de API/BD, en `action`
para validar envíos de formularios, y a través de la frontera cliente/servidor para garantizar
tipos consistentes durante todo el ciclo de vida de la petición.

## Patrones clave

| Patrón                        | API QuickModel                                              |
| ----------------------------- | ----------------------------------------------------------- |
| Coerción en loader            | `new Dto(raw)` / `createMany(rawArray)` en `loader`         |
| Validación en action          | `qCheckRules(dto)` → devolver errores o redirigir           |
| Frontera de ruta type-safe    | `$qSerialize()` → `json(serialized)` → `new Dto(data)`      |
| Validación asíncrona          | `qCheckRulesAsync()` con consulta a BD en `action`          |
| Actualización parcial (PATCH) | `existing.$qCopy(formPatch)` → guardar instancia parcheada  |
| Detección de cambios          | `existing.$qDiff(updated)` → sólo enviar campos cambiados   |
| Computed en respuesta         | `@QComputed` — incluidos automáticamente en `$qSerialize()` |

## Instalación

```bash
npm install quickmodel
```

Activa los decoradores en `tsconfig.json` (Remix usa Vite + TypeScript):

```json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
	}
}
```

## Configuración del modelo

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
	@QField({ label: 'Título', required: true })
	@QRule(
		(v: string) => v.trim().length >= 5,
		'El título debe tener al menos 5 caracteres'
	)
	@QRule(
		(v: string) => v.trim().length <= 160,
		'El título no puede superar los 160 caracteres'
	)
	declare title: string;

	@QField({ label: 'Cuerpo', required: true })
	@QRule((v: string) => v.trim().length >= 20, 'El cuerpo es demasiado corto')
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

## Loader — Coerción de resultados de BD / API

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

  // Coercionar filas de BD en DTOs tipados y validados
  const { instances: articles } = ArticleDto.createMany(rows);

  // Serializar antes de cruzar la frontera JSON
  return json({ articles: articles.map((a) => a.$qSerialize()) });
}

export default function ArticlesPage() {
  const { articles: raw } = useLoaderData<typeof loader>();

  // Rehidratar como DTOs tipados en el cliente
  const articles = raw.map((r) => new ArticleDto(r));

  return (
    <ul>
      {articles.map((article) => (
        <li key={article.id}>
          <h2>{article.title}</h2>
          <p>{article.excerpt}</p>           {/* @QComputed */}
          <small>{article.readingTimeMin} min de lectura · {article.views} vistas</small>
        </li>
      ))}
    </ul>
  );
}
```

::: tip Serializar antes de `json()`, rehidratar tras `useLoaderData()`
Remix serializa los datos del loader como JSON. Los campos `Date` se convierten en cadenas
ISO durante el tránsito — `$qSerialize()` lo gestiona automáticamente, y `new ArticleDto(raw)`
los rehidrata de vuelta (ISO string → Date) en el cliente.
:::

## Action — Validación de envíos de formulario

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

  // Construir DTO desde form data — la coerción maneja string→boolean, etc.
  const dto = new ArticleDto({
    id: crypto.randomUUID(),
    title: formData.get('title') as string,
    body: formData.get('body') as string,
    authorId: 'autor-1', // en una app real, viene de la sesión
    published: formData.get('published') === 'on',
    views: 0,
    publishedAt: null,
  });

  const { valid, errors } = qCheckRules(dto);

  if (!valid) {
    // Devolver errores de campo al formulario
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

  // Guardar en BD usando la interfaz plana
  await db.article.create({ data: dto.$qToInterface() });

  return redirect(`/articles/${dto.id}`);
}

export default function NewArticlePage() {
  const actionData = useActionData<typeof action>();

  return (
    <Form method="post">
      <label>
        Título
        <input type="text" name="title" />
        {actionData?.errors.title && (
          <span className="error">{actionData.errors.title}</span>
        )}
      </label>
      <label>
        Cuerpo
        <textarea name="body" rows={10} />
        {actionData?.errors.body && (
          <span className="error">{actionData.errors.body}</span>
        )}
      </label>
      <label>
        <input type="checkbox" name="published" />
        Publicar inmediatamente
      </label>
      <button type="submit">Crear artículo</button>
    </Form>
  );
}
```

## Action — Actualización parcial (PATCH)

```typescript
// app/routes/articles.$id.edit.tsx
export async function action({ request, params }: ActionFunctionArgs) {
	const { id } = params as { id: string };

	// Cargar el registro existente
	const row = await db.article.findUniqueOrThrow({ where: { id } });
	const existing = new ArticleDto(row);

	const formData = await request.formData();

	// Aplicar sólo los campos presentes en el formulario
	const updated = existing.$qCopy({
		title: formData.get('title') as string,
		body: formData.get('body') as string,
	});

	// Validar el estado parcheado
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

	// Persistir sólo los campos cambiados
	const diff = existing.$qDiff(updated);
	if (Object.keys(diff).length > 0) {
		await db.article.update({ where: { id }, data: diff });
	}

	return redirect(`/articles/${id}`);
}
```

## Validación asíncrona — Unicidad de slug

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
		'Este slug ya está en uso'
	)
	slug = '';

	title = '';
}

// En el action:
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

	// ... continuar con la creación
}
```

## Ruta de recurso — API pura (resource route)

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

	return json({ error: 'Método no permitido' }, { status: 405 });
}
```

## Ver también

- [Integración con Backend](./backend-integration) — Express, Fastify, Hono
- [Integración con Prisma](./prisma-integration) — capa ORM con DTOs
- [Validación](/es/guide/validation) — `@QRule`, `qCheckRules()`, `qCheckRulesAsync()`
