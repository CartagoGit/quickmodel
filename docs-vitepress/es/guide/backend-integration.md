# Integración con Backend (Express / Fastify / Hono)

QuickModel actúa como capa de DTO para frameworks Node.js. Proporciona coerción de tipos automática, stripping de campos desconocidos, validación y enriquecimiento de respuestas con `@QComputed` — reemplazando `class-validator` + `class-transformer` en cualquier runtime.

## Patrones principales

| Problema                           | Solución QuickModel                          |
| ---------------------------------- | -------------------------------------------- |
| Coerción del cuerpo de la petición | `@Quick({ ... })` + `new Dto(req.body)`      |
| Eliminar campos desconocidos       | `unknownPropertyPolicy: 'strip'`             |
| Validación (síncrona/asíncrona)    | `dto.checkRules()` / `qCheckRulesAsync(dto)` |
| Enriquecimiento de respuesta       | `@QComputed()` + `dto.serialize()`           |
| Procesamiento en lote              | `Dto.createMany(array)`                      |

## Express

### Middleware de validación

```typescript
// middleware/validate-body.ts
import type { Request, Response, NextFunction } from 'express';
import { QModel } from '@cartago-git/quickmodel';

export function validateBody<TDto extends QModel<object>>(
	DtoClass: new (data: object) => TDto
) {
	return (req: Request, res: Response, next: NextFunction) => {
		try {
			const dto = new DtoClass(req.body);
			const validation = dto.checkRules();
			if (!validation.valid) {
				res.status(422).json({ errors: validation.errors });
				return;
			}
			(req as any).dto = dto;
			next();
		} catch {
			res.status(400).json({ error: 'Cuerpo de petición inválido' });
		}
	};
}
```

### Definición de DTO

```typescript
// dto/create-user.dto.ts
import {
	QModel,
	Quick,
	QRule,
	QField,
	QComputed,
} from '@cartago-git/quickmodel';

@Quick(
	{ username: 'string', email: 'string', age: 'number', role: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
export class CreateUserDto extends QModel<ICreateUser> {
	@QField({ label: 'Nombre de usuario', required: true })
	@QRule((v: string) => v.length >= 3, 'Nombre muy corto')
	declare username: string;

	@QField({ label: 'Email', widget: 'email' })
	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Email inválido'
	)
	declare email: string;

	@QField({ label: 'Edad' })
	@QRule((v: number) => v >= 18, 'Debes ser mayor de edad')
	declare age: number;

	@QField({ label: 'Rol' })
	@QRule(
		(v: string) => ['admin', 'editor', 'viewer'].includes(v),
		'Rol inválido'
	)
	declare role: string;

	@QComputed()
	get displayName(): string {
		return `${this.username} (${this.role})`;
	}
}
```

### Manejador de ruta

```typescript
// routes/users.ts
router.post('/users', validateBody(CreateUserDto), (req, res) => {
	const dto = (req as any).dto as CreateUserDto;
	// dto está coercionado, validado y sin campos extras
	res.status(201).json(dto.serialize());
	// la respuesta incluye @QComputed displayName
});
```

## Fastify

### Hook preHandler

```typescript
// plugins/dto-validation.ts
export function dtoValidator<TDto extends QModel<object>>(
	DtoClass: new (data: object) => TDto
) {
	return async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const dto = new DtoClass(request.body as object);
			const validation = dto.checkRules();
			if (!validation.valid) {
				reply.code(422).send({ errors: validation.errors });
				return;
			}
			(request as any).dto = dto;
		} catch {
			reply.code(400).send({ error: 'Petición malformada' });
		}
	};
}
```

### Registro de rutas

```typescript
fastify.post('/invoices', {
	preHandler: dtoValidator(CreateInvoiceDto),
	handler: async (request, reply) => {
		const dto = (request as any).dto as CreateInvoiceDto;
		const saved = await invoiceService.save(dto.serialize());
		reply.code(201).send(saved);
	},
});
```

### Serialización de respuesta con @QComputed

```typescript
@Quick(
	{
		id: 'string',
		amount: 'number',
		currency: 'string',
		dueDate: Date,
		paid: 'boolean',
	},
	{ unknownPropertyPolicy: 'strip' }
)
class InvoiceDto extends QModel<IInvoice> {
	declare id: string;
	declare amount: number;
	declare currency: string;
	declare dueDate: Date;
	declare paid: boolean;

	@QComputed()
	get formattedAmount(): string {
		return `${this.amount.toFixed(2)} ${this.currency.toUpperCase()}`;
	}

	@QComputed()
	get isOverdue(): boolean {
		return !this.paid && this.dueDate < new Date();
	}
}
```

## Hono

### Middleware validador

```typescript
// middleware/q-validator.ts
export function qValidator<TDto extends QModel<object>>(
	DtoClass: new (data: object) => TDto,
	onSuccess: (dto: TDto, c: Context) => Promise<Response>
) {
	return async (c: Context, next: Next) => {
		const body = await c.req.json<object>();
		try {
			const dto = new DtoClass(body);
			const validation = dto.checkRules();
			if (!validation.valid) {
				return c.json({ errors: validation.errors }, 422);
			}
			return await onSuccess(dto, c);
		} catch {
			return c.json({ error: 'Petición incorrecta' }, 400);
		}
	};
}

// Uso:
app.post(
	'/users',
	qValidator(CreateUserDto, async (dto, c) => {
		return c.json(dto.serialize(), 201);
	})
);
```

## Validación asíncrona — Duplicados

```typescript
class RegistrationDto extends QModel<IRegistration> {
	@QRule(async (email: string) => {
		const exists = await db.users.exists({ email });
		return !exists;
	}, 'Email ya registrado')
	declare email: string;
}

// En el manejador de ruta:
const dto = new RegistrationDto(req.body);
const result = await qCheckRulesAsync(dto, { mode: 'parallel' });
if (!result.valid) {
	return res.status(422).json({ errors: result.errors });
}
```

## Patrón repositorio

```typescript
export class BlogPostRepository {
	private store = new Map<string, BlogPostModel>();

	create(data: object): object {
		const post = new BlogPostModel(data);
		this.store.set(post.id, post);
		return post.serialize();
	}

	publish(id: string): object | null {
		const post = this.store.get(id);
		if (!post) return null;
		// merge() es INMUTABLE — captura la nueva instancia
		const published = post.merge({ publishedAt: new Date() });
		this.store.set(id, published);
		return published.serialize();
	}
}
```

## Procesamiento en lote con createMany()

```typescript
// Procesar datos de colas de mensajes o APIs batch
const raw: unknown[] = await queue.receive();
const { instances, errors } = OrderItemDto.createMany(raw);

if (errors.length) {
	logger.warn(`${errors.length} ítems fallaron la coerción`, errors);
}

await orderService.bulkCreate(instances.map((i) => i.serialize()));
```

## JSON Schema para OpenAPI / Swagger

```typescript
const schema = new CreateUserDto({ ... }).getSchema('json');
// Integrar con @fastify/swagger o swagger-jsdoc
fastify.addSchema({
  $id: 'CreateUserBody',
  ...schema,
});
```

::: tip coercionStrategy: 'loose'
Cuando recibes datos de APIs externas o colas de mensajes, usa `coercionStrategy: 'loose'` para convertir strings automáticamente a los tipos primitivos esperados.
:::
