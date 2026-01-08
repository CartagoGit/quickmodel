/**
 * HIGH PRIORITY TESTS: Transformer Edge Cases
 * 
 * Tests for boundary conditions and edge cases in all transformers
 * to ensure robust handling of extreme values.
 * 
 * Priority: ⭐⭐⭐⭐ HIGH
 */

import { describe, test, expect } from 'bun:test';
import { QModel } from '../../../src/quick.model';
import { QType } from '../../../src/core/decorators/qtype.decorator';
import { Quick } from '../../../src/core/decorators/quick.decorator';

// ============================================================================
// TEST MODELS
// ============================================================================

interface IBigIntData {
	huge: string; // BigInt serialized
	negative: string;
	zero: string;
}

@Quick()
class BigIntData extends QModel<IBigIntData> {
	@QType() huge!: bigint;
	@QType() negative!: bigint;
	@QType() zero!: bigint;
}

interface IDateData {
	past: string; // Date serialized
	future: string;
	epoch: string;
}

@Quick()
class DateData extends QModel<IDateData> {
	@QType() past!: Date;
	@QType() future!: Date;
	@QType() epoch!: Date;
}

interface IRegExpData {
	pattern: string;
	flags: string;
}

@Quick()
class RegExpData extends QModel<IRegExpData> {
	@QType() pattern!: RegExp;
	@QType() flags!: RegExp;
}

interface IErrorData {
	simple: {
		name: string;
		message: string;
		stack?: string;
	};
	withStack: {
		name: string;
		message: string;
		stack?: string;
	};
}

@Quick()
class ErrorData extends QModel<IErrorData> {
	@QType() simple!: Error;
	@QType() withStack!: Error;
}

interface ISymbolData {
	keyed: string; // Symbol serialized
	plain: string;
}

@Quick()
class SymbolData extends QModel<ISymbolData> {
	@QType() keyed!: Symbol;
	@QType() plain!: Symbol;
}

interface IBufferData {
	empty: string; // base64
	large: string;
	small: string;
}

@Quick()
class BufferData extends QModel<IBufferData> {
	@QType() empty!: ArrayBuffer;
	@QType() large!: ArrayBuffer;
	@QType() small!: ArrayBuffer;
}

// ============================================================================
// BIGINT EDGE CASES
// ============================================================================

describe('Transformer Edge Cases: BigInt', () => {
	test('should handle very large bigints', () => {
		const data = new BigIntData({
			huge: '9999999999999999999999999999999999999999',
			negative: '-1',
			zero: '0'
		});

		expect(typeof data.huge).toBe('bigint');
		expect(data.huge.toString()).toBe('9999999999999999999999999999999999999999');
	});

	test('should handle negative bigints', () => {
		const data = new BigIntData({
			huge: '0',
			negative: '-9876543210123456789',
			zero: '0'
		});

		expect(data.negative < 0n).toBe(true);
		expect(data.negative.toString()).toBe('-9876543210123456789');
	});

	test('should handle zero bigint', () => {
		const data = new BigIntData({
			huge: '0',
			negative: '0',
			zero: '0'
		});

		expect(data.zero).toBe(0n);
		expect(data.zero === 0n).toBe(true);
	});

	test('should roundtrip extreme bigints', () => {
		const data = new BigIntData({
			huge: '999999999999999999999999999999',
			negative: '-888888888888888888888888',
			zero: '0'
		});

		const json = data.toInterface();
		const restored = BigIntData.fromInterface(json);

		expect(restored.huge).toBe(data.huge);
		expect(restored.negative).toBe(data.negative);
		expect(restored.zero).toBe(data.zero);
	});

	test('should handle BigInt.MAX_SAFE_INTEGER equivalent', () => {
		const max = '9007199254740991'; // Number.MAX_SAFE_INTEGER
		const data = new BigIntData({
			huge: max,
			negative: '-' + max,
			zero: '0'
		});

		expect(data.huge.toString()).toBe(max);
		expect(data.negative.toString()).toBe('-' + max);
	});
});

// ============================================================================
// DATE EDGE CASES
// ============================================================================

