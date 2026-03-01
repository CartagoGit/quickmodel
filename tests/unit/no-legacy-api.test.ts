/**
 * Anti-regression: verifica que la API v1 ($qm) no está accesible ni en QModel ni en QModelCollection.
 *
 * Si alguno de estos tests falla, significa que el getter `$qm` fue reintroducido
 * o que un método de instancia fue expuesto sin el prefijo `$q`.
 *
 * Convención de nomenclatura:
 *   IQ*  → interfaces y tipos TypeScript
 *   Q*   → clases de modelo y decoradores
 *   $q*  → métodos/propiedades de instancia y helpers exportados
 */

// @quickmodel-rule-ignore: no-as-unknown  — tests de guardia requieren acceso forzado a nombres sin $q

import { describe, it, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QModelCollection } from '@/core/models/quick-collection.model';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface IProduct {
	sku: string;
	price: number;
}

@Quick()
class Product extends QModel<IProduct> {
	declare sku: string;
	declare price: number;
}

function makeProduct(): Product {
	return new Product({ sku: 'ABC-1', price: 99 });
}

function makeCollection(): QModelCollection<Product> {
	return QModelCollection.from(Product, [
		{ sku: 'ABC-1', price: 99 },
		{ sku: 'DEF-2', price: 49 },
	]);
}

// ---------------------------------------------------------------------------
// QModel — getter $qm eliminado
// ---------------------------------------------------------------------------

