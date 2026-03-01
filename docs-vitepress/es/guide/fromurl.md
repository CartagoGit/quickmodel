# Parámetros URL — `fromURL()`

`QModel.fromURL(params)` deserializa una instancia de modelo directamente desde un objeto `URLSearchParams`, aplicando las mismas coerciones de tipos configuradas en `@Quick()`.

## Por qué `fromURL()`

`URLSearchParams` siempre devuelve strings. Sin `fromURL()` hay que coercionar cada campo manualmente:

```typescript
// ❌ Manual — tedioso y propenso a errores
const filter = new SearchDto({
	page: Number(params.get('page')),
	active: params.get('active') === 'true',
	tags: params.getAll('tags'), // fácil olvidar getAll
	since: new Date(params.get('since')!),
});

// ✅ Con fromURL
const filter = SearchDto.fromURL(params);
```

## Configuración

Declara el typeMap en `@Quick()` con normalidad. Los campos con **spec de array** (`[Type]`) usan `params.getAll()` automáticamente; el resto usa `params.get()`.

```typescript
import { QModel, Quick } from 'quickmodel';

interface ISearchFilter {
	query: string;
	page: number;
	active: boolean;
	since: Date;
	tags: string[];
	ids: number[];
}

@Quick({
	page: Number, // '3'  → 3
	active: Boolean, // 'true' → true
	since: Date, // '2026-01-01' → Date
	tags: [String], // getAll() → ['read', 'write']
	ids: [Number], // getAll() → [1, 2, 3]
})
class SearchFilterDto extends QModel<ISearchFilter> {
	declare query: string;
	declare page: number;
	declare active: boolean;
	declare since: Date;
	declare tags: string[];
	declare ids: number[];
}
```

## Uso

### Next.js App Router

```typescript
// app/items/page.tsx
export default function ItemsPage({
	searchParams,
}: {
	searchParams: URLSearchParams;
}) {
	const filter = SearchFilterDto.fromURL(searchParams);

	filter.page; // 3        (number)
	filter.active; // true     (boolean)
	filter.since; // Date     (objeto)
	filter.tags; // ['read', 'write']  (string[])
}
```

### Hono / Express / Fastify

```typescript
app.get('/items', (req) => {
	const filter = SearchFilterDto.fromURL(new URL(req.url).searchParams);
	return db.items.findMany({ where: filter.toInterface() });
});
```

### Navegador

```typescript
const filter = SearchFilterDto.fromURL(
	new URLSearchParams(window.location.search)
);
```

## Reglas de coerción

| Spec en `@Quick` | String de URL        | Resultado               |
| ---------------- | -------------------- | ----------------------- |
| `Number`         | `'42'`               | `42`                    |
| `Boolean`        | `'true'` / `'false'` | `true` / `false`        |
| `Date`           | `'2026-01-15'`       | Objeto `Date`           |
| `BigInt`         | `'9007199254740993'` | `9007199254740993n`     |
| `[String]`       | `getAll()`           | `string[]`              |
| `[Number]`       | `getAll()`           | `number[]`              |
| _(sin spec)_     | `get()`              | `string` sin coercionar |
| _(ausente)_      | —                    | `undefined`             |

## Detección de arrays

La clave: `fromURL()` lee el typeMap de `@Quick()` para decidir qué estrategia usar por campo:

- `Array.isArray(spec)` → `params.getAll(key)` — conserva todos los valores repetidos
- en caso contrario → `params.get(key)` — devuelve solo el primero

Sin esto, `new URLSearchParams('tags=a&tags=b')` descartaría `'b'` silenciosamente al usar `Object.fromEntries()`.

## Comparación con `fromFormData()`

|                 | `fromURL()`                 | `fromFormData()`                 |
| --------------- | --------------------------- | -------------------------------- |
| Origen          | `URLSearchParams`           | `FormData`                       |
| Arrays          | vía `@Quick({ f: [Type] })` | vía `@Quick({ f: [Type] })`      |
| Campos binarios | ✗ (URL no tiene binarios)   | ✅ `File`, `Blob`, `ArrayBuffer` |
| Streaming       | ✗                           | ✅ `toReadableStream()`          |
| Uso típico      | Params de GET, filtros      | Envíos de formulario POST/PUT    |

::: tip
Ambos métodos delegan la construcción final en `new MyDto(plain)`, así que `@QRule`, `@QComputed`, `isDirty()` y `copy()` funcionan igual tras la creación.
:::
