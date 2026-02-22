# Integración con TanStack Query

QuickModel encaja de forma natural con TanStack Query v5. Usa `createMany()` en `queryFn` para
convertir respuestas de la API en DTOs con tipos, `copy()` para actualizaciones optimistas y
`serialize()` para normalización de caché.

## Patrones Clave

| Patrón                      | API de QuickModel                 |
| --------------------------- | --------------------------------- |
| Coerción en `queryFn`       | `Dto.createMany(rawData)`         |
| Validación en mutaciones    | `dto.checkRules()` / `@QRule`     |
| Actualizaciones optimistas  | `dto.copy(patch)`                 |
| Normalización de caché      | `dto.serialize()` / `new Dto()`   |
| Transformación con `select` | `createMany()` en datos cacheados |
| Consultas infinitas         | `createMany()` por página         |

## Instalación

```bash
npm install @cartago-git/quickmodel @tanstack/react-query
```

## Configuración del Modelo

```typescript
import {
	QModel,
	Quick,
	QRule,
	QField,
	QComputed,
} from '@cartago-git/quickmodel';

interface IProducto {
	id: string;
	nombre: string;
	precio: number;
	enStock: boolean;
	categoria: string;
}

@Quick(
	{
		id: 'string',
		nombre: 'string',
		precio: 'number',
		enStock: 'boolean',
		categoria: 'string',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class ProductoDto extends QModel<IProducto> {
	declare id: string;
	declare nombre: string;
	declare precio: number;
	declare enStock: boolean;
	declare categoria: string;

	@QComputed()
	get precioFormateado(): string {
		return `$${this.precio.toFixed(2)}`;
	}
}
```

> **`coercionStrategy: 'loose'`** — Necesario cuando las respuestas de la API devuelven
> números como strings (p.ej. `"precio": "29.99"`). Convierte automáticamente en lugar de lanzar error.

## queryFn — Coerción de Respuestas de la API

```typescript
import { useQuery } from '@tanstack/react-query';

async function obtenerProductos(): Promise<ProductoDto[]> {
  const response = await fetch('/api/productos');
  const rawData: unknown[] = await response.json();
  const { instances } = ProductoDto.createMany(rawData);
  return instances;
}

function ListaProductos() {
  const { data: productos } = useQuery({
    queryKey: ['productos'],
    queryFn: obtenerProductos,
  });

  return productos?.map(p => (
    <div key={p.id}>
      <span>{p.nombre}</span>
      <span>{p.precioFormateado}</span>
    </div>
  ));
}
```

`createMany()` devuelve `{ instances, errors }`. Registra `errors` para detectar datos malformados del servidor.

## useMutation — Validar Antes de Enviar

```typescript
import { useMutation } from '@tanstack/react-query';

@Quick(
	{ nombre: 'string', precio: 'number', categoria: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CrearProductoDto extends QModel<ICrearProducto> {
	@QField({ label: 'Nombre del Producto', required: true })
	@QRule(
		(v: string) => v.length >= 2,
		'El nombre debe tener al menos 2 caracteres'
	)
	declare nombre: string;

	@QField({ label: 'Precio' })
	@QRule((v: number) => v > 0, 'El precio debe ser positivo')
	declare precio: number;

	@QField({ label: 'Categoría' })
	declare categoria: string;
}

async function crearProducto(data: object): Promise<IProducto> {
	const dto = new CrearProductoDto(data);
	const { valid, errors } = dto.checkRules();
	if (!valid) {
		throw new Error(
			errors.map((e) => `${e.field}: ${e.message}`).join(', ')
		);
	}
	const res = await fetch('/api/productos', {
		method: 'POST',
		body: JSON.stringify(dto.serialize()),
	});
	return res.json();
}
```

## Actualizaciones Optimistas con copy()

`copy()` devuelve una **nueva instancia inmutable** — ideal para actualizaciones optimistas
sin mutar el caché directamente.

```typescript
const mutation = useMutation({
	mutationFn: (patch: Partial<IProducto>) =>
		fetch(`/api/productos/${patch.id}`, {
			method: 'PATCH',
			body: JSON.stringify(patch),
		}),

	onMutate: async (patch) => {
		await queryClient.cancelQueries({ queryKey: ['productos'] });
		const anterior = queryClient.getQueryData<ProductoDto[]>(['productos']);

		queryClient.setQueryData<ProductoDto[]>(['productos'], (old = []) =>
			old.map((item) => (item.id === patch.id ? item.copy(patch) : item))
		);

		return { anterior };
	},

	onError: (_err, _patch, context) => {
		if (context?.anterior) {
			queryClient.setQueryData(['productos'], context.anterior);
		}
	},
});
```

`copy()` retorna una nueva instancia con `isDirty() === false` — el estado copiado es el nuevo baseline. Eso facilita detectar cambios
pendientes antes de persistirlos.

## Normalización de Caché

Guarda `serialize()` en el caché y rehidrata con `new Dto()`:

```typescript
// Serializar antes de guardar
const cached = producto.serialize();
queryClient.setQueryData(['producto', producto.id], cached);

// Rehidratar al acceder
const raw = queryClient.getQueryData(['producto', id]);
const producto = new ProductoDto(raw);
```

## Detección de Cambios con isDirty()

Usa `isDirty()` para omitir llamadas a la API innecesarias cuando no hay cambios locales:

```typescript
async function sincronizarSiHayCambios(dto: ProductoDto) {
	if (!dto.isDirty()) return; // nada que sincronizar
	await fetch(`/api/productos/${dto.id}`, {
		method: 'PATCH',
		body: JSON.stringify(dto.serialize()),
	});
	dto.reset(); // limpiar estado sucio tras guardar
}
```

## Validación Asíncrona (Unicidad en Servidor)

```typescript
import { qCheckRulesAsync } from '@cartago-git/quickmodel/core/helpers/q-check-rules-async';

const dto = new ProductoConNombreUnicoDto(formData);
const { valid, errors } = await qCheckRulesAsync(dto);
```

## Ver También

- [Referencia de la API QModel](./qmodel.md)
- [Integración con React](./react-integration.md)
- [Formularios](./forms.md)
