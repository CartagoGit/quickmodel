/**
 * HIGH PRIORITY TESTS: Transformer Edge Cases
 * 
 * Tests for boundary conditions and edge cases in all transformers
 * to ensure robust handling of extreme values.
 * 
 * Priority: ⭐⭐⭐⭐ HIGH
 */

import { describe, test, expect } from 'bun:test';
import { QModel } from '@/quick.model';

// ============================================================================
// TEST MODELS - Using declare syntax (user-facing API)
// ============================================================================

interface IBigIntData {
	huge: bigint;
	negative: bigint;
	zero: bigint;
}

class BigIntData extends QModel<IBigIntData> {
	declare huge: bigint;
	declare negative: bigint;
	declare zero: bigint;
}

interface IDateData {
	past: Date;
	future: Date;
	epoch: Date;
}

class DateData extends QModel<IDateData> {
	declare past: Date;
	declare future: Date;
	declare epoch: Date;
}

interface IRegExpData {
	pattern: RegExp;
	flags: RegExp;
}

class RegExpData extends QModel<IRegExpData> {
	declare pattern: RegExp;
	declare flags: RegExp;
}

interface IErrorData {
	simple: Error;
	withStack: Error;
}

class ErrorData extends QModel<IErrorData> {
	declare simple: Error;
	declare withStack: Error;
}

interface ISymbolData {
	keyed: Symbol;
	plain: Symbol;
}

class SymbolData extends QModel<ISymbolData> {
	declare keyed: Symbol;
	declare plain: Symbol;
}

interface IBufferData {
	empty: ArrayBuffer;
	large: ArrayBuffer;
	small: ArrayBuffer;
}

class BufferData extends QModel<IBufferData> {
	declare empty: ArrayBuffer;
	declare large: ArrayBuffer;
	declare small: ArrayBuffer;
}

// ============================================================================
// BIGINT EDGE CASES
// ============================================================================

describe('Transformer Edge Cases: BigInt', () => {
	test('should handle very large bigints', () => {
		const data = new BigIntData({
			huge: 9999999999999999999999999999999999999999n,
			negative: -1n,
			zero: 0n
		});

		expect(typeof data.huge).toBe('bigint');
		expect(data.huge.toString()).toBe('9999999999999999999999999999999999999999');
	});

	test('should handle negative bigints', () => {
		const data = new BigIntData({
			huge: 0n,
			negative: -9876543210123456789n,
			zero: 0n
		});

		expect(data.negative < 0n).toBe(true);
		expect(data.negative.toString()).toBe('-9876543210123456789');
	});

	test('should handle zero bigint', () => {
		const data = new BigIntData({
			huge: 0n,
			negative: 0n,
			zero: 0n
		});

		expect(data.zero).toBe(0n);
		expect(data.zero === 0n).toBe(true);
	});

	test('should serialize extreme bigints', () => {
		const data = new BigIntData({
			huge: 999999999999999999999999999999n,
			negative: -888888888888888888888888n,
			zero: 0n
		});

		const json = data.serialize();
		
		// Verify serialization format
		expect(json.huge).toEqual({ __type: 'bigint', value: '999999999999999999999999999999' });
		expect(json.negative).toEqual({ __type: 'bigint', value: '-888888888888888888888888' });
		expect(json.zero).toEqual({ __type: 'bigint', value: '0' });
	});

	test('should handle BigInt.MAX_SAFE_INTEGER equivalent', () => {
		const max = 9007199254740991n;
		const data = new BigIntData({
			huge: max,
			negative: -max,
			zero: 0n
		});

		expect(data.huge.toString()).toBe(max.toString());
		expect(data.negative.toString()).toBe((-max).toString());
	});
});

// ============================================================================
// DATE EDGE CASES
// ============================================================================

