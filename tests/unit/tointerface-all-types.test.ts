import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '../../src';

// Interface con TODOS los tipos posibles
interface AllTypesInterface {
	// Números
	numPrimitive: number;
	numWrapper: Number;
	numNaN: number;
	numInfinity: number;
	numNegInfinity: number;
	
	// Strings
	strPrimitive: string;
	strWrapper: String;
	strEmpty: string;
	
	// Booleans
	boolPrimitive: boolean;
	boolWrapper: Boolean;
	
	// BigInt
	bigintPrimitive: bigint;
	bigintZero: bigint;
	
	// Symbols
	symUnique: symbol;
	symGlobal: symbol;
	symWellKnown: symbol;
	
	// Null y Undefined
	nullValue: null;
	undefinedValue: undefined;
	
	// Arrays mixtos
	arrayMixed: Array<number | string | null | undefined | boolean>;
	arrayEmpty: any[];
	
	// Objetos
	plainObject: { a: number; b: string; nested: { c: boolean } };
	objectWithNull: { x: null; y: undefined };
}

@Quick({})
class AllTypesModel extends QModel<AllTypesInterface> {
	declare numPrimitive: number;
	declare numWrapper: Number;
	declare numNaN: number;
	declare numInfinity: number;
	declare numNegInfinity: number;
	
	declare strPrimitive: string;
	declare strWrapper: String;
	declare strEmpty: string;
	
	declare boolPrimitive: boolean;
	declare boolWrapper: Boolean;
	
	declare bigintPrimitive: bigint;
	declare bigintZero: bigint;
	
	declare symUnique: symbol;
	declare symGlobal: symbol;
	declare symWellKnown: symbol;
	
	declare nullValue: null;
	declare undefinedValue: undefined;
	
	declare arrayMixed: Array<number | string | null | undefined | boolean>;
	declare arrayEmpty: any[];
	
	declare plainObject: { a: number; b: string; nested: { c: boolean } };
	declare objectWithNull: { x: null; y: undefined };
}