describe('QModel — getter $qm no existe', () => {
	it('$qm es undefined en la instancia', () => {
		const prod = makeProduct();
		expect(
			(prod as unknown as Record<string, unknown>)['$qm']
		).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// QModel — métodos sin prefijo $q lanzan error de guardia
// ---------------------------------------------------------------------------

describe('QModel — métodos de infraestructura sin $q lanzan [QuickModel]', () => {
	it('serialize() lanza', () => {
		expect(() => (makeProduct() as any).serialize()).toThrow(
			'[QuickModel]'
		);
	});
	it('isDirty() lanza', () => {
		expect(() => (makeProduct() as any).isDirty()).toThrow('[QuickModel]');
	});
	it('hasChanges() lanza', () => {
		expect(() => (makeProduct() as any).hasChanges()).toThrow(
			'[QuickModel]'
		);
	});
	it('getChanges() lanza', () => {
		expect(() => (makeProduct() as any).getChanges()).toThrow(
			'[QuickModel]'
		);
	});
	it('patch() lanza', () => {
		expect(() => (makeProduct() as any).patch({ price: 1 })).toThrow(
			'[QuickModel]'
		);
	});
	it('copy() lanza', () => {
		expect(() => (makeProduct() as any).copy()).toThrow('[QuickModel]');
	});
	it('reset() lanza', () => {
		expect(() => (makeProduct() as any).reset()).toThrow('[QuickModel]');
	});
	it('checkIntegrity() lanza', () => {
		expect(() => (makeProduct() as any).checkIntegrity()).toThrow(
			'[QuickModel]'
		);
	});
	it('checkRules() lanza', () => {
		expect(() => (makeProduct() as any).checkRules()).toThrow(
			'[QuickModel]'
		);
	});
	it('isValid() lanza', () => {
		expect(() => (makeProduct() as any).isValid()).toThrow('[QuickModel]');
	});
	it('toInterface() lanza', () => {
		expect(() => (makeProduct() as any).toInterface()).toThrow(
			'[QuickModel]'
		);
	});
	it('getInitInterface() lanza', () => {
		expect(() => (makeProduct() as any).getInitInterface()).toThrow(
			'[QuickModel]'
		);
	});
	it('diff() lanza', () => {
		const prod = makeProduct();
		expect(() => (prod as any).diff(prod)).toThrow('[QuickModel]');
	});
	it('equals() lanza', () => {
		const prod = makeProduct();
		expect(() => (prod as any).equals(prod)).toThrow('[QuickModel]');
	});
	it('hasIntegrity() lanza', () => {
		expect(() => (makeProduct() as any).hasIntegrity()).toThrow(
			'[QuickModel]'
		);
	});
	it('validationReport() lanza', () => {
		expect(() => (makeProduct() as any).validationReport()).toThrow(
			'[QuickModel]'
		);
	});
	it('validate() lanza', () => {
		expect(() => (makeProduct() as any).validate()).toThrow('[QuickModel]');
	});
});

// ---------------------------------------------------------------------------
// QModel — la nueva API $q* funciona correctamente
// ---------------------------------------------------------------------------

describe('QModel — la API $q* es accesible', () => {
	it('$qSerialize() retorna objeto plano', () => {
		expect(makeProduct().$qSerialize()).toMatchObject({
			sku: 'ABC-1',
			price: 99,
		});
	});
	it('$qIsDirty() es false al inicio', () => {
		expect(makeProduct().$qIsDirty()).toBe(false);
	});
	it('$qHasChanges() es false al inicio', () => {
		expect(makeProduct().$qHasChanges()).toBe(false);
	});
	it('$qPatch() muta el modelo', () => {
		const prod = makeProduct();
		prod.$qPatch({ price: 1 });
		expect(prod.price).toBe(1);
	});
	it('$qCopy() devuelve nueva instancia', () => {
		const clone = makeProduct().$qCopy({ price: 1 });
		expect(clone).toBeInstanceOf(Product);
		expect(clone.price).toBe(1);
	});
	it('$qReset() revierte cambios', () => {
		const prod = makeProduct();
		prod.$qPatch({ price: 1 });
		prod.$qReset();
		expect(prod.price).toBe(99);
	});
	it('$qCheckIntegrity() retorna array vacío', () => {
		expect(makeProduct().$qCheckIntegrity()).toEqual([]);
	});
	it('$qHasIntegrity() es true', () => {
		expect(makeProduct().$qHasIntegrity()).toBe(true);
	});
	it('$qIsValid() es true sin @QRule', () => {
		expect(makeProduct().$qIsValid()).toBe(true);
	});
	it('$qCheckRules().valid es true', () => {
		expect(makeProduct().$qCheckRules().valid).toBe(true);
	});
	it('$qValidationReport() tiene las tres claves', () => {
		const rep = makeProduct().$qValidationReport();
		expect(rep).toHaveProperty('valid');
		expect(rep).toHaveProperty('integrity');
		expect(rep).toHaveProperty('rules');
	});
	it('$qToInterface() retorna estado actual', () => {
		expect(makeProduct().$qToInterface()).toMatchObject({ sku: 'ABC-1' });
	});
	it('$qGetInitInterface() retorna snapshot inicial', () => {
		expect(makeProduct().$qGetInitInterface()).toMatchObject({
			sku: 'ABC-1',
		});
	});
	it('$qEquals() compara instancias correctamente', () => {
		const aaa = makeProduct();
		const bbb = makeProduct();
		expect(aaa.$qEquals(bbb)).toBe(true);
	});
	it('$qDiff() retorna vacío para instancias iguales', () => {
		const aaa = makeProduct();
		const bbb = makeProduct();
		expect(aaa.$qDiff(bbb)).toEqual({});
	});
	it('$qToJSON() retorna string JSON', () => {
		const json = makeProduct().$qToJSON();
		expect(typeof json).toBe('string');
		expect(JSON.parse(json)).toMatchObject({ sku: 'ABC-1' });
	});
	it('Product.$qFromJSON() restaura instancia desde string', () => {
		const json = makeProduct().$qToJSON();
		const restored = Product.$qFromJSON(json);
		expect(restored).toBeInstanceOf(Product);
		expect(restored.sku).toBe('ABC-1');
	});
	it('Product.$qDeserializeJson() es alias de $qFromJSON', () => {
		const json = makeProduct().$qToJSON();
		const restored = Product.$qDeserializeJson(json);
		expect(restored).toBeInstanceOf(Product);
		expect(restored.price).toBe(99);
	});
});

// ---------------------------------------------------------------------------
// QModelCollection — getter $qm no existe
// ---------------------------------------------------------------------------

describe('QModelCollection — getter $qm no existe', () => {
	it('$qm es undefined en la colección', () => {
		const col = makeCollection();
		expect(
			(col as unknown as Record<string, unknown>)['$qm']
		).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// QModelCollection — la nueva API $q* funciona correctamente
// ---------------------------------------------------------------------------

describe('QModelCollection — la API $q* es accesible', () => {
	it('$qSerialize() retorna array de objetos planos', () => {
		const result = makeCollection().$qSerialize();
		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBe(2);
	});
	it('$qSize retorna el número de elementos', () => {
		expect(makeCollection().$qSize).toBe(2);
	});
	it('$qIsEmpty es false con elementos', () => {
		expect(makeCollection().$qIsEmpty).toBe(false);
	});
	it('$qFirst() retorna el primer elemento', () => {
		expect(makeCollection().$qFirst()?.sku).toBe('ABC-1');
	});
	it('$qLast() retorna el último elemento', () => {
		expect(makeCollection().$qLast()?.sku).toBe('DEF-2');
	});
	it('$qWhere() filtra correctamente', () => {
		const result = makeCollection().$qWhere((prd) => prd.price > 50);
		expect(result.$qSize).toBe(1);
		expect(result.$qFirst()?.sku).toBe('ABC-1');
	});
	it('$qFind() retorna elemento o undefined', () => {
		expect(
			makeCollection().$qFind((prd) => prd.sku === 'DEF-2')?.price
		).toBe(49);
		expect(
			makeCollection().$qFind((prd) => prd.sku === 'NO')
		).toBeUndefined();
	});
	it('$qSortBy() ordena asc por defecto', () => {
		const sorted = makeCollection().$qSortBy('price');
		expect(sorted.$qFirst()?.price).toBe(49);
	});
	it('$qSortBy() con order:desc', () => {
		const sorted = makeCollection().$qSortBy('price', { order: 'desc' });
		expect(sorted.$qFirst()?.price).toBe(99);
	});
	it('$qToJSON() retorna JSON string', () => {
		const json = makeCollection().$qToJSON();
		expect(typeof json).toBe('string');
		const parsed = JSON.parse(json) as unknown[];
		expect(parsed.length).toBe(2);
	});
	it('QModelCollection.$qFromJSON() restaura colección', () => {
		const json = makeCollection().$qToJSON();
		const restored = QModelCollection.$qFromJSON(Product, json);
		expect(restored).toBeInstanceOf(QModelCollection);
		expect(restored.$qSize).toBe(2);
		expect(restored.$qFirst()).toBeInstanceOf(Product);
	});
	it('QModelCollection.$qFromArray() crea colección desde array', () => {
		const col = QModelCollection.$qFromArray(Product, [
			{ sku: 'X', price: 1 },
		]);
		expect(col.$qSize).toBe(1);
		expect(col.$qFirst()).toBeInstanceOf(Product);
	});
	it('toJSON() sigue funcionando — protocolo JS nativo', () => {
		const json = JSON.stringify(makeCollection());
		expect(typeof json).toBe('string');
		expect(json).toContain('ABC-1');
	});
	it('$qCheckAllRules() retorna { valid, errors }', () => {
		const result = makeCollection().$qCheckAllRules();
		expect(result).toHaveProperty('valid');
		expect(result).toHaveProperty('errors');
	});
});