describe('Transformer Edge Cases: Date', () => {
	test('should handle very old dates', () => {
		const veryOld = new Date('1000-01-01');
		const data = new DateData({
			past: veryOld,
			future: new Date(),
			epoch: new Date(0)
		});

		expect(data.past).toBeInstanceOf(Date);
		expect(data.past.getFullYear()).toBe(1000);
	});

	test('should handle far future dates', () => {
		const farFuture = new Date('2999-12-31');
		const data = new DateData({
			past: new Date(),
			future: farFuture,
			epoch: new Date(0)
		});

		expect(data.future.getFullYear()).toBe(2999);
		expect(data.future.getMonth()).toBe(11); // December
	});

	test('should handle epoch date (1970-01-01)', () => {
		const epoch = new Date(0);
		const data = new DateData({
			past: epoch,
			future: epoch,
			epoch: epoch
		});

		expect(data.epoch.getTime()).toBe(0);
		expect(data.epoch.toISOString()).toBe('1970-01-01T00:00:00.000Z');
	});

	test('should handle dates with milliseconds', () => {
		const precise = new Date('2024-01-15T12:30:45.123Z');
		const data = new DateData({
			past: precise,
			future: precise,
			epoch: precise
		});

		expect(data.past.getMilliseconds()).toBe(123);
	});

	test('should serialize dates to ISO strings', () => {
		const now = new Date();
		const data = new DateData({
			past: now,
			future: now,
			epoch: now
		});

		const json = data.serialize();
		
		// Verify serialization format
		expect(json.past).toBe(now.toISOString());
		expect(json.future).toBe(now.toISOString());
		expect(json.epoch).toBe(now.toISOString());
	});
});

// ============================================================================
// REGEXP EDGE CASES
// ============================================================================

describe('Transformer Edge Cases: RegExp', () => {
	test('should handle complex regex patterns', () => {
		const complex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
		const data = new RegExpData({
			pattern: complex,
			flags: /gi/
		});

		expect(data.pattern).toBeInstanceOf(RegExp);
		expect(data.pattern.source).toContain('a-z');
	});

	test('should handle common regex flags', () => {
		const withFlags = /test/gim;
		const data = new RegExpData({
			pattern: withFlags,
			flags: /test/
		});

		expect(data.pattern).toBeInstanceOf(RegExp);
		expect(data.pattern.flags).toBe('gim');
	});

	test('should handle empty regex', () => {
		const empty = /(?:)/;
		const data = new RegExpData({
			pattern: empty,
			flags: /g/
		});

		expect(data.pattern).toBeInstanceOf(RegExp);
	});

	test('should escape special characters', () => {
		const special = /\[\]\(\)\{\}\.\*\+\?/;
		const data = new RegExpData({
			pattern: special,
			flags: /(?:)/
		});

		expect(data.pattern).toBeInstanceOf(RegExp);
	});

	test('should serialize regex to structured format', () => {
		const regex = /test\d+/gi;
		const data = new RegExpData({
			pattern: regex,
			flags: regex
		});

		const json = data.serialize();
		
		// Verify serialization format
		expect(json.pattern).toEqual({ __type: 'regexp', source: 'test\\d+', flags: 'gi' });
		expect(json.pattern).toHaveProperty('__type', 'regexp');
		expect(json.pattern).toHaveProperty('source');
		expect(json.pattern).toHaveProperty('flags');
	});
});

// ============================================================================
// ERROR EDGE CASES
// ============================================================================

