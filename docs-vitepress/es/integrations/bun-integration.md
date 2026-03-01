# Integración con Bun.js

QuickModel funciona como capa de **DTOs y validación sin dependencias externas** dentro de servidores Bun. Convierte los cuerpos JSON en modelos tipados, elimina campos desconocidos para mayor seguridad, ejecuta validaciones síncronas y asíncronas con `@QRule`, y serializa respuestas enriquecidas con `@QComputed` — todo sin ninguna librería externa.

## Patrones clave

| Preocupación              | Solución QuickModel                                    |
| ------------------------- | ------------------------------------------------------ |
| Coerción del body         | `@Quick({ ... })` + `new Dto(await req.json())`        |
| Eliminar campos extra     | `unknownPropertyPolicy: 'strip'`                       |
| Validación (síncrona)     | `dto.checkRules()`                                     |
| Validación (asíncrona)    | `qCheckRulesAsync(dto)` (unicidad en BD, apis remotas) |
| Enriquecimiento respuesta | `@QComputed()` + `dto.serialize()`                     |
| Carga masiva / seed       | `Dto.createMany(await Bun.file(path).json())`          |

## Definición del DTO

```typescript
// dto/product.dto.ts
import { QModel, Quick, QRule, QField, QComputed } from 'quickmodel';

interface IProduct {
	id: string;
	name: string;
	price: number;
	stock: number;
	tags: string[];
	createdAt: Date;
}

@Quick(
	{
		id: 'string',
		name: 'string',
		price: 'number',
		stock: 'number',
		tags: Array,
		createdAt: Date,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
export class ProductDto extends QModel<IProduct> {
	@QField({ label: 'ID', required: true })
	declare id: string;

	@QField({ label: 'Nombre', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'Nombre demasiado corto')
	@QRule((val: string) => val.trim().length <= 100, 'Nombre demasiado largo')
	declare name: string;

	@QField({ label: 'Precio', widget: 'number' })
	@QRule((val: number) => val >= 0, 'El precio no puede ser negativo')
	declare price: number;

	@QField({ label: 'Stock' })
	@QRule(
		(val: number) => Number.isInteger(val) && val >= 0,
		'El stock debe ser un entero no negativo'
	)
	declare stock: number;

	declare tags: string[];
	declare createdAt: Date;

	@QComputed()
	get isAvailable(): boolean {
		return this.stock > 0;
	}

	@QComputed()
	get formattedPrice(): string {
		return `$${this.price.toFixed(2)}`;
	}
}
```

## Bun.serve — fetch handler

```typescript
// server.ts
import { ProductDto } from './dto/product.dto';

Bun.serve({
	port: 3000,
	async fetch(req) {
		const url = new URL(req.url);

		// POST /products
		if (req.method === 'POST' && url.pathname === '/products') {
			let raw: unknown;
			try {
				raw = await req.json();
			} catch {
				return Response.json(
					{ error: 'Cuerpo JSON inválido' },
					{ status: 400 }
				);
			}

			const dto = new ProductDto(raw as Record<string, unknown>);
			const { valid, errors } = dto.$qm.checkRules();

			if (!valid) {
				return Response.json({ errors }, { status: 422 });
			}

			// dto: tipado, coercionado, campos extras eliminados
			return Response.json(dto.$qm.serialize(), { status: 201 });
		}

		return new Response('Not Found', { status: 404 });
	},
});
```

### Flujo petición / respuesta

```
POST /products  { name: "Teclado", price: "149", stock: "50", __admin: true }
                                 ↓
                     new ProductDto(body)
                    ┌────────────────────────────────────┐
                    │  price: 149      (string→number)   │
                    │  stock: 50       (string→number)   │
                    │  createdAt: Date (auto-convertido)  │
                    │  __admin eliminado automáticamente  │
                    └────────────────────────────────────┘
                                 ↓
                          dto.$qm.checkRules()
                                 ↓
                    dto.$qm.serialize()  →  { isAvailable: true, formattedPrice: "$149.00", ... }
                                 ↓
                    Response.json(...)  201 Created
```

## Handler de WebSocket

