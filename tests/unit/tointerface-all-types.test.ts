import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

// Interface con TODOS los tipos posibles
interface AllTypesInterface {
	// Números
	numPrimitive: number;
	numWrapper: Number;
	numNaN: number;
	numInfinity: number;
	numNegInfinity: number;
	numZero: number;
	numNegative: number;

	// Strings
	strPrimitive: string;
	strWrapper: String;
	strEmpty: string;
	strWithSpaces: string;
	strUnicode: string;

	// Booleans
	boolPrimitive: boolean;
	boolWrapper: Boolean;
	boolFalse: boolean;

	// BigInt
	bigintPrimitive: bigint | string;
	bigintZero: bigint | string;
	bigintNegative: bigint | string;
	bigintString: string; // BigInt serializado como string
	bigintObject: { __type: string; value: string }; // BigInt serializado como objeto

	// Symbols
	symUnique: symbol | { __type: string; description: string };
	symGlobal: symbol | { __type: string; description: string };
	symWellKnown: symbol | { __type: string; description: string };

	// Null y Undefined
	nullValue: null;
	undefinedValue: undefined;

	// Arrays mixtos
	arrayMixed: Array<number | string | null | undefined | boolean>;
	arrayEmpty: any[];
	arrayNested: Array<Array<number>>;
	arrayWithWrappers: Array<Number | String | Boolean>;

	// Objetos
	plainObject: {
		a: number;
		b: string;
		nested: {
			c: boolean;
			d?: number;
			e?: null;
			deeper?: { f?: number; g?: undefined };
		};
	};
	objectWithNull: { x: null; y: undefined; z?: { w: null } };
	objectNoProto: any; // Object.create(null)
	objectDeeplyNested: {
		level1: {
			l1val?: number;
			level2: {
				l2val?: string;
				level3: {
					l3val?: boolean;
					value: number;
					nested?: { x: number };
				};
			};
		};
	};

	// Date (en formato string ISO)
	dateISO: string;
	dateNow: string;

	// RegExp en diferentes formatos
	regexpString: string; // "/pattern/flags"
	regexpPattern: string; // "pattern"
	regexpObject: { source: string; flags: string };

	// Map serializado como array de pares
	mapAsArray: Array<[string, any]>;
	mapEmpty: Array<[any, any]>;

	// Set serializado como array
	setAsArray: Array<any>;
	setEmpty: Array<any>;

	// Funciones (deberían ignorarse o convertirse a undefined)
	functionValue?: undefined;
}

@Quick({ dateISO: Date, dateNow: Date })
class AllTypesModel extends QModel<AllTypesInterface> {
	declare numPrimitive: number;
	declare numWrapper: Number;
	declare numNaN: number;
	declare numInfinity: number;
	declare numNegInfinity: number;
	declare numZero: number;
	declare numNegative: number;

	declare strPrimitive: string;
	declare strWrapper: String;
	declare strEmpty: string;
	declare strWithSpaces: string;
	declare strUnicode: string;

	declare boolPrimitive: boolean;
	declare boolWrapper: Boolean;
	declare boolFalse: boolean;

	declare bigintPrimitive: bigint;
	declare bigintZero: bigint;
	declare bigintNegative: bigint;
	declare bigintString: string;
	declare bigintObject: { __type: string; value: string };

	declare symUnique: symbol;
	declare symGlobal: symbol;
	declare symWellKnown: symbol;

	declare nullValue: null;
	declare undefinedValue: undefined;

	declare arrayMixed: Array<number | string | null | undefined | boolean>;
	declare arrayEmpty: any[];
	declare arrayNested: Array<Array<number>>;
	declare arrayWithWrappers: Array<Number | String | Boolean>;

	declare plainObject: { a: number; b: string; nested: { c: boolean } };
	declare objectWithNull: { x: null; y: undefined };
	declare objectNoProto: any;
	declare objectDeeplyNested: {
		level1: { level2: { level3: { value: number } } };
	};