describe('toInterface() - All Types Preservation', () => {
	test('should preserve number primitives exactly', () => {
		const data = {
			numPrimitive: 42,
			numWrapper: new Number(99),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			strPrimitive: 'test',
			strWrapper: new String('test'),
			strEmpty: '',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			bigintPrimitive: 123n,
			bigintZero: 0n,
			symUnique: Symbol('test'),
			symGlobal: Symbol.for('global'),
			symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [1, 'str', null, undefined, true, NaN],
			arrayEmpty: [],
			plainObject: { a: 1, b: 'test', nested: { c: true } },
			objectWithNull: { x: null, y: undefined }
		};
		
		const model = new AllTypesModel(data);
		const result = model.toInterface();
		
		// Números primitivos
		expect(result.numPrimitive).toBe(42);
		expect(typeof result.numPrimitive).toBe('number');
		expect(result.numPrimitive instanceof Number).toBe(false);
		
		// Number wrapper
		expect(result.numWrapper).toBeInstanceOf(Number);
		expect(typeof result.numWrapper).toBe('object');
		expect(result.numWrapper.valueOf()).toBe(99);
		
		// NaN se preserva como number
		expect(result.numNaN).toBe(NaN);
		expect(typeof result.numNaN).toBe('number');
		expect(Number.isNaN(result.numNaN)).toBe(true);
		
		// Infinity
		expect(result.numInfinity).toBe(Infinity);
		expect(typeof result.numInfinity).toBe('number');
		
		// -Infinity
		expect(result.numNegInfinity).toBe(-Infinity);
		expect(typeof result.numNegInfinity).toBe('number');
	});
	
	test('should preserve string primitives vs wrappers', () => {
		const data = {
			numPrimitive: 1,
			numWrapper: new Number(1),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			strPrimitive: 'hello',
			strWrapper: new String('world'),
			strEmpty: '',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			bigintPrimitive: 123n,
			bigintZero: 0n,
			symUnique: Symbol('test'),
			symGlobal: Symbol.for('global'),
			symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [],
			arrayEmpty: [],
			plainObject: { a: 1, b: '', nested: { c: true } },
			objectWithNull: { x: null, y: undefined }
		};
		
		const model = new AllTypesModel(data);
		const result = model.toInterface();
		
		// String primitivo
		expect(result.strPrimitive).toBe('hello');
		expect(typeof result.strPrimitive).toBe('string');
		expect(result.strPrimitive instanceof String).toBe(false);
		
		// String wrapper
		expect(result.strWrapper).toBeInstanceOf(String);
		expect(typeof result.strWrapper).toBe('object');
		expect(result.strWrapper.valueOf()).toBe('world');
		
		// String vacío
		expect(result.strEmpty).toBe('');
		expect(typeof result.strEmpty).toBe('string');
	});
	
	test('should preserve boolean primitives vs wrappers', () => {
		const data = {
			numPrimitive: 1,
			numWrapper: new Number(1),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			strPrimitive: 'test',
			strWrapper: new String('test'),
			strEmpty: '',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			bigintPrimitive: 123n,
			bigintZero: 0n,
			symUnique: Symbol('test'),
			symGlobal: Symbol.for('global'),
			symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [],
			arrayEmpty: [],
			plainObject: { a: 1, b: '', nested: { c: true } },
			objectWithNull: { x: null, y: undefined }
		};
		
		const model = new AllTypesModel(data);
		const result = model.toInterface();
		
		// Boolean primitivo
		expect(result.boolPrimitive).toBe(true);
		expect(typeof result.boolPrimitive).toBe('boolean');
		expect(result.boolPrimitive instanceof Boolean).toBe(false);
		
		// Boolean wrapper
		expect(result.boolWrapper).toBeInstanceOf(Boolean);
		expect(typeof result.boolWrapper).toBe('object');
		expect(result.boolWrapper.valueOf()).toBe(false);
	});
	
	test('should preserve bigint primitives', () => {
		const data = {
			numPrimitive: 1,
			numWrapper: new Number(1),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			strPrimitive: 'test',
			strWrapper: new String('test'),
			strEmpty: '',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			bigintPrimitive: 999999999n,
			bigintZero: 0n,
			symUnique: Symbol('test'),
			symGlobal: Symbol.for('global'),
			symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [],
			arrayEmpty: [],
			plainObject: { a: 1, b: '', nested: { c: true } },
			objectWithNull: { x: null, y: undefined }
		};
		
		const model = new AllTypesModel(data);
		const result = model.toInterface();
		
		// BigInt primitivo
		expect(result.bigintPrimitive).toBe(999999999n);
		expect(typeof result.bigintPrimitive).toBe('bigint');
		
		// BigInt 0
		expect(result.bigintZero).toBe(0n);
		expect(typeof result.bigintZero).toBe('bigint');
	});
	
	test('should preserve symbols by reference', () => {
		const sym1 = Symbol('test');
		const sym2 = Symbol.for('global');
		const sym3 = Symbol.iterator;
		
		const data = {
			numPrimitive: 1,
			numWrapper: new Number(1),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			strPrimitive: 'test',
			strWrapper: new String('test'),
			strEmpty: '',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			bigintPrimitive: 123n,
			bigintZero: 0n,
			symUnique: sym1,
			symGlobal: sym2,
			symWellKnown: sym3,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [],
			arrayEmpty: [],
			plainObject: { a: 1, b: '', nested: { c: true } },
			objectWithNull: { x: null, y: undefined }
		};
		
		const model = new AllTypesModel(data);
		const result = model.toInterface();
		
		// Symbols deben ser EXACTAMENTE los mismos (by reference)
		expect(result.symUnique).toBe(sym1);
		expect(typeof result.symUnique).toBe('symbol');
		
		expect(result.symGlobal).toBe(sym2);
		expect(typeof result.symGlobal).toBe('symbol');
		
		expect(result.symWellKnown).toBe(sym3);
		expect(result.symWellKnown).toBe(Symbol.iterator);
		expect(typeof result.symWellKnown).toBe('symbol');
	});
	
	test('should preserve null and undefined', () => {
		const data = {
			numPrimitive: 1,
			numWrapper: new Number(1),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			strPrimitive: 'test',
			strWrapper: new String('test'),
			strEmpty: '',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			bigintPrimitive: 123n,
			bigintZero: 0n,
			symUnique: Symbol('test'),
			symGlobal: Symbol.for('global'),
			symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [],
			arrayEmpty: [],
			plainObject: { a: 1, b: '', nested: { c: true } },
			objectWithNull: { x: null, y: undefined }
		};
		
		const model = new AllTypesModel(data);
		const result = model.toInterface();
		
		// null
		expect(result.nullValue).toBe(null);
		expect(result.nullValue).toBeNull();
		
		// undefined
		expect(result.undefinedValue).toBe(undefined);
		expect(result.undefinedValue).toBeUndefined();
	});
	
	test('should preserve arrays with mixed types', () => {
		const data = {
			numPrimitive: 1,
			numWrapper: new Number(1),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			strPrimitive: 'test',
			strWrapper: new String('test'),
			strEmpty: '',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			bigintPrimitive: 123n,
			bigintZero: 0n,
			symUnique: Symbol('test'),
			symGlobal: Symbol.for('global'),
			symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [42, 'str', null, undefined, true, NaN, Infinity, new Number(99)],
			arrayEmpty: [],
			plainObject: { a: 1, b: '', nested: { c: true } },
			objectWithNull: { x: null, y: undefined }
		};
		
		const model = new AllTypesModel(data);
		const result = model.toInterface();
		
		// Array debe preservar tipos de cada elemento
		expect(Array.isArray(result.arrayMixed)).toBe(true);
		expect(result.arrayMixed.length).toBe(8);
		
		expect(result.arrayMixed[0]).toBe(42);
		expect(typeof result.arrayMixed[0]).toBe('number');
		
		expect(result.arrayMixed[1]).toBe('str');
		expect(typeof result.arrayMixed[1]).toBe('string');
		
		expect(result.arrayMixed[2]).toBe(null);
		expect(result.arrayMixed[3]).toBe(undefined);
		
		expect(result.arrayMixed[4]).toBe(true);
		expect(typeof result.arrayMixed[4]).toBe('boolean');
		
		expect(result.arrayMixed[5]).toBe(NaN);
		expect(Number.isNaN(result.arrayMixed[5])).toBe(true);
		
		expect(result.arrayMixed[6]).toBe(Infinity);
		
		expect(result.arrayMixed[7]).toBeInstanceOf(Number);
		expect(result.arrayMixed[7].valueOf()).toBe(99);
		
		// Array vacío
		expect(Array.isArray(result.arrayEmpty)).toBe(true);
		expect(result.arrayEmpty.length).toBe(0);
	});
	
	test('should preserve nested objects with all types', () => {
		const data = {
			numPrimitive: 1,
			numWrapper: new Number(1),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			strPrimitive: 'test',
			strWrapper: new String('test'),
			strEmpty: '',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			bigintPrimitive: 123n,
			bigintZero: 0n,
			symUnique: Symbol('test'),
			symGlobal: Symbol.for('global'),
			symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [],
			arrayEmpty: [],
			plainObject: { 
				a: 42, 
				b: 'nested', 
				nested: { 
					c: true,
					d: NaN,
					e: null
				} 
			},
			objectWithNull: { x: null, y: undefined }
		};
		
		const model = new AllTypesModel(data);
		const result = model.toInterface();
		
		// Objeto plano
		expect(typeof result.plainObject).toBe('object');
		expect(result.plainObject.a).toBe(42);
		expect(typeof result.plainObject.a).toBe('number');
		expect(result.plainObject.b).toBe('nested');
		expect(typeof result.plainObject.b).toBe('string');
		
		// Objeto anidado
		expect(typeof result.plainObject.nested).toBe('object');
		expect(result.plainObject.nested.c).toBe(true);
		expect(typeof result.plainObject.nested.c).toBe('boolean');
		expect(result.plainObject.nested.d).toBe(NaN);
		expect(Number.isNaN(result.plainObject.nested.d)).toBe(true);
		expect(result.plainObject.nested.e).toBe(null);
		
		// Objeto con null/undefined
		expect(result.objectWithNull.x).toBe(null);
		expect(result.objectWithNull.y).toBe(undefined);
	});
	
	test('should handle modification and still preserve types in toInterface()', () => {
		const sym = Symbol('original');
		const data = {
			numPrimitive: 42,
			numWrapper: new Number(99),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			strPrimitive: 'original',
			strWrapper: new String('original'),
			strEmpty: '',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			bigintPrimitive: 123n,
			bigintZero: 0n,
			symUnique: sym,
			symGlobal: Symbol.for('global'),
			symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [1, 'str'],
			arrayEmpty: [],
			plainObject: { a: 1, b: 'test', nested: { c: true } },
			objectWithNull: { x: null, y: undefined }
		};
		
		const model = new AllTypesModel(data);
		
		// Modificar valores
		model.numPrimitive = 100;
		model.strPrimitive = 'modified';
		model.boolPrimitive = false;
		model.bigintPrimitive = 999n;
		
		const result = model.toInterface();
		
		// Los tipos se deben preservar según __initData original
		expect(result.numPrimitive).toBe(100);
		expect(typeof result.numPrimitive).toBe('number');
		expect(result.numPrimitive instanceof Number).toBe(false); // primitivo como original
		
		expect(result.strPrimitive).toBe('modified');
		expect(typeof result.strPrimitive).toBe('string');
		expect(result.strPrimitive instanceof String).toBe(false); // primitivo como original
		
		expect(result.boolPrimitive).toBe(false);
		expect(typeof result.boolPrimitive).toBe('boolean');
		
		expect(result.bigintPrimitive).toBe(999n);
		expect(typeof result.bigintPrimitive).toBe('bigint');
	});
	
	test('should preserve wrapper types even after modification', () => {
		const data = {
			numPrimitive: 1,
			numWrapper: new Number(50),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			strPrimitive: 'test',
			strWrapper: new String('original'),
			strEmpty: '',
			boolPrimitive: true,
			boolWrapper: new Boolean(true),
			bigintPrimitive: 123n,
			bigintZero: 0n,
			symUnique: Symbol('test'),
			symGlobal: Symbol.for('global'),
			symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [],
			arrayEmpty: [],
			plainObject: { a: 1, b: '', nested: { c: true } },
			objectWithNull: { x: null, y: undefined }
		};
		
		const model = new AllTypesModel(data);
		
		// Modificar con primitivos
		model.numWrapper = 999 as any;
		model.strWrapper = 'changed' as any;
		model.boolWrapper = false as any;
		
		const result = model.toInterface();
		
		// Debe devolver WRAPPERS porque __initData tenía wrappers
		expect(result.numWrapper).toBeInstanceOf(Number);
		expect(typeof result.numWrapper).toBe('object');
		expect(result.numWrapper.valueOf()).toBe(999);
		
		expect(result.strWrapper).toBeInstanceOf(String);
		expect(typeof result.strWrapper).toBe('object');
		expect(result.strWrapper.valueOf()).toBe('changed');
		
		expect(result.boolWrapper).toBeInstanceOf(Boolean);
		expect(typeof result.boolWrapper).toBe('object');
		expect(result.boolWrapper.valueOf()).toBe(false);
	});
});
