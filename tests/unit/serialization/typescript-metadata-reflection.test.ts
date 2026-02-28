// @quickmodel-rule-ignore: prefer-quick
// This file tests @QType directly — opt-out from the prefer-quick rule.
/**
 * Test: ¿Qué metadata emite TypeScript para bigint?
 */

import { describe, test, expect } from 'bun:test';
import { QModel } from '@/index';
import { QType } from '@/decorators';

// ============================================================================
// Test Models
// ============================================================================

interface ITest {
	str: string;
	num: number;
	bool: boolean;
	big: string; // bigint serializado
	date: string; // Date serializado
}

class TestModel extends QModel<ITest> {
	@QType() str!: string;
	@QType() num!: number;
	@QType() bool!: boolean;
	@QType() big!: bigint; // 👈 TypeScript sabe que es bigint
	@QType() date!: Date; // 👈 TypeScript sabe que es Date
}

// ============================================================================
// Tests
// ============================================================================

describe('TypeScript Metadata Emission', () => {
	test('¿Qué metadata emite TypeScript?', () => {
		// Obtener metadata de cada propiedad
		const strType = Reflect.getMetadata(
			'design:type',
			TestModel.prototype,
			'str'
		);
		const numType = Reflect.getMetadata(
			'design:type',
			TestModel.prototype,
			'num'
		);
		const boolType = Reflect.getMetadata(
			'design:type',
			TestModel.prototype,
			'bool'
		);
		const bigType = Reflect.getMetadata(
			'design:type',
			TestModel.prototype,
			'big'
		);
		const dateType = Reflect.getMetadata(
			'design:type',
			TestModel.prototype,
			'date'
		);

		// Verificar
		expect(strType).toBe(String);
		expect(numType).toBe(Number);
		expect(boolType).toBe(Boolean);
		expect(dateType).toBe(Date); // ✅ Date sí funciona

		// TypeScript emite Object, NO BigInt
		expect(bigType).toBe(BigInt); // ✅ TypeScript SÍ emite BigInt correctamente!
	});

	test('Comparación: TypeScript emite BigInt correctamente', () => {
		const metadata = Reflect.getMetadata(
			'design:type',
			TestModel.prototype,
			'big'
		);

		expect(metadata).toBe(BigInt);
	});

	test('Demostración: bigint AHORA funciona automáticamente!', () => {
		const data: ITest = {
			str: 'hello',
			num: 42,
			bool: true,
			big: '999999999999999999',
			date: '2024-01-01T00:00:00.000Z',
		};

		const model = new TestModel(data);

		// Date funciona porque TypeScript emite Date correctamente
		expect(model.date).toBeInstanceOf(Date);

		// bigint AHORA funciona también!
		expect(typeof model.big).toBe('bigint'); // ✅ Funciona!
		expect(model.big).toBe(999999999999999999n);
	});
});
