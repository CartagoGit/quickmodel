# TanStack Query Integration

QuickModel pairs naturally with TanStack Query v5. Use `createMany()` in `queryFn` to coerce
API responses into typed DTOs, `merge()` for optimistic updates, and `serialize()` for cache
normalization.

## Key Patterns

| Pattern                 | QuickModel API                  |
| ----------------------- | ------------------------------- |
| `queryFn` coercion      | `Dto.createMany(rawData)`       |
| Mutation validation     | `dto.checkRules()` / `@QRule`   |
| Optimistic updates      | `dto.merge(patch)`              |
| Cache normalization     | `dto.serialize()` / `new Dto()` |
| `select` transformation | `createMany()` on cached data   |
| Infinite queries        | `createMany()` per page         |

## Installation

```bash
npm install @cartago-git/quickmodel @tanstack/react-query
```

## Model Setup

```typescript
import {
	QModel,
	Quick,
	QRule,
	QField,
	QComputed,
} from '@cartago-git/quickmodel';

interface IProduct {
	id: string;
	name: string;
	price: number;
	inStock: boolean;
	category: string;
}

@Quick(
	{
		id: 'string',
		name: 'string',
		price: 'number',
		inStock: 'boolean',
		category: 'string',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class ProductDto extends QModel<IProduct> {
	declare id: string;
	declare name: string;
	declare price: number;
	declare inStock: boolean;
	declare category: string;

	@QComputed()
	get displayPrice(): string {
		return `$${this.price.toFixed(2)}`;
	}
}
```

> **`coercionStrategy: 'loose'`** — Required when API responses have numbers as strings
> (e.g. `"price": "29.99"`). Converts automatically instead of throwing.

## queryFn — Coerce API Responses

```typescript
import { useQuery } from '@tanstack/react-query';

async function fetchProducts(): Promise<ProductDto[]> {
  const response = await fetch('/api/products');
  const rawData: unknown[] = await response.json();
  const { instances } = ProductDto.createMany(rawData);
  return instances;
}

function ProductList() {
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  return products?.map(p => (
    <div key={p.id}>
      <span>{p.name}</span>
      <span>{p.displayPrice}</span>
    </div>
  ));
}
```

`createMany()` returns `{ instances, errors }`. Log `errors` to detect malformed server data.

## useMutation — Validate Before Sending

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

@Quick(
	{ name: 'string', price: 'number', category: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CreateProductDto extends QModel<ICreateProduct> {
	@QField({ label: 'Product Name', required: true })
	@QRule((v: string) => v.length >= 2, 'Name must be at least 2 characters')
	declare name: string;

	@QField({ label: 'Price' })
	@QRule((v: number) => v > 0, 'Price must be positive')
	declare price: number;

	@QField({ label: 'Category' })
	declare category: string;
}

async function createProduct(data: object): Promise<IProduct> {
	const dto = new CreateProductDto(data);
	const { valid, errors } = dto.checkRules();
	if (!valid) {
		throw new Error(
			errors.map((e) => `${e.field}: ${e.message}`).join(', ')
		);
	}
	const res = await fetch('/api/products', {
		method: 'POST',
		body: JSON.stringify(dto.serialize()),
	});
	return res.json();
}

function AddProductForm() {
	const mutation = useMutation({ mutationFn: createProduct });

	const handleSubmit = (formData: FormData) => {
		mutation.mutate(Object.fromEntries(formData));
	};
	// ...
}
```

## Optimistic Updates with merge()

`merge()` returns a **new immutable instance** — perfect for optimistic UI updates without
mutating the cache directly.

```typescript
function useOptimisticUpdate() {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (patch: Partial<IProduct>) =>
			fetch(`/api/products/${patch.id}`, {
				method: 'PATCH',
				body: JSON.stringify(patch),
			}),

		onMutate: async (patch) => {
			await queryClient.cancelQueries({ queryKey: ['products'] });
			const previous = queryClient.getQueryData<ProductDto[]>([
				'products',
			]);

			queryClient.setQueryData<ProductDto[]>(['products'], (old = []) =>
				old.map((item) =>
					item.id === patch.id ? item.merge(patch) : item
				)
			);

			return { previous };
		},

		onError: (_err, _patch, context) => {
			if (context?.previous) {
				queryClient.setQueryData(['products'], context.previous);
			}
		},
	});

	return mutation;
}
```

`merge()` marks the result as dirty (`isDirty() === true`), making it easy to detect
pending changes before they are persisted.

## Cache Normalization

Store `serialize()` in the cache and rehydrate with `new Dto()`:

```typescript
// Serialize before storing
const cached = product.serialize();
queryClient.setQueryData(['product', product.id], cached);

// Rehydrate on access
const raw = queryClient.getQueryData(['product', id]);
const product = new ProductDto(raw);
```

## select — Transform Cached Data

```typescript
const { data: inStockProducts } = useQuery({
	queryKey: ['products'],
	queryFn: fetchProducts,
	select: (rawProducts) => {
		const { instances } = ProductDto.createMany(rawProducts);
		return instances.filter((p) => p.inStock);
	},
});
```

## Infinite Queries

```typescript
const { data, fetchNextPage } = useInfiniteQuery({
	queryKey: ['products', 'infinite'],
	queryFn: async ({ pageParam = 0 }) => {
		const res = await fetch(`/api/products?cursor=${pageParam}`);
		const { items, nextCursor } = await res.json();
		const { instances } = ProductDto.createMany(items);
		return { instances, nextCursor };
	},
	getNextPageParam: (last) => last.nextCursor ?? undefined,
});
```

## Staleness Detection with isDirty()

Use `isDirty()` to skip unnecessary API calls when no data has changed locally:

```typescript
async function syncIfDirty(dto: ProductDto) {
	if (!dto.isDirty()) return; // nothing to sync
	await fetch(`/api/products/${dto.id}`, {
		method: 'PATCH',
		body: JSON.stringify(dto.serialize()),
	});
	dto.reset(); // clear dirty state after successful save
}
```

## Async Validation (Server-Side Uniqueness)

```typescript
import { qCheckRulesAsync } from '@cartago-git/quickmodel/core/helpers/q-check-rules-async';

@Quick({ name: 'string', price: 'number', category: 'string' })
class ProductWithUniqueNameDto extends CreateProductDto {
	@QRule(async (val: string) => {
		const res = await fetch(
			`/api/products/exists?name=${encodeURIComponent(val)}`
		);
		const { exists } = await res.json();
		return !exists;
	}, 'Product name already exists')
	declare name: string;
}

const dto = new ProductWithUniqueNameDto(formData);
const { valid, errors } = await qCheckRulesAsync(dto);
```

## See Also

- [QModel API Reference](./qmodel.md)
- [React Integration](./react-integration.md)
- [Forms](./forms.md)