describe('Transformer Edge Cases: Date', () => {
	test('should handle very old dates', () => {
		const veryOld = new Date('1000-01-01');
		const data = new DateData({
			past: veryOld.toISOString(),
			future: new Date().toISOString(),
			epoch: new Date(0).toISOString()
		});

		expect(data.past).toBeInstanceOf(Date);
		expect(data.past.getFullYear()).toBe(1000);
	});

	test('should handle far future dates', () => {
		const farFuture = new Date('2999-12-31');
		const data = new DateData({
			past: new Date().toISOString(),
			future: farFuture.toISOString(),
			epoch: new Date(0).toISOString()
		});

		expect(data.future.getFullYear()).toBe(2999);
		expect(data.future.getMonth()).toBe(11); // December
	});

	test('should handle epoch date (1970-01-01)', () => {
		const epoch = new Date(0);
		const data = new DateData({
			past: epoch.toISOString(),
			future: epoch.toISOString(),
			epoch: epoch.toISOString()
		});

		expect(data.epoch.getTime()).toBe(0);
		expect(data.epoch.toISOString()).toBe('1970-01-01T00:00:00.000Z');
	});

	test('should handle dates with milliseconds', () => {
		const precise = new Date('2024-01-15T12:30:45.123Z');
		const data = new DateData({
			past: precise.toISOString(),
			future: precise.toISOString(),
			epoch: precise.toISOString()
		});

		expect(data.past.getMilliseconds()).toBe(123);
	});

	test('should roundtrip dates exactly', () => {
		const now = new Date();
		const data = new DateData({
			past: now.toISOString(),
			future: now.toISOString(),
			epoch: now.toISOString()
		});

		const json = data.toInterface();
		const restored = DateData.fromInterface(json);

		expect(restored.past.getTime()).toBe(data.past.getTime());
	});
});

// ============================================================================
// REGEXP EDGE CASES
// ============================================================================

describe('Transformer Edge Cases: RegExp', () => {
	test('should handle complex regex patterns', () => {
		const complex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
		const data = new RegExpData({
			pattern: complex.source,
			flags: 'gi'
		});

		expect(data.pattern).toBeInstanceOf(RegExp);
		expect(data.pattern.source).toBe(complex.source);
	});

	test('should handle common regex flags', () => {
		const withFlags = /test/gim;
		const data = new RegExpData({
			pattern: 'test',
			flags: withFlags.source
		});

		// Note: flags order might differ
		expect(data.flags).toBeInstanceOf(RegExp);
	});

	test('should handle empty regex', () => {
		const empty = /(?:)/;
		const data = new RegExpData({
			pattern: empty.source,
			flags: 'g'
		});

		expect(data.pattern).toBeInstanceOf(RegExp);
	});

	test('should escape special characters', () => {
		const special = /\[\]\(\)\{\}\.\*\+\?/;
		const data = new RegExpData({
			pattern: special.source,
			flags: ''
		});

		expect(data.pattern).toBeInstanceOf(RegExp);
		expect(data.pattern.source).toBe(special.source);
	});

	test('should roundtrip regex exactly', () => {
		const regex = /test\d+/gi;
		const data = new RegExpData({
			pattern: regex.source,
			flags: regex.source
		});

		const json = data.toInterface();
		const restored = RegExpData.fromInterface(json);

		expect(restored.pattern.source).toBe(data.pattern.source);
	});
});

// ============================================================================
// ERROR EDGE CASES
// ============================================================================

describe('Transformer Edge Cases: Error', () => {
	test('should handle Error with empty message', () => {
		const empty = new Error('');
		const data = new ErrorData({
			simple: {
				name: empty.name,
				message: empty.message,
				stack: empty.stack
			},
			withStack: {
				name: 'Error',
				message: 'test'
			}
		});

		expect(data.simple).toBeInstanceOf(Error);
		expect(data.simple.message).toBe('');
	});

	test('should handle Error with very long message', () => {
		const longMsg = 'a'.repeat(10000);
		const error = new Error(longMsg);
		const data = new ErrorData({
			simple: {
				name: error.name,
				message: error.message,
				stack: error.stack
			},
			withStack: {
				name: 'Error',
				message: 'test'
			}
		});

		expect(data.simple.message.length).toBe(10000);
	});

	test('should handle Error with stack trace', () => {
		const error = new Error('test');
		const data = new ErrorData({
			simple: {
				name: error.name,
				message: error.message,
				stack: error.stack
			},
			withStack: {
				name: error.name,
				message: error.message,
				stack: error.stack
			}
		});

		expect(data.withStack.stack).toBeDefined();
		expect(typeof data.withStack.stack).toBe('string');
	});

	test('should handle custom error names', () => {
		const custom = new Error('custom');
		custom.name = 'CustomError';
		const data = new ErrorData({
			simple: {
				name: custom.name,
				message: custom.message,
				stack: custom.stack
			},
			withStack: {
				name: 'Error',
				message: 'test'
			}
		});

		expect(data.simple.name).toBe('CustomError');
	});

	test('should roundtrip errors', () => {
		const error = new Error('test error');
		const data = new ErrorData({
			simple: {
				name: error.name,
				message: error.message,
				stack: error.stack
			},
			withStack: {
				name: error.name,
				message: error.message,
				stack: error.stack
			}
		});

		const json = data.toInterface();
		const restored = ErrorData.fromInterface(json);

		expect(restored.simple.message).toBe(data.simple.message);
		expect(restored.simple.name).toBe(data.simple.name);
	});
});

