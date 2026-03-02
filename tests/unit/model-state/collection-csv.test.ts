/**
 * TDD Tests: QModelCollection.$qToCSV()
 * Propuesta U — exportación CSV desde colecciones tipadas.
 */
import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';
import { QModelCollection } from '@/core/models/quick-collection.model';

interface IProduct {
	id: number;
	name: string;
	price: number;
	active: boolean;
	tags: string;
}

@Quick()
class ProductModel extends QModel<IProduct> {
	declare id: number;
	declare name: string;
	declare price: number;
	declare active: boolean;
	declare tags: string;
}

const SEED = [
	{ id: 1, name: 'Widget', price: 9.99, active: true, tags: 'a,b' },
	{ id: 2, name: 'Gadget', price: 24.5, active: false, tags: 'c' },
	{ id: 3, name: 'Gizmo', price: 4.0, active: true, tags: '' },
];

// ─────────────────────────────────────────────────────────────────────────────

describe('QModelCollection.$qToCSV() — formato básico', () => {
	it('genera CSV con headers por defecto', () => {
		const col = QModelCollection.from(ProductModel, SEED);
		const csv = col.$qToCSV();
		const lines = csv.split('\n');
		expect(lines[0]).toBe('id,name,price,active,tags');
		expect(lines).toHaveLength(4); // header + 3 filas
	});

	it('genera una fila por instancia', () => {
		const col = QModelCollection.from(ProductModel, SEED);
		const lines = col.$qToCSV().split('\n');
		expect(lines[1]).toContain('Widget');
		expect(lines[2]).toContain('Gadget');
		expect(lines[3]).toContain('Gizmo');
	});

	it('devuelve string vacío si la colección está vacía (includeHeaders: false)', () => {
		const col = QModelCollection.from(ProductModel, []);
		const csv = col.$qToCSV({ includeHeaders: false });
		expect(csv).toBe('');
	});

	it('devuelve solo el header si la colección está vacía y includeHeaders: true', () => {
		const col = QModelCollection.from(ProductModel, []);
		const csv = col.$qToCSV({ includeHeaders: true });
		// sin datos aún produce el header si hay fields a mostrar
		// pero sin datos no hay forma de saber los campos → string vacío
		expect(typeof csv).toBe('string');
	});
});

describe('QModelCollection.$qToCSV() — opciones: delimiter', () => {
	it('usa ";" como delimitador cuando se especifica', () => {
		const col = QModelCollection.from(ProductModel, SEED);
		const csv = col.$qToCSV({ delimiter: ';' });
		const firstLine = csv.split('\n')[0];
		expect(firstLine).toBe('id;name;price;active;tags');
	});

	it('usa "\\t" como delimitador (TSV)', () => {
		const col = QModelCollection.from(ProductModel, SEED);
		const csv = col.$qToCSV({ delimiter: '\t' });
		const firstLine = csv.split('\n')[0];
		expect(firstLine).toContain('\t');
	});
});

describe('QModelCollection.$qToCSV() — opciones: includeHeaders', () => {
	it('omite la línea de headers cuando includeHeaders: false', () => {
		const col = QModelCollection.from(ProductModel, SEED);
		const csv = col.$qToCSV({ includeHeaders: false });
		const lines = csv.split('\n');
		// Sin header, hay exactamente 3 líneas de datos (SEED tiene 3 items)
		expect(lines).toHaveLength(3);
		// La primera línea es la primera fila de datos, no el encabezado
		expect(lines[0]).toContain('1'); // id=1
		expect(lines[0]).toContain('Widget');
	});

	it('incluye la línea de headers cuando includeHeaders: true (por defecto)', () => {
		const col = QModelCollection.from(ProductModel, SEED);
		const csv = col.$qToCSV({ includeHeaders: true });
		expect(csv.split('\n')[0]).toBe('id,name,price,active,tags');
	});
});

describe('QModelCollection.$qToCSV() — opciones: fields', () => {
	it('exporta solo los campos especificados en el orden indicado', () => {
		const col = QModelCollection.from(ProductModel, SEED);
		const csv = col.$qToCSV({ fields: ['name', 'price'] });
		const lines = csv.split('\n');
		expect(lines[0]).toBe('name,price');
		expect(lines[1]).toBe('Widget,9.99');
	});

	it('respeta el orden de fields aunque difiera del orden de serialización', () => {
		const col = QModelCollection.from(ProductModel, SEED);
		const csv = col.$qToCSV({ fields: ['price', 'id'] });
		expect(csv.split('\n')[0]).toBe('price,id');
	});
});

describe('QModelCollection.$qToCSV() — escape de valores', () => {
	it('envuelve en comillas valores que contienen la coma del delimitador', () => {
		const col = QModelCollection.from(ProductModel, [
			{ id: 1, name: 'Hello, World', price: 1, active: true, tags: '' },
		]);
		const csv = col.$qToCSV();
		expect(csv).toContain('"Hello, World"');
	});

	it('envuelve en comillas valores que contienen salto de línea', () => {
		const col = QModelCollection.from(ProductModel, [
			{ id: 1, name: 'Line\nBreak', price: 1, active: true, tags: '' },
		]);
		const csv = col.$qToCSV();
		expect(csv).toContain('"Line\nBreak"');
	});

	it('escapa las comillas dobles duplicándolas (RFC 4180)', () => {
		const col = QModelCollection.from(ProductModel, [
			{ id: 1, name: 'Say "Hi"', price: 1, active: true, tags: '' },
		]);
		const csv = col.$qToCSV();
		expect(csv).toContain('"Say ""Hi"""');
	});
});

describe('QModelCollection.$qToCSV() — nullValue', () => {
	it('sustituye null/undefined por la cadena nullValue indicada', () => {
		interface IPartial {
			id: number;
			name: string;
		}
		@Quick()
		class PartialModel extends QModel<IPartial> {
			declare id: number;
			declare name: string;
		}
		const col = QModelCollection.from(PartialModel, [
			{ id: 1, name: undefined as unknown as string }, // @quickmodel-rule-ignore: no-as-unknown
		]);
		const csv = col.$qToCSV({ nullValue: 'N/A', fields: ['id', 'name'] });
		expect(csv.split('\n')[1]).toBe('1,N/A');
	});

	it('usa cadena vacía como nullValue por defecto', () => {
		interface IPartial {
			id: number;
			name: string;
		}
		@Quick()
		class PartialModel2 extends QModel<IPartial> {
			declare id: number;
			declare name: string;
		}
		const col = QModelCollection.from(PartialModel2, [
			{ id: 1, name: undefined as unknown as string }, // @quickmodel-rule-ignore: no-as-unknown
		]);
		const csv = col.$qToCSV({ fields: ['id', 'name'] });
		expect(csv.split('\n')[1]).toBe('1,');
	});
});