```typescript
import { OrderDto } from './dto/order.dto';

Bun.serve({
	port: 3001,
	fetch(req, server) {
		if (server.upgrade(req)) return;
		return new Response('Se esperaba WebSocket', { status: 426 });
	},
	websocket: {
		message(ws, rawMsg) {
			let parsed: unknown;
			try {
				parsed = JSON.parse(String(rawMsg));
			} catch {
				ws.send(JSON.stringify({ ok: false, error: 'JSON inválido' }));
				return;
			}

			const dto = new OrderDto(parsed as Record<string, unknown>);
			const { valid, errors } = dto.$qm.checkRules();

			if (!valid) {
				ws.send(JSON.stringify({ ok: false, errors }));
				return;
			}

			// Publicar DTO serializado a todos los suscriptores
			ws.publish('orders', JSON.stringify(dto.$qm.serialize()));
			ws.send(JSON.stringify({ ok: true, summary: dto.summary }));
		},
	},
});
```

## Carga masiva con Bun.file()

```typescript
// seed.ts
import { ProductDto } from './dto/product.dto';

// API nativa de Bun — sin necesidad de importar fs
const raw = (await Bun.file('./data/products.json').json()) as unknown[];

const { instances: products } = ProductDto.createMany(raw);

// Todos los items coercionados y tipados
for (const product of products) {
	console.log(product.id, product.formattedPrice, product.isAvailable);
}
```

## Validación asíncrona (unicidad en BD)

Usa `qCheckRulesAsync` para reglas que necesitan acceder a una base de datos o servicio externo sin bloquear el event loop.

```typescript
// dto/register.dto.ts
import { QModel, Quick, QRule } from 'quickmodel';
import { qCheckRulesAsync } from 'quickmodel/forms';
import { db } from './db';

@Quick(
	{ email: 'string', username: 'string' },
	{ unknownPropertyPolicy: 'strip' }
)
export class RegisterDto extends QModel<{ email: string; username: string }> {
	@QRule(
		async (val: string) => !(await db.users.exists({ email: val })),
		'Email ya registrado'
	)
	declare email: string;

	@QRule(
		async (val: string) => !(await db.users.exists({ username: val })),
		'Nombre de usuario ocupado'
	)
	declare username: string;
}

// server.ts — POST /register
const dto = new RegisterDto((await req.json()) as Record<string, unknown>);
const { valid, errors } = await qCheckRulesAsync(dto);

if (!valid) {
	return Response.json({ errors }, { status: 422 });
}
return Response.json(dto.$qm.serialize(), { status: 201 });
```

## Serialización de respuestas JSON

`dto.serialize()` devuelve un objeto plano seguro para `Response.json()`. Los campos `Date` se convierten a strings ISO y los getters `@QComputed` se incluyen automáticamente.

```typescript
const dto = new ProductDto({
	id: 'prod-1',
	name: 'Silla Ergonómica',
	price: 399.0,
	stock: 10,
	tags: ['muebles'],
	createdAt: new Date(),
});

// Objeto plano — apto para transporte JSON:
const payload = dto.$qm.serialize();
// {
//   id: 'prod-1',
//   name: 'Silla Ergonómica',
//   price: 399,
//   stock: 10,
//   tags: ['muebles'],
//   createdAt: '2025-01-01T00:00:00.000Z',  ← ISO string
//   isAvailable: true,                       ← @QComputed
//   formattedPrice: '$399.00'                ← @QComputed
// }

return Response.json(payload, { status: 200 });
```

Restaurar desde la respuesta en el cliente es igual de sencillo:

```typescript
const raw = await res.json(); // objeto plano del JSON
const product = new ProductDto(raw); // createdAt → Date ✅
```

## Fechas a través de HTTP

Las fechas son serializadas como strings ISO por `serialize()` y rehidratadas automáticamente cuando se pasan de vuelta al constructor de `QModel` con `coercionStrategy: 'loose'` (que es el valor por defecto):

```typescript
// Servidor → cliente: Date se convierte en ISO string
const serverDto = new ProductDto(dbRow);
return Response.json(serverDto.$qm.serialize()); // createdAt: "2025-01-15T..."

// Cliente: re-instanciar — QuickModel convierte el ISO string de vuelta a Date
const clientDto = new ProductDto(await res.json()); // createdAt: Date ✅
```

## Enlaces rápidos

- [Instalación](/es/guide/installation)
- [Transformers](/es/guide/transformers)
- [Validación](/es/guide/validation)
- [Integración Backend (Express / Fastify / Hono)](/es/integrations/backend-integration)
