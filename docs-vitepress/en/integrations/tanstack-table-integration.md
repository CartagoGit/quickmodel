# TanStack Table Integration

TanStack Table (formerly React Table v8) is a headless table library for building powerful data
grids. QuickModel provides the typed row model, coercion at data load time, and `$qGetFormSchema()`
for auto-generating sortable/filterable column definitions.

## Key patterns

| Use case                        | QuickModel solution                                    |
| ------------------------------- | ------------------------------------------------------ |
| Row type definition             | QModel instance as the `TData` generic                 |
| Bulk data coercion              | `createMany()` on the raw API response                 |
| Column metadata from decorators | `getFormSchema()` static method to build column defs   |
| Cell formatting                 | `@QComputed` fields available on every row instance    |
| Editing — immutable row update  | `row.$qCopy(patch)` replaces row without mutation      |
| Dirty tracking per row          | `original.$qIsDirty(edited)` for inline edit detection |

## Basic Setup

```typescript
// models/product.model.ts
import { QModel, Quick, QField, QRule, QComputed } from 'quickmodel';

interface IProduct {
	id: string;
	name: string;
	price: number;
	stock: number;
	category: string;
	createdAt: Date;
}

@Quick(
	{
		id: 'string',
		name: 'string',
		price: 'number',
		stock: 'number',
		category: 'string',
		createdAt: Date,
	},
	{ unknownPropertyPolicy: 'strip' }
)
export class ProductModel extends QModel<IProduct> {
	declare id: string;

	@QField({ label: 'Name', required: true })
	declare name: string;

	@QField({ label: 'Price (€)' })
	declare price: number;

	@QField({ label: 'Stock' })
	@QRule((v: number) => v >= 0, 'Stock cannot be negative')
	declare stock: number;

	@QField({ label: 'Category' })
	declare category: string;

	declare createdAt: Date;

	@QComputed()
	get formattedPrice(): string {
		return `€${this.price.toFixed(2)}`;
	}

	@QComputed()
	get isLowStock(): boolean {
		return this.stock < 5;
	}
}
```

## React — Basic Table

```tsx
// components/ProductTable.tsx
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	flexRender,
	type ColumnDef,
} from '@tanstack/react-table';
import { ProductModel } from '../models/product.model';

const columns: ColumnDef<ProductModel>[] = [
	{ accessorKey: 'name', header: 'Name' },
	{
		accessorKey: 'formattedPrice',
		header: 'Price',
		// @QComputed — no need to format in the cell
	},
	{
		accessorKey: 'stock',
		header: 'Stock',
		cell: ({ row }) => (
			<span
				style={{ color: row.original.isLowStock ? 'red' : 'inherit' }}>
				{row.original.stock}
			</span>
		),
	},
	{ accessorKey: 'category', header: 'Category' },
];

export function ProductTable({ rawData }: { rawData: unknown[] }) {
	// createMany() coerces dates, strips unknown fields
	const { instances: data, errors } = ProductModel.createMany(rawData);

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<table>
			<thead>
				{table.getHeaderGroups().map((hg) => (
					<tr key={hg.id}>
						{hg.headers.map((h) => (
							<th
								key={h.id}
								onClick={h.column.getToggleSortingHandler()}
								style={{ cursor: 'pointer' }}>
								{flexRender(
									h.column.columnDef.header,
									h.getContext()
								)}
								{h.column.getIsSorted() === 'asc'
									? ' ↑'
									: h.column.getIsSorted() === 'desc'
										? ' ↓'
										: ''}
							</th>
						))}
					</tr>
				))}
			</thead>
			<tbody>
				{table.getRowModel().rows.map((row) => (
					<tr key={row.id}>
						{row.getVisibleCells().map((cell) => (
							<td key={cell.id}>
								{flexRender(
									cell.column.columnDef.cell,
									cell.getContext()
								)}
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	);
}
```

## Auto-Generate Columns from `getFormSchema()`

Skip writing column definitions by hand — derive them from `@QField` metadata:

```typescript
import type { ColumnDef } from '@tanstack/react-table';
import { ProductModel } from '../models/product.model';

function buildColumnsFromSchema<T extends object>(ModelClass: {
	getFormSchema: () => Array<{ field: string; label: string }>;
}): ColumnDef<T>[] {
	return ModelClass.getFormSchema().map(({ field, label }) => ({
		accessorKey: field as keyof T extends string ? keyof T : string,
		header: label,
	}));
}

// Generates column defs from @QField decorators on ProductModel
const autoColumns = buildColumnsFromSchema<ProductModel>(ProductModel);
```

