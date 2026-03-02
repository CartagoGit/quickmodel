# Integración con TanStack Table

TanStack Table (anteriormente React Table v8) es una librería de tablas headless para construir
potentes cuadrículas de datos. QuickModel proporciona el modelo de filas tipado, la coerción en el
momento de la carga de datos y `getFormSchema()` para auto-generar definiciones de columnas
ordenables y filtrables.

## Patrones clave

| Caso de uso                               | Solución QuickModel                                          |
| ----------------------------------------- | ------------------------------------------------------------ |
| Definición del tipo de fila               | Instancia QModel como genérico `TData`                       |
| Coerción masiva de datos                  | `createMany()` sobre la respuesta raw de la API              |
| Metadatos de columna desde decoradores    | Método estático `getFormSchema()` para construir column defs |
| Formato de celda                          | Campos `@QComputed` disponibles en cada instancia de fila    |
| Edición — actualización inmutable de fila | `row.$qCopy(patch)` reemplaza la fila sin mutación           |
| Seguimiento de cambios por fila           | `original.$qIsDirty(edited)` para detectar edición inline    |

## Configuración Básica

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

	@QField({ label: 'Nombre', required: true })
	declare name: string;

	@QField({ label: 'Precio (€)' })
	declare price: number;

	@QField({ label: 'Stock' })
	@QRule((v: number) => v >= 0, 'El stock no puede ser negativo')
	declare stock: number;

	@QField({ label: 'Categoría' })
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

## React — Tabla Básica

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
	{ accessorKey: 'name', header: 'Nombre' },
	{
		accessorKey: 'formattedPrice',
		header: 'Precio',
		// @QComputed — no se necesita formatear en la celda
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
	{ accessorKey: 'category', header: 'Categoría' },
];

export function ProductTable({ rawData }: { rawData: unknown[] }) {
	// createMany() coerciona fechas, elimina campos desconocidos
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

## Auto-Generar Columnas desde `getFormSchema()`

Evita escribir definiciones de columnas a mano — derívala desde los metadatos de `@QField`:

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

// Genera column defs desde los decoradores @QField de ProductModel
const autoColumns = buildColumnsFromSchema<ProductModel>(ProductModel);
```

## Edición Inline con `$qCopy()`

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
					{editing ? 'Cancelar' : 'Editar'}
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
						Guardar
					</button>
				)}
			</td>
		</tr>
	);
}
```

## Filtrado con Campos QModel

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
			// Filtra por nombre, categoría y formattedPrice (@QComputed)
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
				placeholder="Buscar productos..."
				value={globalFilter}
				onChange={(e) => setGlobalFilter(e.target.value)}
			/>
			{/* JSX de la tabla */}
		</div>
	);
}
```

## Paginación en Servidor con TanStack Query

Combina TanStack Table (estado de paginación) con TanStack Query (obtención de datos) y QuickModel
(coerción):

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
			{/* JSX de la tabla */}
			<button
				onClick={() => table.previousPage()}
				disabled={!table.getCanPreviousPage()}>
				Anterior
			</button>
			<button
				onClick={() => table.nextPage()}
				disabled={!table.getCanNextPage()}>
				Siguiente
			</button>
		</div>
	);
}
```

## Columna de Informe de Validación

Muestra el estado de validación por fila usando `$qValidationReport()`:

```tsx
const validationColumn: ColumnDef<ProductModel> = {
	id: 'status',
	header: 'Estado',
	cell: ({ row }) => {
		const report = row.original.$qValidationReport();
		if (report.valid) return <span style={{ color: 'green' }}>✓</span>;
		return (
			<span
				title={report.errors.map((e) => e.message).join(', ')}
				style={{ color: 'red' }}>
				⚠ {report.errors.length} error
				{report.errors.length > 1 ? 'es' : ''}
			</span>
		);
	},
};
```

## Ver también

- [Integración con TanStack Query](./tanstack-query-integration) — obtención de datos del servidor
- [Integración con React](./react-integration) — patrones React + QModel
- [Validación](/es/guide/validation) — `@QRule` y `@QField`
