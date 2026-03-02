# URL Search Params — `fromURL()`

`QModel.fromURL(params)` deserializes a model instance directly from a `URLSearchParams` object, applying the same type coercions configured in `@Quick()`.

## Why `fromURL()`?

`URLSearchParams` only ever yields strings. Without `fromURL()` you would need to coerce each field manually:

```typescript
// ❌ Manual — tedious and error-prone
const filter = new SearchDto({
	page: Number(params.get('page')),
	active: params.get('active') === 'true',
	tags: params.getAll('tags'), // easy to forget getAll
	since: new Date(params.get('since')!),
});

// ✅ With fromURL
const filter = SearchDto.fromURL(params);
```

## Setup

Declare the type map in `@Quick()` as usual. Fields typed as an **array spec** (`[Type]`) automatically use `params.getAll()` — everything else uses `params.get()`.

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

## Usage

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
	filter.since; // Date     (object)
	filter.tags; // ['read', 'write']  (string[])
}
```

### Hono / Express / Fastify

```typescript
app.get('/items', (req) => {
	const filter = SearchFilterDto.fromURL(new URL(req.url).searchParams);
	return db.items.findMany({ where: filter.$qToInterface() });
});
```

### Browser

```typescript
const filter = SearchFilterDto.fromURL(
	new URLSearchParams(window.location.search)
);
```

## Coercion rules

| `@Quick` spec | URL string           | Result              |
| ------------- | -------------------- | ------------------- |
| `Number`      | `'42'`               | `42`                |
| `Boolean`     | `'true'` / `'false'` | `true` / `false`    |
| `Date`        | `'2026-01-15'`       | `Date` object       |
| `BigInt`      | `'9007199254740993'` | `9007199254740993n` |
| `[String]`    | `getAll()`           | `string[]`          |
| `[Number]`    | `getAll()`           | `number[]`          |
| _(no spec)_   | `get()`              | raw `string`        |
| _(absent)_    | —                    | `undefined`         |

## Array detection

The key insight: `fromURL()` reads the `@Quick()` type map to decide **which strategy** to use per field:

- `Array.isArray(spec)` → `params.getAll(key)` — preserves all repeated values
- otherwise → `params.get(key)` — returns only the first value

Without this, `new URLSearchParams('tags=a&tags=b')` would silently drop `'b'` via `Object.fromEntries()`.

## Comparison with `fromFormData()`

|               | `fromURL()`                 | `fromFormData()`                 |
| ------------- | --------------------------- | -------------------------------- |
| Source        | `URLSearchParams`           | `FormData`                       |
| Arrays        | via `@Quick({ f: [Type] })` | via `@Quick({ f: [Type] })`      |
| Binary fields | ✗ (URL has no binaries)     | ✅ `File`, `Blob`, `ArrayBuffer` |
| Streaming     | ✗                           | ✅ `toReadableStream()`          |
| Typical use   | GET query params, filters   | POST/PUT form submissions        |

::: tip
Both methods delegate final construction to `new MyDto(plain)`, so all `@QRule`, `@QComputed`, `isDirty()` and `copy()` work identically after creation.
:::