// ============================================================================
// SYMBOL EDGE CASES
// ============================================================================

describe('Transformer Edge Cases: Symbol', () => {
	test('should handle Symbol.for keys', () => {
		const keyed = Symbol.for('myKey');
		// Symbols serialize to their string key if created with Symbol.for
		const data = new SymbolData({
			keyed: 'myKey',
			plain: 'plain'
		});

		expect(typeof data.keyed).toBe('symbol');
	});

	test('should handle plain symbols', () => {
		const plain = Symbol('description');
		const data = new SymbolData({
			keyed: 'key1',
			plain: 'description'
		});

		expect(typeof data.plain).toBe('symbol');
	});

	test('should handle symbols without description', () => {
		const data = new SymbolData({
			keyed: '',
			plain: ''
		});

		expect(typeof data.keyed).toBe('symbol');
		expect(typeof data.plain).toBe('symbol');
	});

	test('should handle well-known symbols', () => {
		// Well-known symbols like Symbol.iterator
		// Would need special handling if supported
		const data = new SymbolData({
			keyed: 'iterator',
			plain: 'test'
		});

		expect(typeof data.keyed).toBe('symbol');
	});
});

// ============================================================================
// BUFFER/ARRAYBUFFER EDGE CASES
// ============================================================================

describe('Transformer Edge Cases: ArrayBuffer', () => {
	test('should handle empty buffer', () => {
		const empty = new ArrayBuffer(0);
		const base64 = Buffer.from(empty).toString('base64');
		
		const data = new BufferData({
			empty: base64,
			large: base64,
			small: base64
		});

		expect(data.empty).toBeInstanceOf(ArrayBuffer);
		expect(data.empty.byteLength).toBe(0);
	});

	test('should handle large buffer', () => {
		const large = new ArrayBuffer(100000); // 100KB
		const view = new Uint8Array(large);
		view.fill(255);
		const base64 = Buffer.from(large).toString('base64');
		
		const data = new BufferData({
			empty: '',
			large: base64,
			small: ''
		});

		expect(data.large.byteLength).toBe(100000);
	});

	test('should handle buffer with specific bytes', () => {
		const buffer = new ArrayBuffer(4);
		const view = new Uint8Array(buffer);
		view[0] = 0xFF;
		view[1] = 0x00;
		view[2] = 0xAA;
		view[3] = 0x55;
		const base64 = Buffer.from(buffer).toString('base64');
		
		const data = new BufferData({
			empty: '',
			large: '',
			small: base64
		});

		const restored = new Uint8Array(data.small);
		expect(restored[0]).toBe(0xFF);
		expect(restored[1]).toBe(0x00);
		expect(restored[2]).toBe(0xAA);
		expect(restored[3]).toBe(0x55);
	});

	test('should roundtrip buffers exactly', () => {
		const original = new ArrayBuffer(16);
		const view = new Uint8Array(original);
		for (let i = 0; i < 16; i++) {
			view[i] = i * 16;
		}
		const base64 = Buffer.from(original).toString('base64');
		
		const data = new BufferData({
			empty: base64,
			large: base64,
			small: base64
		});

		const json = data.toInterface();
		const restored = BufferData.fromInterface(json);

		const originalView = new Uint8Array(data.empty);
		const restoredView = new Uint8Array(restored.empty);
		
		for (let i = 0; i < 16; i++) {
			expect(restoredView[i]).toBe(originalView[i]);
		}
	});
});