## Inline Editing with `$qCopy()`

```tsx
import { useState } from 'react';
import { ProductModel } from '../models/product.model';

function EditableRow({
	product,
	onSave,
}: {
	product: ProductModel;
	onSave: (p: ProductModel) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(product);

	const isDirty = product.$qIsDirty(draft);

	return (
		<tr>
			<td>
				{editing ? (
					<input
						value={draft.name}
						onChange={(e) =>
							setDraft(
								(prev) =>
									prev.$qCopy({
										name: e.target.value,
									}) as ProductModel
							)
						}
					/>
				) : (
					product.name
				)}
			</td>
			<td>
				<button onClick={() => setEditing((v) => !v)}>
					{editing ? 'Cancel' : 'Edit'}
				</button>
				{isDirty && (
					<button
						onClick={() => {
							const { valid } = draft.$qCheckRules();
							if (valid) {
								onSave(draft);
								setEditing(false);
							}
						}}>
						Save
					</button>
				)}
			</td>
		</tr>
	);
}
```

## Filtering with QModel fields

```tsx
import {
	useReactTable,
	getCoreRowModel,
	getFilteredRowModel,
} from '@tanstack/react-table';
import { useState } from 'react';

function FilterableTable({ data }: { data: ProductModel[] }) {
	const [globalFilter, setGlobalFilter] = useState('');

	const table = useReactTable({
		data,
		columns,
		state: { globalFilter },
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		globalFilterFn: (row, _colId, filterValue: string) => {
			// Filter across name, category, and @QComputed formattedPrice
			const search = filterValue.toLowerCase();
			const prod = row.original;
			return (
				prod.name.toLowerCase().includes(search) ||
				prod.category.toLowerCase().includes(search) ||
				prod.formattedPrice.includes(search)
			);
		},
	});

	return (
		<div>
			<input
				placeholder="Search products..."
				value={globalFilter}
				onChange={(e) => setGlobalFilter(e.target.value)}
			/>
			{/* table JSX */}
		</div>
	);
}
```

## Server-Side Pagination with TanStack Query

Combine TanStack Table (pagination state) with TanStack Query (data fetching) and QuickModel
(coercion):

```tsx
import { useQuery } from '@tanstack/react-query';
import { useReactTable, getPaginationRowModel } from '@tanstack/react-table';
import { useState } from 'react';
import { ProductModel } from '../models/product.model';

interface IPage {
	items: unknown[];
	total: number;
}

function ServerPaginatedTable() {
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 20,
	});

	const { data } = useQuery({
		queryKey: ['products', pagination],
		queryFn: async (): Promise<{
			rows: ProductModel[];
			rowCount: number;
		}> => {
			const res: IPage = await fetch(
				`/api/products?page=${pagination.pageIndex}&size=${pagination.pageSize}`
			).then((r) => r.json());

			const { instances } = ProductModel.createMany(res.items);
			return { rows: instances, rowCount: res.total };
		},
	});

	const table = useReactTable({
		data: data?.rows ?? [],
		columns,
		rowCount: data?.rowCount ?? 0,
		state: { pagination },
		onPaginationChange: setPagination,
		manualPagination: true,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	return (
		<div>
			{/* table JSX */}
			<button
				onClick={() => table.previousPage()}
				disabled={!table.getCanPreviousPage()}>
				Previous
			</button>
			<button
				onClick={() => table.nextPage()}
				disabled={!table.getCanNextPage()}>
				Next
			</button>
		</div>
	);
}
```

## Validation Report Column

Show validation state per row using `$qValidationReport()`:

```tsx
const validationColumn: ColumnDef<ProductModel> = {
	id: 'status',
	header: 'Status',
	cell: ({ row }) => {
		const report = row.original.$qValidationReport();
		if (report.valid) return <span style={{ color: 'green' }}>✓</span>;
		return (
			<span
				title={report.errors.map((e) => e.message).join(', ')}
				style={{ color: 'red' }}>
				⚠ {report.errors.length} error
				{report.errors.length > 1 ? 's' : ''}
			</span>
		);
	},
};
```

## See Also

- [TanStack Query Integration](./tanstack-query-integration) — server data fetching
- [React Integration](./react-integration) — React + QModel patterns
- [Validation](/en/guide/validation) — `@QRule` and `@QField`