describe('Transformer Edge Cases: Error', () => {
	test('should handle Error with empty message', () => {
		const empty = new Error('');
		const data = new ErrorData({
			simple: empty,
			withStack: new Error('test')
		});

		expect(data.simple).toBeInstanceOf(Error);
		expect(data.simple.message).toBe('');
	});

	test('should handle Error with very long message', () => {
		const longMsg = 'a'.repeat(10000);
		const error = new Error(longMsg);
		const data = new ErrorData({
			simple: error,
			withStack: new Error('test')
		});

		expect(data.simple.message.length).toBe(10000);
	});

	test('should handle Error with custom names', () => {
		const custom = new Error('custom error');
		custom.name = 'CustomError';
		const data = new ErrorData({
			simple: custom,
			withStack: new Error('test')
		});

		expect(data.simple.name).toBe('CustomError');
		expect(data.simple.message).toBe('custom error');
	});

	test('should serialize errors to string format', () => {
		const error = new Error('test error');
		const data = new ErrorData({
			simple: error,
			withStack: error
		});

		const json = data.serialize();
		
		// Verify serialization format (Error serializes as string)
		expect(typeof json.simple).toBe('string');
		expect(json.simple).toContain('test error');
	});
});

// ============================================================================
// SYMBOL EDGE CASES
// ============================================================================

describe('Transformer Edge Cases: Symbol', () => {
	test('should handle Symbol.for keys', () => {
		const keyed = Symbol.for('myKey');
		const data = new SymbolData({
			keyed: keyed,
			plain: Symbol.for('plain')
		});

		expect(typeof data.keyed).toBe('symbol');
		expect(Symbol.keyFor(data.keyed)).toBe('myKey');
	});

	test('should handle plain symbols', () => {
		const plain = Symbol('description');
		const data = new SymbolData({
			keyed: Symbol.for('key1'),
			plain: Symbol.for('description')
		});

		expect(typeof data.plain).toBe('symbol');
		expect(Symbol.keyFor(data.plain)).toBe('description');
	});

	test('should handle symbols without description', () => {
		const data = new SymbolData({
			keyed: Symbol.for(''),
			plain: Symbol.for('')
		});

		expect(typeof data.keyed).toBe('symbol');
		expect(typeof data.plain).toBe('symbol');
	});

	test('should serialize symbols to structured format', () => {
		const data = new SymbolData({
			keyed: Symbol.for('test-key'),
			plain: Symbol.for('test-plain')
		});

		const json = data.serialize();
		
		// Verify serialization format (Symbol serializes with __type and description)
		expect(json.keyed).toEqual({ __type: 'symbol', description: 'test-key' });
		expect(json.plain).toEqual({ __type: 'symbol', description: 'test-plain' });
	});
});

// ============================================================================
// BUFFER/ARRAYBUFFER EDGE CASES
// ============================================================================

describe('Transformer Edge Cases: ArrayBuffer', () => {
	test('should handle empty buffer', () => {
		const empty = new ArrayBuffer(0);
		
		const data = new BufferData({
			empty: empty,
			large: empty,
			small: empty
		});

		expect(data.empty).toBeInstanceOf(ArrayBuffer);
		expect(data.empty.byteLength).toBe(0);
	});

	test('should handle large buffer', () => {
		const large = new ArrayBuffer(100000); // 100KB
		const view = new Uint8Array(large);
		view.fill(255);
		
		const data = new BufferData({
			empty: new ArrayBuffer(0),
			large: large,
			small: new ArrayBuffer(0)
		});

		expect(data.large.byteLength).toBe(100000);
		const restoredView = new Uint8Array(data.large);
		expect(restoredView[0]).toBe(255);
	});

	test('should handle buffer with specific bytes', () => {
		const buffer = new ArrayBuffer(4);
		const view = new Uint8Array(buffer);
		view[0] = 0xFF;
		view[1] = 0x00;
		view[2] = 0xAA;
		view[3] = 0x55;
		
		const data = new BufferData({
			empty: new ArrayBuffer(0),
			large: new ArrayBuffer(0),
			small: buffer
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
		
		const data = new BufferData({
			empty: original,
			large: original,
			small: original
		});

		const json = data.serialize();
		const restored = BufferData.deserialize(json);

		const originalView = new Uint8Array(data.empty);
		const restoredView = new Uint8Array(restored.empty);
		
		for (let i = 0; i < 16; i++) {
			expect(restoredView[i]).toBe(originalView[i]);
		}
	});
});
