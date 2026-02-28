// @quickmodel-rule-ignore: prefer-quick
// This file tests @QType directly — opt-out from the prefer-quick rule.
/**
 * Test: Probar tipos "complejos" SIN symbols
 *
 * Verificar qué pasa con RegExp, Error, TypedArrays, ArrayBuffer, etc.
 * cuando NO usamos symbols explícitos
 */

import { describe, test, expect } from 'bun:test';
import { QModel, IQImplements } from '@/index';
import { QType } from '@/decorators';

// ============================================================================
// Nested Model
// ============================================================================

interface ITag {
	id: string;
	name: string;
}

class Tag extends QModel<ITag> {
	@QType() id!: string;
	@QType() name!: string;
}

// ============================================================================
// Test Model
// ============================================================================

interface IComplexTypes {
	// Tipos que queremos probar
	pattern: { source: string; flags: string };
	error: { message: string; stack?: string; name?: string };
	buffer: number[];
	view: number[];
	uint8: number[];
	tags: ITag[];
}

type IComplexTypesTransforms = {
	pattern: RegExp;
	error: Error;
	buffer: ArrayBuffer;
	view: DataView;
	uint8: Uint8Array;
	tags: Tag[];
};

// SIN especificar symbols - solo @QType()
class ComplexTypesModel
	extends QModel<IComplexTypes>
	implements IQImplements<IComplexTypes, IComplexTypesTransforms>
{
	@QType() pattern!: RegExp; // Sin QRegExp
	@QType() error!: Error; // Sin QError
	@QType() buffer!: ArrayBuffer; // Sin symbol
	@QType() view!: DataView; // Sin symbol
	@QType() uint8!: Uint8Array; // Sin QUint8Array
	@QType() tags!: Tag[]; // Sin Tag en @QType
}

// ============================================================================
// Tests
// ============================================================================

describe('Tipos complejos SIN symbols', () => {
	test('Verificar metadata emitida por TypeScript', () => {
		// RegExp, Error, ArrayBuffer, DataView, Uint8Array emiten su propio tipo en reflect-metadata
		expect(
			Reflect.getMetadata(
				'design:type',
				ComplexTypesModel.prototype,
				'pattern'
			)
		).toBe(RegExp);
		expect(
			Reflect.getMetadata(
				'design:type',
				ComplexTypesModel.prototype,
				'error'
			)
		).toBe(Error);
		expect(
			Reflect.getMetadata(
				'design:type',
				ComplexTypesModel.prototype,
				'buffer'
			)
		).toBe(ArrayBuffer);
		expect(
			Reflect.getMetadata(
				'design:type',
				ComplexTypesModel.prototype,
				'view'
			)
		).toBe(DataView);
		expect(
			Reflect.getMetadata(
				'design:type',
				ComplexTypesModel.prototype,
				'uint8'
			)
		).toBe(Uint8Array);
		// Los arrays emiten Array como design:type
		expect(
			Reflect.getMetadata(
				'design:type',
				ComplexTypesModel.prototype,
				'tags'
			)
		).toBe(Array);
	});

	test('Probar RegExp sin QRegExp symbol', () => {
		const data: IComplexTypes = {
			pattern: { source: '^test$', flags: 'i' },
			error: { message: 'Test' },
			buffer: [1, 2, 3],
			view: [1, 2, 3],
			uint8: [1, 2, 3],
			tags: [{ id: '1', name: 'tag1' }],
		};

		const model = new ComplexTypesModel(data);

		expect(model.pattern).toBeInstanceOf(RegExp);
		expect(model.pattern.source).toBe('^test$');
		expect(model.pattern.flags).toBe('i');
	});

	test('Probar Error sin QError symbol', () => {
		const data: IComplexTypes = {
			pattern: { source: 'test', flags: '' },
			error: {
				message: 'Test error',
				stack: 'stack trace',
				name: 'TestError',
			},
			buffer: [1, 2, 3],
			view: [1, 2, 3],
			uint8: [1, 2, 3],
			tags: [{ id: '1', name: 'tag1' }],
		};

		const model = new ComplexTypesModel(data);

		expect(model.error).toBeInstanceOf(Error);
		expect(model.error.message).toBe('Test error');
	});

	test('Probar Uint8Array sin QUint8Array symbol', () => {
		const data: IComplexTypes = {
			pattern: { source: 'test', flags: '' },
			error: { message: 'Test' },
			buffer: [1, 2, 3],
			view: [1, 2, 3],
			uint8: [1, 2, 3],
			tags: [{ id: '1', name: 'tag1' }],
		};

		const model = new ComplexTypesModel(data);

		expect(model.uint8).toBeInstanceOf(Uint8Array);
		expect(Array.from(model.uint8)).toEqual([1, 2, 3]);
	});

	test('Probar ArrayBuffer sin symbol', () => {
		const data: IComplexTypes = {
			pattern: { source: 'test', flags: '' },
			error: { message: 'Test' },
			buffer: [1, 2, 3],
			view: [1, 2, 3],
			uint8: [1, 2, 3],
			tags: [{ id: '1', name: 'tag1' }],
		};

		const model = new ComplexTypesModel(data);

		expect(model.buffer).toBeInstanceOf(ArrayBuffer);
	});

	test('Probar DataView sin symbol', () => {
		const data: IComplexTypes = {
			pattern: { source: 'test', flags: '' },
			error: { message: 'Test' },
			buffer: [1, 2, 3],
			view: [1, 2, 3],
			uint8: [1, 2, 3],
			tags: [{ id: '1', name: 'tag1' }],
		};

		const model = new ComplexTypesModel(data);

		expect(model.view).toBeInstanceOf(DataView);
	});

	test('Probar Array de modelos sin especificar Tag', () => {
		const data: IComplexTypes = {
			pattern: { source: 'test', flags: '' },
			error: { message: 'Test' },
			buffer: [1, 2, 3],
			view: [1, 2, 3],
			uint8: [1, 2, 3],
			tags: [
				{ id: '1', name: 'tag1' },
				{ id: '2', name: 'tag2' },
			],
		};

		const model = new ComplexTypesModel(data);

		// Sin especificar @QType(Tag), el array no auto-infiere la clase Tag
		// Los items son plain objects (límite documentado del sistema)
		expect(model.tags).toHaveLength(2);
		expect(model.tags?.[0]?.id).toBe('1');
		expect(model.tags?.[0]?.name).toBe('tag1');
		// NO son instancias de Tag sin especificación explícita del tipo
		expect(model.tags?.[0] instanceof Tag).toBe(false);
	});
});
