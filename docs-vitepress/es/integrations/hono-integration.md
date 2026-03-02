# Hono

[Hono](https://hono.dev) es un framework web ligero y listo para edge que funciona en Cloudflare Workers, Deno, Bun, Node.js y más. Los DTOs de QuickModel actúan como la capa de request/response tipada — coerción, validación y serialización ocurren en el edge sin necesidad de herramientas de build adicionales.

## Referencia rápida

| Característica          | Hono solo    | Con QuickModel                            |
| ----------------------- | ------------ | ----------------------------------------- |
| Tipado del body         | Manual       | ✅ `new Dto(body)` — coerción + stripping |
| Validación              | Zod / custom | ✅ `qCheckRules()` / `qCheckRulesAsync()` |
| Serialización respuesta | Manual       | ✅ `dto.$qSerialize()`                    |
| Campos computados       | Manual       | ✅ `@QComputed`                           |
| Creación masiva         | Manual       | ✅ `createMany()`                         |
| Parseo de formularios   | Manual       | ✅ `Dto.fromFormData(formData)`           |

## Instalación

```bash
# Node.js / Bun
npm install hono quickmodel

# Deno
import { Hono } from 'https://deno.land/x/hono/mod.ts';
```

## Ruta básica — DTO de request + DTO de response

```typescript
import { Hono } from 'hono';
import { QModel, Quick, QRule, QComputed, QField } from 'quickmodel';
import { qCheckRules } from 'quickmodel/forms';

const app = new Hono();

interface ICrearUsuario {
	nombre: string;
	email: string;
	edad: number;
	rol: string;
}

@Quick(
	{ nombre: 'string', email: 'string', edad: 'number', rol: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CrearUsuarioDto extends QModel<ICrearUsuario> {
	@QRule(
		(val: string) => val.trim().length >= 2,
		'El nombre debe tener al menos 2 caracteres'
	)
	declare nombre: string;

	@QRule((val: string) => val.includes('@'), 'Formato de email inválido')
	declare email: string;

	@QRule(
		(val: number) => val >= 18 && val <= 120,
		'La edad debe estar entre 18 y 120'
	)
	declare edad: number;

	declare rol: string;

	@QComputed()
	get etiqueta(): string {
		return `${this.nombre} (${this.rol})`;
	}
}

// POST /usuarios
app.post('/usuarios', async (c) => {
	const body = await c.req.json<object>();
	const dto = new CrearUsuarioDto(body);
	const { valid, errors } = qCheckRules(dto);

	if (!valid) {
		return c.json(
			{
				errors: errors.map((e) => ({
					field: e.field,
					message: e.message,
				})),
			},
			400
		);
	}

	// dto.$qSerialize() — JSON-safe, incluye @QComputed, elimina campos desconocidos
	const creado = await db.usuarios.insertar(dto.$qSerialize());
	return c.json(creado, 201);
});
```

## Middleware — Validación centralizada

Extrae la validación en middleware reutilizable para no repetir `qCheckRules()` en cada ruta:

```typescript
import type { Context, Next } from 'hono';
import { qCheckRules } from 'quickmodel/forms';

// Factory genérica de middleware de validación
function validarDto<TDto extends QModel<object>>(
	DtoClass: new (data: object) => TDto
) {
	return async (c: Context, next: Next) => {
		const body = await c.req.json<object>();
		const dto = new DtoClass(body);
		const { valid, errors } = qCheckRules(dto);

		if (!valid) {
			return c.json(
				{
					errors: errors.map((e) => ({
						field: e.field,
						message: e.message,
					})),
				},
				400
			);
		}

		// Adjuntar el DTO validado al contexto para el handler
		c.set('dto', dto);
		return next();
	};
}

// Uso:
app.post('/usuarios', validarDto(CrearUsuarioDto), (c) => {
	const dto = c.get('dto') as CrearUsuarioDto;
	return c.json(dto.$qSerialize(), 201);
});
```

## Ruta GET — DTO de respuesta

Pasa siempre las respuestas de la API por un DTO antes de devolverlas — elimina campos internos, coerciona tipos y añade campos `@QComputed`:

```typescript
interface IUsuarioRespuesta {
	id: string;
	nombre: string;
	email: string;
	rol: string;
	edad: number;
	creadoEn: Date;
}

@Quick(
	{
		id: 'string',
		nombre: 'string',
		email: 'string',
		rol: 'string',
		edad: 'number',
		creadoEn: Date,
	},
	{ unknownPropertyPolicy: 'strip' }
)
class UsuarioRespuestaDto extends QModel<IUsuarioRespuesta> {
	declare id: string;
	declare nombre: string;
	declare email: string;
	declare rol: string;
	declare edad: number;
	declare creadoEn: Date;

	@QComputed()
	get miembroDesde(): string {
		return this.creadoEn.getFullYear().toString();
	}
}

// GET /usuarios/:id
app.get('/usuarios/:id', async (c) => {
	const usuario = await db.usuarios.findById(c.req.param('id'));
	if (!usuario) return c.json({ error: 'No encontrado' }, 404);

	// Envuelve en DTO — elimina campos privados de la DB, añade campos computados
	return c.json(new UsuarioRespuestaDto(usuario).$qSerialize());
});
```

## GET masivo — `createMany()`

```typescript
// GET /usuarios
app.get('/usuarios', async (c) => {
	const filas = await db.usuarios.findAll();

	// createMany() coerciona y limpia todas las filas en una pasada
	const { instances } = UsuarioRespuestaDto.createMany(filas);
	return c.json(instances.map((dto) => dto.$qSerialize()));
});
```

## Validación asíncrona — unicidad en servidor

```typescript
import { qCheckRulesAsync } from 'quickmodel/forms';

interface IRegistro {
	email: string;
	password: string;
	nombre: string;
}

@Quick(
	{ email: 'string', password: 'string', nombre: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class RegistroDto extends QModel<IRegistro> {
	@QRule(async (val: string) => {
		const existente = await db.usuarios.findByEmail(val);
		return existente === null;
	}, 'Email ya registrado')
	declare email: string;

	@QRule(
		(val: string) => val.length >= 8,
		'La contraseña debe tener al menos 8 caracteres'
	)
	declare password: string;

	declare nombre: string;
}

app.post('/registro', async (c) => {
	const body = await c.req.json<object>();
	const dto = new RegistroDto(body);
	const { valid, errors } = await qCheckRulesAsync(dto);

	if (!valid) return c.json({ errors }, 422);

	const usuario = await db.usuarios.create(dto.$qSerialize());
	return c.json(new UsuarioRespuestaDto(usuario).$qSerialize(), 201);
});
```

## Rutas con FormData

Hono es habitual en APIs de formularios. Usa `Dto.fromFormData()` para parsear `FormData` directamente:

```typescript
app.post('/subir-perfil', async (c) => {
	const formData = await c.req.formData();

	// fromFormData() coerciona todos los valores string a los tipos declarados
	const dto = CrearUsuarioDto.fromFormData(formData);
	const { valid, errors } = qCheckRules(dto);

	if (!valid) return c.json({ errors }, 400);
	return c.json(dto.$qSerialize(), 201);
});
```

## Manejador de errores — forma uniforme

```typescript
app.onError((err, c) => {
	console.error(err);
	return c.json({ error: 'Error interno del servidor' }, 500);
});

app.notFound((c) => c.json({ error: 'No encontrado' }, 404));
```

## Cloudflare Workers — Despliegue en edge

QuickModel no tiene dependencias de Node.js — funciona nativamente en Cloudflare Workers, Deno Deploy y Bun:

```typescript
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-workers';
import { CrearUsuarioDto } from './dtos/usuario';
import { qCheckRules } from 'quickmodel/forms';

const app = new Hono();

app.post('/api/usuarios', async (c) => {
	const body = await c.req.json<object>();
	const dto = new CrearUsuarioDto(body);
	const { valid, errors } = qCheckRules(dto);

	if (!valid) return c.json({ errors }, 400);
	return c.json(dto.$qSerialize(), 201);
});

export default handle(app);
```

## Hono vs Express vs NestJS

| Característica         | Hono       | Express      | NestJS                 |
| ---------------------- | ---------- | ------------ | ---------------------- |
| Listo para edge        | ✅ Nativo  | ❌ Solo Node | ❌ Solo Node           |
| Tamaño de bundle       | ~12 KB     | ~200 KB      | ~5 MB+                 |
| TypeScript-first       | ✅         | Parcial      | ✅                     |
| Inyección dependencias | ❌         | ❌           | ✅                     |
| Integración QModel     | ✅ Directa | ✅ Directa   | ✅ Interceptores/Pipes |

## Ver también

- [Integración Backend](./backend-integration) — Express / Fastify / Hono general
- [Integración con NestJS](./nestjs-integration) — servidor empresarial con DI
- [Integración con tRPC](./trpc-integration) — type safety end-to-end
- [Integración con MSW](./msw-integration) — mockear APIs Hono en tests
