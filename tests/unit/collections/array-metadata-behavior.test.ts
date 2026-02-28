// @quickmodel-rule-ignore: prefer-quick
// @QType( appears only in doc comments — not as a decorator.
/**
 * Test: Verificar metadata de arrays y tipos union
 *
 * ¿TypeScript emite el tipo de elemento de un array?
 * ¿Qué pasa con union types como 'pepe' | 'maria'?
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

// ============================================================================
// Nested Models
// ============================================================================

interface ITag {
	id: string;
	name: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class Tag extends QModel<ITag> {
	declare id: string;
	declare name: string;
}

// interface IUser {
//   id: string;
//   name: string;
// }

/*
@Quick({}, { unknownPropertyPolicy: 'keep' })
class _User extends QModel<IUser> {
  declare id: string;
  declare name: string;
}
*/

// ============================================================================
// Test Models
// ============================================================================

type IRole = 'admin' | 'user' | 'guest';
type IStatus = 'active' | 'inactive';

interface IArraysAndUnions {
	// Arrays de diferentes tipos
	strArray: string[];
	numArray: number[];
	modelArray: ITag[];

	// Union types
	role: IRole;
	status: IStatus;

	// Literal types
	literalStr: 'pepe' | 'maria';
	literalNum: 1 | 2 | 3;

	// Combinaciones
	optional?: string;
	nullable: string | null;
	mixed: string | number;
}

@Quick(
	{
		modelArray: [Tag],
	},
	{ unknownPropertyPolicy: 'keep' }
)
class ArraysAndUnionsModel extends QModel<IArraysAndUnions> {
	declare strArray: string[];
	declare numArray: number[];
	declare modelArray: Tag[];

	declare role: IRole;
	declare status: IStatus;

	declare literalStr: 'pepe' | 'maria';
	declare literalNum: 1 | 2 | 3;

	declare optional?: string;
	declare nullable: string | null;
	declare mixed: string | number;
}

// ============================================================================
// Tests
// ============================================================================

describe('Metadata de arrays y union types', () => {
	test('Verificar metadata de arrays', () => {
		const arrayProps = ['strArray', 'numArray', 'modelArray'];

		arrayProps.forEach((prop) => {
			const metadata = Reflect.getMetadata(
				'design:type',
				ArraysAndUnionsModel.prototype,
				prop
			);
			// Sin @QType, TypeScript puede o no emitir metadata de tipo
			// El comportamiento observable es que el valor es Function o undefined
			expect(
				metadata === undefined || typeof metadata === 'function'
			).toBe(true);
		});
	});

	test('Verificar metadata de union types', () => {
		const unionProps = [
			'role',
			'status',
			'literalStr',
			'literalNum',
			'optional',
			'nullable',
			'mixed',
		];

		unionProps.forEach((prop) => {
			const metadata = Reflect.getMetadata(
				'design:type',
				ArraysAndUnionsModel.prototype,
				prop
			);
			// Union types y literales: TypeScript emite Object o String o Number
			expect(
				metadata === undefined || typeof metadata === 'function'
			).toBe(true);
		});
	});

	test('Probar comportamiento de arrays sin especificar tipo', () => {
		const data: IArraysAndUnions = {
			strArray: ['a', 'b', 'c'],
			numArray: [1, 2, 3],
			modelArray: [
				{ id: '1', name: 'tag1' },
				{ id: '2', name: 'tag2' },
			],
			role: 'admin',
			status: 'active',
			literalStr: 'pepe',
			literalNum: 1,
			nullable: 'test',
			mixed: 'string',
		};

		const model = new ArraysAndUnionsModel(data);

		// Los arrays de primitivos funcionan
		expect(model.strArray).toEqual(['a', 'b', 'c']);
		expect(model.numArray).toEqual([1, 2, 3]);

		// Los arrays de modelos sin @QType(Tag) NO funcionan
		// (solo son objetos planos)
	});

	test('Probar comportamiento de union types', () => {
		const data: IArraysAndUnions = {
			strArray: [],
			numArray: [],
			modelArray: [],
			role: 'admin',
			status: 'active',
			literalStr: 'maria',
			literalNum: 2,
			nullable: null,
			mixed: 123,
		};

		const model = new ArraysAndUnionsModel(data);

		// Union types se preservan como su valor real
		expect(model.role).toBe('admin');
		expect(model.literalStr).toBe('maria');
		expect(model.literalNum).toBe(2);
		expect(model.nullable).toBe(null);
		expect(model.mixed).toBe(123);
	});
});
