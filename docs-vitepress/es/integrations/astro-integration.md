# Integración con Astro

QuickModel funciona de forma natural en proyectos Astro — tanto en el servidor (rutas API, Astro Actions,
cargadores de contenido) como en islas de cliente (React, Solid, Vue, Svelte). La validación de DTOs en
el edge, `createMany()` para carga de datos en tiempo de compilación y `$qSerialize()` para transferencia
segura server→client son los tres patrones de integración principales.

## Patrones clave

| Caso de uso                | Solución QuickModel                                      |
| -------------------------- | -------------------------------------------------------- |
| Validación en ruta API     | DTO + `$qCheckRules()` en endpoints `.ts`                |
| Astro Actions (RPC tipado) | DTO dentro del handler de `defineAction()`               |
| Colecciones de contenido   | `createMany()` para coerción masiva de entradas          |
| Carga de datos en build    | `createMany()` en `getStaticPaths()` / `getCollection()` |
| Hidratación de islas       | `$qSerialize()` como props de Astro                      |
| Manejo de formularios      | Constructor estático `fromFormData()`                    |

## Definiendo un DTO

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
	@QField({ label: 'Nombre', required: true })
	@QRule((v: string) => v.trim().length >= 2, 'Nombre demasiado corto')
	declare name: string;

	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Email inválido'
	)
	declare email: string;

	@QField({ label: 'Mensaje', required: true })
	@QRule((v: string) => v.trim().length >= 10, 'Mensaje demasiado corto')
	declare message: string;

	declare createdAt: Date;
}
```

## Ruta API — endpoint POST

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

	// persistir / enviar email
	await saveContact(dto.$qSerialize());

	return Response.json({ ok: true }, { status: 201 });
};
```

## Astro Actions — Mutaciones Tipadas

Las Astro Actions ofrecen funciones de servidor con tipado end-to-end. QuickModel gestiona la
coerción y validación antes de la lógica de negocio:

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

Usando la action en un componente:

```astro
---
// No se necesita lógica de servidor en el fichero .astro
---
<form>
  <input name="name" />
  <input name="email" type="email" />
  <textarea name="message"></textarea>
  <button type="submit">Enviar</button>
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

## Manejo de FormData

Las acciones de formulario en Astro suelen usar `multipart/form-data`. Usa el constructor estático `fromFormData()`:

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

	return Response.json({ message: 'Cuenta creada' }, { status: 201 });
};
```

## Carga en Tiempo de Compilación — `getStaticPaths()`

Usa `createMany()` para coercionar y validar datos en tiempo de build:

```typescript
---
// src/pages/products/[slug].astro
import { ProductModel } from '../../models/product.model';

export async function getStaticPaths() {
  const rawProducts = await fetch('https://api.example.com/products')
    .then(r => r.json());

  const { instances, errors } = ProductModel.createMany(rawProducts);

  if (errors.length) {
    console.warn(`${errors.length} productos omitidos durante el build`);
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

## Contenido del Servidor con Content Collections

Para contenido dirigido por CMS, combina las content collections de Astro con `createMany()`:

```typescript
// src/pages/blog/index.astro (bloque de script del servidor)
import { getCollection } from 'astro:content';
import { BlogPostModel } from '../../models/blog-post.model';

const entries = await getCollection('blog');
const rawPosts = entries.map((entry) => entry.data);

const { instances: posts, errors } = BlogPostModel.createMany(rawPosts);
// posts → BlogPostModel[] con coerción de Date, todos los campos @QComputed listos
```

## Hidratación de Islas — Pasando DTOs como Props

`$qSerialize()` devuelve un objeto plano serializable, seguro para pasar como props de Astro a través
del boundary servidor/cliente:

```astro
---
import UserProfile from '../components/UserProfile.tsx';
import { UserModel } from '../models/user.model';

const raw = await fetchUser(Astro.params.id!);
const user = new UserModel(raw);
---

<!-- user.$qSerialize() es un objeto plano — seguro para serializar como prop de Astro -->
<UserProfile client:load user={user.$qSerialize()} />
```

```tsx
// src/components/UserProfile.tsx (isla React)
import { UserModel } from '../models/user.model';

export default function UserProfile({ user }: { user: object }) {
	// Re-hidratar el modelo en el cliente
	const model = new UserModel(user);
	const { valid } = model.$qCheckRules();

	return (
		<div>
			<h2>{model.displayName}</h2>
			{!valid && <p>Perfil incompleto</p>}
		</div>
	);
}
```

## Validación Asíncrona — Unicidad de Email

Para rutas API de Astro que necesitan validación asíncrona (p.ej. consultas a base de datos):

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

## Middleware — Factoría de Validación Reutilizable

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
		return dto; // devuelve el DTO tipado para usar en el handler
	};
}
```

## Comparativa: Astro + QuickModel vs Zod solo

| Característica                         | Zod                         | QuickModel                       |
| -------------------------------------- | --------------------------- | -------------------------------- |
| Coerción en el límite de entrada       | `z.coerce.*`                | `@Quick({ date: Date })`         |
| Reglas de validación enriquecidas      | `.refine()`                 | `@QRule` con acceso completo     |
| Métodos de instancia (`$qCopy()` etc.) | ❌                          | ✅ ciclo de vida OOP completo    |
| Soporte `fromFormData()`               | Manual                      | ✅ incorporado                   |
| Funciona en Astro Actions              | ✅ (como schema `input`)    | ✅ (como lógica del handler)     |
| Serialización para props SSR           | Salida manual de `.parse()` | `$qSerialize()` — siempre seguro |

::: tip Astro + Zod para schemas de Action, QuickModel para lógica de negocio
Lo mejor de ambos mundos: usa el schema `input` de Zod en `defineAction()` para la inferencia de tipos
de Astro, y luego construye de inmediato un DTO de QuickModel para coerción más rica, validación con
`@QRule` y patrones de actualización con `$qCopy()`.
:::

## Ver también

- [Validación](/es/guide/validation) — `@QRule` y `qCheckRules()`
- [Coerción](/es/guide/transformers) — transformadores de tipo `@Quick`
- [Integración con Remix](./remix-integration) — patrón similar SSR + formularios
- [Integración con Backend](./backend-integration) — Express / Fastify / Hono
