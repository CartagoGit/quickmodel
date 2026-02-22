# Integración con MSW

Mock Service Worker (MSW) intercepta peticiones de red en tests y en el navegador. QuickModel
actúa como la **capa de datos** dentro de los handlers de MSW — convirtiendo los cuerpos de
las peticiones en DTOs tipados, validándolos con `@QRule`, y devolviendo respuestas serializadas
con tipos correctos.

## Patrones Clave

| Patrón                      | API de QuickModel                             |
| --------------------------- | --------------------------------------------- |
| Coerción del cuerpo         | `new Dto(body)` + `coercionStrategy: 'loose'` |
| Validación en el handler    | `dto.checkRules()` → 422 si hay error         |
| Serialización de respuesta  | `dto.serialize()` → `HttpResponse.json()`     |
| Factories de fixtures       | `new Dto(defaults)` con `serialize()`         |
| Datos mock masivos          | `Dto.createMany(seedArray)`                   |
| Eliminación de campos priv. | `unknownPropertyPolicy: 'strip'`              |

## Instalación

```bash
npm install @cartago-git/quickmodel msw
```

## Configuración del Modelo

Define DTOs separados para lectura (incluye `id`) y escritura (solo datos del usuario):

```typescript
import {
	QModel,
	Quick,
	QRule,
	QField,
	QComputed,
} from '@cartago-git/quickmodel';

// DTO de lectura — para respuestas GET y store en memoria
@Quick(
	{
		id: 'string',
		username: 'string',
		email: 'string',
		age: 'number',
		role: 'string',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UsuarioDto extends QModel<IUsuario> {
	declare id: string;
	declare username: string;
	declare email: string;
	declare age: number;
	declare role: string;

	@QComputed()
	get nombreMostrado(): string {
		return `${this.username} (${this.role})`;
	}
}

// DTO de escritura — para cuerpos de peticiones POST/PUT
@Quick(
	{ username: 'string', email: 'string', age: 'number', role: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CrearUsuarioDto extends QModel<ICrearUsuario> {
	@QField({ label: 'Usuario', required: true })
	@QRule((v: string) => v.length >= 3, 'Usuario demasiado corto')
	@QRule(
		(v: string) => /^[a-z0-9_]+$/.test(v),
		'Formato de usuario no válido'
	)
	declare username: string;

	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Email no válido'
	)
	declare email: string;

	@QField({ label: 'Edad' })
	@QRule((v: number) => v >= 18, 'Debes tener 18 años o más')
	declare age: number;

	@QField({ label: 'Rol' })
	@QRule(
		(v: string) => ['user', 'admin', 'editor'].includes(v),
		'Rol no válido'
	)
	declare role: string;
}
```

> **`coercionStrategy: 'loose'`** en `CrearUsuarioDto` gestiona peticiones FormData o JSON
> que envían `age` como string (`"25"` → `25`).

## Handler GET

```typescript
import { http, HttpResponse } from 'msw';

// Store en memoria — sembrado desde DTOs tipados
const { instances: usuariosSemilla } = UsuarioDto.createMany([
	{
		id: 'u1',
		username: 'alice',
		email: 'alice@example.com',
		age: 30,
		role: 'admin',
	},
	{
		id: 'u2',
		username: 'bob',
		email: 'bob@example.com',
		age: 25,
		role: 'user',
	},
]);
const store = new Map(usuariosSemilla.map((u) => [u.id, u]));

export const handlers = [
	http.get('/api/usuarios/:id', ({ params }) => {
		const usuario = store.get(params.id as string);
		if (!usuario) {
			return HttpResponse.json(
				{ error: 'Usuario no encontrado' },
				{ status: 404 }
			);
		}
		// serialize() elimina campos @QComputed e interno
		return HttpResponse.json(usuario.serialize(), { status: 200 });
	}),

	http.get('/api/usuarios', () => {
		const usuarios = [...store.values()].map((u) => u.serialize());
		return HttpResponse.json(usuarios, { status: 200 });
	}),
];
```