	declare dateISO: Date;
	declare dateNow: Date;

	declare regexpString: string;
	declare regexpPattern: string;
	declare regexpObject: { source: string; flags: string };

	declare mapAsArray: Array<[string, any]>;
	declare mapEmpty: Array<[any, any]>;

	declare setAsArray: Array<any>;
	declare setEmpty: Array<any>;

	declare functionValue?: undefined;
}

describe('toInterface() - All Types Preservation', () => {
	test('should preserve all number types exactly', () => {
		const data = {
			numPrimitive: 42,
			numWrapper: new Number(99),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			numZero: 0,
			numNegative: -273.15,
			strPrimitive: 'test',
			strWrapper: new String('test'),
			strEmpty: '',
			strWithSpaces: '  spaces  ',
			strUnicode: '🚀 UTF-8',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			boolFalse: false,
		// BigInt debe pasarse como string o formato serializado, no como bigint nativo
		bigintPrimitive: '123',
		bigintZero: '0',
		bigintNegative: '-999',
			bigintString: '999999999999999999',
			bigintObject: { __type: 'bigint', value: '123456789' },
		symUnique: Symbol('test'),
		symGlobal: Symbol.for('global'),
		symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [],
			arrayEmpty: [],
			arrayNested: [
				[1, 2],
				[3, 4],
			],
			arrayWithWrappers: [new Number(1), new String('test')],
			plainObject: { a: 1, b: 'test', nested: { c: true } },
			objectWithNull: { x: null, y: undefined },
			objectNoProto: Object.create(null),
			objectDeeplyNested: {
				level1: { level2: { level3: { value: 42 } } },
			},
			dateISO: '2024-01-01T00:00:00.000Z',
			dateNow: '2024-12-31T23:59:59.999Z',
			regexpString: '/test/gi',
			regexpPattern: 'test',
			regexpObject: { source: 'pattern', flags: 'gi' },
			mapAsArray: [
				['key1', 'value1'],
				['key2', 'value2'],
			],
			mapEmpty: [],
			setAsArray: [1, 2, 3, 4],
			setEmpty: [],
		};

		const model = new AllTypesModel(data);
		const result = model.toInterface();

		// Números primitivos
		expect(result.numPrimitive).toBe(42);
		expect(typeof result.numPrimitive).toBe('number');
		// Primitives are not instances of their wrapper constructors

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

		// Zero
		expect(result.numZero).toBe(0);
		expect(typeof result.numZero).toBe('number');

		// Negative
		expect(result.numNegative).toBe(-273.15);
		expect(typeof result.numNegative).toBe('number');
	});

	test('should preserve all string types', () => {
		const data = {
			numPrimitive: 1,
			numWrapper: new Number(1),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			numZero: 0,
			numNegative: -1,
			strPrimitive: 'hello world',
			strWrapper: new String('wrapper string'),
			strEmpty: '',
			strWithSpaces: '  leading and trailing  ',
			strUnicode: '你好世界 🌍',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			boolFalse: false,
		bigintPrimitive: '123',
		bigintZero: '0',
		bigintNegative: '-1',
		bigintString: '123',
		bigintObject: { __type: 'bigint', value: '123' },
			symUnique: Symbol('test'),
			symGlobal: Symbol.for('global'),
			symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [],
			arrayEmpty: [],
			arrayNested: [[]],
			arrayWithWrappers: [],
			plainObject: { a: 1, b: '', nested: { c: true } },
			objectWithNull: { x: null, y: undefined },
			objectNoProto: Object.create(null),
			objectDeeplyNested: {
				level1: { level2: { level3: { value: 1 } } },
			},
			dateISO: '2024-01-01T00:00:00.000Z',
			dateNow: '2024-01-01T00:00:00.000Z',
			regexpString: '/test/',
			regexpPattern: 'test',
			regexpObject: { source: 'test', flags: '' },
			mapAsArray: [],
			mapEmpty: [],
			setAsArray: [],
			setEmpty: [],
		};

		const model = new AllTypesModel(data);
		const result = model.toInterface();

		// String primitivo
		expect(result.strPrimitive).toBe('hello world');
		expect(typeof result.strPrimitive).toBe('string');
		// Primitives are not instances of their wrapper constructors

		// String wrapper
		expect(result.strWrapper).toBeInstanceOf(String);
		expect(typeof result.strWrapper).toBe('object');
		expect(result.strWrapper.valueOf()).toBe('wrapper string');

		// String vacío
		expect(result.strEmpty).toBe('');
		expect(typeof result.strEmpty).toBe('string');

		// String con espacios
		expect(result.strWithSpaces).toBe('  leading and trailing  ');
		expect(typeof result.strWithSpaces).toBe('string');

		// String Unicode
		expect(result.strUnicode).toBe('你好世界 🌍');
		expect(typeof result.strUnicode).toBe('string');
	});

	test('should preserve bigint in different formats', () => {
		const data = {
			numPrimitive: 1,
			numWrapper: new Number(1),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			numZero: 0,
			numNegative: -1,
			strPrimitive: 'test',
			strWrapper: new String('test'),
			strEmpty: '',
			strWithSpaces: 'test',
			strUnicode: 'test',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			boolFalse: false,
			bigintPrimitive: 999999999999n,
			bigintZero: 0n,
			bigintNegative: -123456789n,
			bigintString: '999999999999999999999',
			bigintObject: {
				__type: 'bigint',
				value: '123456789012345678901234567890',
			},
			symUnique: Symbol('test'),
			symGlobal: Symbol.for('global'),
			symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [],
			arrayEmpty: [],
			arrayNested: [[]],
			arrayWithWrappers: [],
			plainObject: { a: 1, b: '', nested: { c: true } },
			objectWithNull: { x: null, y: undefined },
			objectNoProto: Object.create(null),
			objectDeeplyNested: {
				level1: { level2: { level3: { value: 1 } } },
			},
			dateISO: '2024-01-01T00:00:00.000Z',
			dateNow: '2024-01-01T00:00:00.000Z',
			regexpString: '/test/',
			regexpPattern: 'test',
			regexpObject: { source: 'test', flags: '' },
			mapAsArray: [],
			mapEmpty: [],
			setAsArray: [],
			setEmpty: [],
		};

		const model = new AllTypesModel(data);
		const result = model.toInterface();

		// BigInt primitivo
		expect(result.bigintPrimitive).toBe(999999999999n);
		expect(typeof result.bigintPrimitive).toBe('bigint');

		// BigInt 0
		expect(result.bigintZero).toBe(0n);
		expect(typeof result.bigintZero).toBe('bigint');

		// BigInt negativo
		expect(result.bigintNegative).toBe(-123456789n);
		expect(typeof result.bigintNegative).toBe('bigint');

		// BigInt como string - debe preservarse como string
		expect(result.bigintString).toBe('999999999999999999999');
		expect(typeof result.bigintString).toBe('string');

		// BigInt como objeto - debe preservarse como objeto
		expect(result.bigintObject).toEqual({
			__type: 'bigint',
			value: '123456789012345678901234567890',
		});
		expect(typeof result.bigintObject).toBe('object');
	});

	test('should preserve Date objects as ISO strings', () => {
		const date1 = '2024-01-15T10:30:00.000Z';
		const date2 = '2024-12-31T23:59:59.999Z';

		const data = {
			numPrimitive: 1,
			numWrapper: new Number(1),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			numZero: 0,
			numNegative: -1,
			strPrimitive: 'test',
			strWrapper: new String('test'),
			strEmpty: '',
			strWithSpaces: 'test',
			strUnicode: 'test',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			boolFalse: false,
			bigintPrimitive: 123n,
			bigintZero: 0n,
			bigintNegative: -1n,
			bigintString: '123',
			bigintObject: { __type: 'bigint', value: '123' },
			symUnique: Symbol('test'),
			symGlobal: Symbol.for('global'),
			symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [],
			arrayEmpty: [],
			arrayNested: [[]],
			arrayWithWrappers: [],
			plainObject: { a: 1, b: '', nested: { c: true } },
			objectWithNull: { x: null, y: undefined },
			objectNoProto: Object.create(null),
			objectDeeplyNested: {
				level1: { level2: { level3: { value: 1 } } },
			},
			dateISO: date1,
			dateNow: date2,
			regexpString: '/test/',
			regexpPattern: 'test',
			regexpObject: { source: 'test', flags: '' },
			mapAsArray: [],
			mapEmpty: [],
			setAsArray: [],
			setEmpty: [],
		};

		const model = new AllTypesModel(data);

		// Las Dates se transforman internamente pero toInterface() debe devolver strings ISO
		expect(model.dateISO).toBeInstanceOf(Date);
		expect(model.dateNow).toBeInstanceOf(Date);

		const result = model.toInterface();

		// Debe devolver strings ISO (formato original)
		expect(result.dateISO).toBe(date1);
		expect(typeof result.dateISO).toBe('string');

		expect(result.dateNow).toBe(date2);
		expect(typeof result.dateNow).toBe('string');
	});

	test('should preserve RegExp in different formats', () => {
		const data = {
			numPrimitive: 1,
			numWrapper: new Number(1),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			numZero: 0,
			numNegative: -1,
			strPrimitive: 'test',
			strWrapper: new String('test'),
			strEmpty: '',
			strWithSpaces: 'test',
			strUnicode: 'test',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			boolFalse: false,
			bigintPrimitive: 123n,
			bigintZero: 0n,
			bigintNegative: -1n,
			bigintString: '123',
			bigintObject: { __type: 'bigint', value: '123' },
			symUnique: Symbol('test'),
			symGlobal: Symbol.for('global'),
			symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [],
			arrayEmpty: [],
			arrayNested: [[]],
			arrayWithWrappers: [],
			plainObject: { a: 1, b: '', nested: { c: true } },
			objectWithNull: { x: null, y: undefined },
			objectNoProto: Object.create(null),
			objectDeeplyNested: {
				level1: { level2: { level3: { value: 1 } } },
			},
			dateISO: '2024-01-01T00:00:00.000Z',
			dateNow: '2024-01-01T00:00:00.000Z',
			regexpString: '/test/gi',
			regexpPattern: 'pattern',
			regexpObject: { source: 'custom', flags: 'im' },
			mapAsArray: [],
			mapEmpty: [],
			setAsArray: [],
			setEmpty: [],
		};

		const model = new AllTypesModel(data);
		const result = model.toInterface();

		// RegExp como string "/pattern/flags" - debe preservarse como string
		expect(result.regexpString).toBe('/test/gi');
		expect(typeof result.regexpString).toBe('string');

		// RegExp como pattern string - debe preservarse como string
		expect(result.regexpPattern).toBe('pattern');
		expect(typeof result.regexpPattern).toBe('string');

		// RegExp como objeto - debe preservarse como objeto
		expect(result.regexpObject).toEqual({ source: 'custom', flags: 'im' });
		expect(typeof result.regexpObject).toBe('object');
	});

	test('should preserve arrays with nested structures', () => {
		const data = {
			numPrimitive: 1,
			numWrapper: new Number(1),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			numZero: 0,
			numNegative: -1,
			strPrimitive: 'test',
			strWrapper: new String('test'),
			strEmpty: '',
			strWithSpaces: 'test',
			strUnicode: 'test',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			boolFalse: false,
			bigintPrimitive: 123n,
			bigintZero: 0n,
			bigintNegative: -1n,
			bigintString: '123',
			bigintObject: { __type: 'bigint', value: '123' },
			symUnique: Symbol('test'),
			symGlobal: Symbol.for('global'),
			symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [1, 'str', null, undefined, true, NaN, Infinity],
			arrayEmpty: [],
			arrayNested: [
				[1, 2, 3],
				[4, 5, 6],
				[7, 8, 9],
			],
			arrayWithWrappers: [
				new Number(42),
				new String('test'),
				new Boolean(true),
			],
			plainObject: { a: 1, b: '', nested: { c: true } },
			objectWithNull: { x: null, y: undefined },
			objectNoProto: Object.create(null),
			objectDeeplyNested: {
				level1: { level2: { level3: { value: 1 } } },
			},
			dateISO: '2024-01-01T00:00:00.000Z',
			dateNow: '2024-01-01T00:00:00.000Z',
			regexpString: '/test/',
			regexpPattern: 'test',
			regexpObject: { source: 'test', flags: '' },
			mapAsArray: [],
			mapEmpty: [],
			setAsArray: [],
			setEmpty: [],
		};

		const model = new AllTypesModel(data);
		const result = model.toInterface();

		// Array mixto con diferentes tipos
		expect(Array.isArray(result.arrayMixed)).toBe(true);
		expect(result.arrayMixed.length).toBe(7);
		expect(result.arrayMixed[0]).toBe(1);
		expect(typeof result.arrayMixed[0]).toBe('number');
		expect(result.arrayMixed[1]).toBe('str');
		expect(result.arrayMixed[2]).toBe(null);
		expect(result.arrayMixed[3]).toBe(undefined);
		expect(result.arrayMixed[4]).toBe(true);
		expect(Number.isNaN(result.arrayMixed[5])).toBe(true);
		expect(result.arrayMixed[6]).toBe(Infinity);

		// Array vacío
		expect(Array.isArray(result.arrayEmpty)).toBe(true);
		expect(result.arrayEmpty.length).toBe(0);

		// Array anidado - debe preservar estructura
		expect(Array.isArray(result.arrayNested)).toBe(true);
		expect(result.arrayNested.length).toBe(3);
		expect(Array.isArray(result.arrayNested[0])).toBe(true);
		expect(result.arrayNested[0]).toEqual([1, 2, 3]);
		expect(result.arrayNested[1]).toEqual([4, 5, 6]);
		expect(result.arrayNested[2]).toEqual([7, 8, 9]);

		// Array con wrappers - debe preservar wrappers
		expect(Array.isArray(result.arrayWithWrappers)).toBe(true);
		expect(result.arrayWithWrappers[0]).toBeInstanceOf(Number);
	expect(result.arrayWithWrappers[0]!.valueOf()).toBe(42);
	expect(result.arrayWithWrappers[1]).toBeInstanceOf(String);
	expect(result.arrayWithWrappers[1]!.valueOf()).toBe('test');
	expect(result.arrayWithWrappers[2]).toBeInstanceOf(Boolean);
	expect(result.arrayWithWrappers[2]!.valueOf()).toBe(true);
	});

	test('should preserve Map serialized as array of pairs', () => {
		const data = {
			numPrimitive: 1,
			numWrapper: new Number(1),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			numZero: 0,
			numNegative: -1,
			strPrimitive: 'test',
			strWrapper: new String('test'),
			strEmpty: '',
			strWithSpaces: 'test',
			strUnicode: 'test',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			boolFalse: false,
			bigintPrimitive: 123n,
			bigintZero: 0n,
			bigintNegative: -1n,
			bigintString: '123',
			bigintObject: { __type: 'bigint', value: '123' },
			symUnique: Symbol('test'),
			symGlobal: Symbol.for('global'),
			symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [],
			arrayEmpty: [],
			arrayNested: [[]],
			arrayWithWrappers: [],
			plainObject: { a: 1, b: '', nested: { c: true } },
			objectWithNull: { x: null, y: undefined },
			objectNoProto: Object.create(null),
			objectDeeplyNested: {
				level1: { level2: { level3: { value: 1 } } },
			},
			dateISO: '2024-01-01T00:00:00.000Z',
			dateNow: '2024-01-01T00:00:00.000Z',
			regexpString: '/test/',
			regexpPattern: 'test',
			regexpObject: { source: 'test', flags: '' },
			mapAsArray: [
				['name', 'John'],
				['age', 30],
				['active', true],
			],
			mapEmpty: [],
			setAsArray: [],
			setEmpty: [],
		};

		const model = new AllTypesModel(data);
		const result = model.toInterface();

		// Map como array de pares
		expect(Array.isArray(result.mapAsArray)).toBe(true);
		expect(result.mapAsArray.length).toBe(3);
		expect(result.mapAsArray[0]).toEqual(['name', 'John']);
		expect(result.mapAsArray[1]).toEqual(['age', 30]);
		expect(result.mapAsArray[2]).toEqual(['active', true]);

		// Map vacío
		expect(Array.isArray(result.mapEmpty)).toBe(true);
		expect(result.mapEmpty.length).toBe(0);
	});

	test('should preserve Set serialized as array', () => {
		const data = {
			numPrimitive: 1,
			numWrapper: new Number(1),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			numZero: 0,
			numNegative: -1,
			strPrimitive: 'test',
			strWrapper: new String('test'),
			strEmpty: '',
			strWithSpaces: 'test',
			strUnicode: 'test',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			boolFalse: false,
			// BigInt debe pasarse como string o formato serializado
			bigintPrimitive: '123',
			bigintZero: '0',
			bigintNegative: '-1',
			bigintString: '123',
			bigintObject: { __type: 'bigint', value: '123' },
			symUnique: Symbol('test'),
			symGlobal: Symbol.for('global'),
			symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [],
			arrayEmpty: [],
			arrayNested: [[]],
			arrayWithWrappers: [],
			plainObject: { a: 1, b: '', nested: { c: true } },
			objectWithNull: { x: null, y: undefined },
			objectNoProto: Object.create(null),
			objectDeeplyNested: {
				level1: { level2: { level3: { value: 1 } } },
			},
			dateISO: '2024-01-01T00:00:00.000Z',
			dateNow: '2024-01-01T00:00:00.000Z',
			regexpString: '/test/',
			regexpPattern: 'test',
			regexpObject: { source: 'test', flags: '' },
			mapAsArray: [],
			mapEmpty: [],
			setAsArray: [1, 2, 3, 4, 5],
			setEmpty: [],
		};

		const model = new AllTypesModel(data);
		const result = model.toInterface();

		// Set como array
		expect(Array.isArray(result.setAsArray)).toBe(true);
		expect(result.setAsArray).toEqual([1, 2, 3, 4, 5]);

		// Set vacío
		expect(Array.isArray(result.setEmpty)).toBe(true);
		expect(result.setEmpty.length).toBe(0);
	});

	test('should preserve deeply nested objects', () => {
		const noProto = Object.create(null);
		noProto.key = 'value';
		noProto.nested = { prop: 42 };

		const data = {
			numPrimitive: 1,
			numWrapper: new Number(1),
			numNaN: NaN,
			numInfinity: Infinity,
			numNegInfinity: -Infinity,
			numZero: 0,
			numNegative: -1,
			strPrimitive: 'test',
			strWrapper: new String('test'),
			strEmpty: '',
			strWithSpaces: 'test',
			strUnicode: 'test',
			boolPrimitive: true,
			boolWrapper: new Boolean(false),
			boolFalse: false,
			bigintPrimitive: 123n,
			bigintZero: 0n,
			bigintNegative: -1n,
			bigintString: '123',
			bigintObject: { __type: 'bigint', value: '123' },
			symUnique: Symbol('test'),
			symGlobal: Symbol.for('global'),
			symWellKnown: Symbol.iterator,
			nullValue: null,
			undefinedValue: undefined,
			arrayMixed: [],
			arrayEmpty: [],
			arrayNested: [[]],
			arrayWithWrappers: [],
			plainObject: {
				a: 42,
				b: 'nested',
				nested: {
					c: true,
					d: NaN,
					e: null,
					deeper: {
						f: Infinity,
						g: undefined,
					},
				},
			},
			objectWithNull: { x: null, y: undefined, z: { w: null } },
			objectNoProto: noProto,
			objectDeeplyNested: {
				level1: {
					l1val: 1,
					level2: {
						l2val: 'two',
						level3: {
							l3val: true,
							value: 42,
							nested: { x: NaN },
						},
					},
				},
			},
			dateISO: '2024-01-01T00:00:00.000Z',
			dateNow: '2024-01-01T00:00:00.000Z',
			regexpString: '/test/',
			regexpPattern: 'test',
			regexpObject: { source: 'test', flags: '' },
			mapAsArray: [],
			mapEmpty: [],
			setAsArray: [],
			setEmpty: [],
		};

		const model = new AllTypesModel(data);
		const result = model.toInterface();

		// Objeto plano con anidamiento múltiple
		expect(typeof result.plainObject).toBe('object');
		expect(result.plainObject.a).toBe(42);
		expect(result.plainObject.b).toBe('nested');
		expect(result.plainObject.nested.c).toBe(true);
		expect(Number.isNaN(result.plainObject.nested.d)).toBe(true);
		expect(result.plainObject.nested.e).toBe(null);
	expect(result.plainObject.nested.deeper!.f).toBe(Infinity);
	expect(result.plainObject.nested.deeper!.g).toBe(undefined);

	// Objeto con null/undefined anidados
	expect(result.objectWithNull.x).toBe(null);
	expect(result.objectWithNull.y).toBe(undefined);
	expect(result.objectWithNull.z!.w).toBe(null);

	// Object.create(null) - debe preservar estructura
	expect(result.objectNoProto.key).toBe('value');
	expect(result.objectNoProto.nested.prop).toBe(42);

	// Objeto profundamente anidado
	expect(result.objectDeeplyNested.level1.l1val).toBe(1);
	expect(result.objectDeeplyNested.level1.level2.l2val).toBe('two');
	expect(result.objectDeeplyNested.level1.level2.level3.l3val).toBe(true);
	expect(result.objectDeeplyNested.level1.level2.level3.value).toBe(42);
	expect(
		Number.isNaN(
			result.objectDeeplyNested.level1.level2.level3.nested!.x
		)
	).toBe(true);
});

test('should preserve properties when mutated (toInterface uses __initData)', () => {
	const data = {
		numPrimitive: 50,
		numWrapper: new Number(50),
		numNaN: NaN,
		numInfinity: Infinity,
		numNegInfinity: -Infinity,
		numZero: 0,
		numNegative: -1,
		strPrimitive: 'test',
		strWrapper: new String('original'),
		strEmpty: '',
		strWithSpaces: 'test',
		strUnicode: 'test',
		boolPrimitive: true,
		boolWrapper: new Boolean(true),
		boolFalse: false,
		bigintPrimitive: '123',
		bigintZero: '0',
		bigintNegative: '-1',
		bigintString: '123',
		bigintObject: { __type: 'bigint', value: '123' },
		symUnique: Symbol('test'),
		symGlobal: Symbol.for('global'),
		symWellKnown: Symbol.iterator,
		nullValue: null,
		undefinedValue: undefined,
		arrayMixed: [],
		arrayEmpty: [],
		arrayNested: [[]],
		arrayWithWrappers: [],
		plainObject: { a: 1, b: '', nested: { c: true } },
		objectWithNull: { x: null, y: undefined },
		objectNoProto: Object.create(null),
		objectDeeplyNested: {
			level1: { level2: { level3: { value: 1 } } },
		},
		dateISO: '2024-01-01T00:00:00.000Z',
		dateNow: '2024-01-01T00:00:00.000Z',
		regexpString: '/test/',
		regexpPattern: 'test',
		regexpObject: { source: 'test', flags: '' },
		mapAsArray: [],
		mapEmpty: [],
		setAsArray: [],
		setEmpty: [],
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
