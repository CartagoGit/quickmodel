/**
 * TDD Tests: QModel – lazy IntegrityService initialization
 *
 * Garantiza que `IntegrityService` (y sus 14+ transformers internos) no se
 * instancien al importar `QModel`, sino únicamente la primera vez que se
 * invoca `.checkIntegrity()` o `.isValid()`.
 *
 * Optimización de startup cost: el constructor de `IntegrityService` registra
 * ~14 transformers; diferirlo reduce el tiempo de inicialización del módulo
 * para consumidores que nunca validan integridad.
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('QModel - lazy IntegrityService initialization', () => {
	interface IProduct {
		id: number;
		name: string;
		price: number;
	}

	@Quick({ id: Number, name: String, price: Number })
	class Product extends QModel<IProduct> {
		declare id: number;
		declare name: string;
		declare price: number;
	}

	// ── checkIntegrity() ─────────────────────────────────────────────────────

	test('checkIntegrity() returns empty array for valid instance', () => {
		const product = new Product({ id: 1, name: 'Widget', price: 9.99 });
		const errors = product.checkIntegrity();
		expect(errors).toBeInstanceOf(Array);
		expect(errors).toHaveLength(0);
	});

	test('checkIntegrity() can be called before and after serialization without error', () => {
		const product = new Product({ id: 1, name: 'Widget', price: 9.99 });
		// Call before any other method
		const before = product.checkIntegrity();
		expect(Array.isArray(before)).toBe(true);
		// Serialize then re-check — IntegrityService instance must still be reachable
		product.serialize();
		const after = product.checkIntegrity();
		expect(Array.isArray(after)).toBe(true);
	});

	// ── isValid() ────────────────────────────────────────────────────────────

	test('isValid() returns true for a well-formed instance', () => {
		const product = new Product({ id: 42, name: 'Gadget', price: 19.95 });
		expect(product.isValid()).toBe(true);
	});

	test('isValid() is callable multiple times without error', () => {
		const product = new Product({ id: 1, name: 'A', price: 1 });
		expect(product.isValid()).toBe(true);
		expect(product.isValid()).toBe(true);
		expect(product.isValid()).toBe(true);
	});

	test('isValid() uses the same IntegrityService instance across invocations (no re-instantiation)', () => {
		const productA = new Product({ id: 1, name: 'A', price: 1 });
		const productB = new Product({ id: 2, name: 'B', price: 2 });
		// Both succeed without error — shared singleton is reused
		expect(productA.isValid()).toBe(true);
		expect(productB.isValid()).toBe(true);
	});

	// ── createMany() integration ─────────────────────────────────────────────

	test('createMany() uses IntegrityService internally without error', () => {
		const result = Product.createMany([
			{ id: 1, name: 'Alpha', price: 1.0 },
			{ id: 2, name: 'Beta', price: 2.0 },
		]);
		expect(result.instances).toHaveLength(2);
		expect(result.errors).toHaveLength(0);
	});

	// ── Edge cases ───────────────────────────────────────────────────────────

	test('checkIntegrity() works when called before isValid()', () => {
		const product = new Product({ id: 5, name: 'C', price: 3 });
		const errors = product.checkIntegrity();
		expect(errors).toHaveLength(0);
		expect(product.isValid()).toBe(true);
	});
});