## Handler POST — Validar Cuerpo de la Petición

Convierte el cuerpo con `CrearUsuarioDto` y luego valida con `checkRules()`:

```typescript
http.post('/api/usuarios', async ({ request }) => {
	const body = await request.json();

	// Coercionar y sanear — elimina campos desconocidos automáticamente
	const dto = new CrearUsuarioDto(body);
	const { valid, errors } = dto.checkRules();

	if (!valid) {
		return HttpResponse.json({ errors }, { status: 422 });
	}

	// Añadir campos generados por el servidor y persistir
	const creado: IUsuario = {
		...(dto.serialize() as ICrearUsuario),
		id: crypto.randomUUID(),
	};
	const usuarioGuardado = new UsuarioDto(creado);
	store.set(usuarioGuardado.id, usuarioGuardado);

	return HttpResponse.json(usuarioGuardado.serialize(), { status: 201 });
});
```

## Factory de Fixtures Reutilizable

Crea factories de fixtures tipados para datos de prueba:

```typescript
function crearFixtureUsuario(
	sobreescrituras: Partial<IUsuario> = {}
): UsuarioDto {
	return new UsuarioDto({
		id: 'fixture-id',
		username: 'test_user',
		email: 'test@example.com',
		age: 25,
		role: 'user',
		...sobreescrituras,
	});
}

// Uso en tests
const admin = crearFixtureUsuario({ role: 'admin', username: 'admin_user' });
const response = HttpResponse.json(admin.serialize(), { status: 200 });
```

## Uso en Tests

```typescript
import { setupServer } from 'msw/node';

const server = setupServer(
	http.get('/api/usuarios/:id', ({ params }) => {
		const fixture = crearFixtureUsuario({ id: params.id as string });
		return HttpResponse.json(fixture.serialize());
	})
);

beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

test('GET /api/usuarios/:id devuelve usuario tipado', async () => {
	const res = await fetch('/api/usuarios/fixture-id');
	const data = await res.json();
	const usuario = new UsuarioDto(data);

	expect(usuario).toBeInstanceOf(UsuarioDto);
	expect(usuario.nombreMostrado).toBe('test_user (user)');
});
```

## Eliminación de Campos Privados

`unknownPropertyPolicy: 'strip'` asegura que los campos internos del servidor (p.ej. `_csrf`,
`_hash`) se eliminen antes de la serialización, evitando su exposición accidental:

```typescript
const respuestaServidor = {
	id: 'u1',
	username: 'alice',
	email: 'alice@example.com',
	age: 30,
	role: 'admin',
	_csrf: 'token-secreto', // interno — se eliminará
	_hash: 'abc123', // interno — se eliminará
};

const usuario = new UsuarioDto(respuestaServidor);
const serializado = usuario.serialize();
// serializado no tiene _csrf ni _hash — seguro para enviar al cliente
```

## Coerción de Fechas en Respuestas

QuickModel convierte strings ISO de vuelta a objetos `Date` automáticamente:

```typescript
@Quick(
	{ id: 'string', titulo: 'string', cuerpo: 'string', creadoEn: Date },
	{ unknownPropertyPolicy: 'strip' }
)
class PostDto extends QModel<IPost> {
	declare id: string;
	declare titulo: string;
	declare cuerpo: string;
	declare creadoEn: Date;

	@QComputed()
	get vista(): string {
		return this.cuerpo.length > 100
			? this.cuerpo.slice(0, 100) + '...'
			: this.cuerpo;
	}
}

// En el handler — el string ISO de la BD se convierte a Date:
const post = new PostDto({
	id: '1',
	titulo: 'Hola',
	cuerpo: 'Mundo',
	creadoEn: '2024-01-15T10:30:00Z',
});
console.log(post.creadoEn instanceof Date); // true
```

## Ver También

- [Referencia de la API QModel](./qmodel.md)
- [Integración con Backend](./backend-integration.md)
- [Serialización](./serialization.md)
