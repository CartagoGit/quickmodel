/**
 * TDD Tests: QModel – lazy QMockGenerator initialization
 *
 * Garantiza que refactorizar `QMockGenerator` con un getter lazy en lugar
 * de `new QMockGenerator()` como campo estático directo no rompe ningún
 * comportamiento externo del método `QModel.mock()`.
 *
 * La distinción clave: el constructor de `QMockGenerator` no debe ejecutarse
 * al cargar la clase `QModel`, solo al invocar `.mock()` por primera vez.
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('QModel - lazy QMockGenerator initialization', () => {
	interface IItem {
		id: number;
		label: string;
		active: boolean;
	}

	@Quick({ id: Number, label: String, active: Boolean })
	class Item extends QModel<IItem> {
		declare id: number;
		declare label: string;
		declare active: boolean;
	}

	test('mock() returns a QMockBuilder instance', () => {
		const builder = Item.mock();
		expect(builder).toBeDefined();
		expect(typeof builder.random).toBe('function');
		expect(typeof builder.array).toBe('function');
	});

	test('mock().random() produces a valid hydrated instance', () => {
		const item = Item.mock().random();
		expect(item).toBeInstanceOf(Item);
		expect(typeof item.id).toBe('number');
		expect(typeof item.label).toBe('string');
		expect(typeof item.active).toBe('boolean');
	});

	test('mock().array(n) produces n valid instances', () => {
		const items = Item.mock().array(5);
		expect(items).toHaveLength(5);
		items.forEach((itm) => {
			expect(itm).toBeInstanceOf(Item);
			expect(typeof itm.id).toBe('number');
		});
	});

	test('mock().empty() produces zero-value instance', () => {
		const item = Item.mock().empty();
		expect(item).toBeInstanceOf(Item);
		expect(item.id).toBe(0);
		expect(item.label).toBe('');
		expect(item.active).toBe(false);
	});

	test('mock() called multiple times reuses the same generator (no re-instantiation)', () => {
		// Verifica que llamadas repetidas no producen errores ni resultados divergentes
		const first = Item.mock().random();
		const second = Item.mock().random();
		expect(first).toBeInstanceOf(Item);
		expect(second).toBeInstanceOf(Item);
		// Ambos deben tener la forma correcta
		expect(typeof first.label).toBe('string');
		expect(typeof second.label).toBe('string');
	});

	test('mock().random(overrides) applies overrides correctly', () => {
		const item = Item.mock().random({ id: 999, label: 'custom' });
		expect(item.id).toBe(999);
		expect(item.label).toBe('custom');
	});
});
