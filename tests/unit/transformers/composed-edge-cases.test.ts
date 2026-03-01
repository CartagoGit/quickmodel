/**
 * Task #3: Composed Transformers Edge Cases
 *
 * Tests for complex edge cases with nested and composed transformers:
 * - Map<Symbol, Date>
 * - Set<Map<string, BigInt>>
 * - Array<Set<Date>>
 * - Map<string, Error[]>
 * - Null/undefined in nested collections
 * - Circular references in composed types
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Composed Transformers Edge Cases', () => {
	// ========================================================================
	// 1. MAP WITH SYMBOL KEYS AND DATE VALUES
	// ========================================================================

	describe('Map<Symbol, Date> - Symbol keys with Date values', () => {
		interface ITimeline {
			events: [string, string][]; // Backend: [[symbolKey, isoDate]]
		}

		@Quick({ events: Map })
		class Timeline extends QModel<ITimeline> {
			declare events: Map<symbol, Date>;
		}

		test('should transform Map with Symbol keys and Date values', () => {
			const model = new Timeline({
				events: [
					['global.event1', '2024-01-01T00:00:00.000Z'],
					['global.event2', '2024-12-31T23:59:59.999Z'],
				],
			});

			const key1 = Symbol.for('global.event1');
			const key2 = Symbol.for('global.event2');

			expect(model.events).toBeInstanceOf(Map);
			expect(model.events.size).toBe(2);
			expect(model.events.get(key1)).toBeInstanceOf(Date);
			expect(model.events.get(key2)).toBeInstanceOf(Date);
			expect(model.events.get(key1)?.toISOString()).toBe(
				'2024-01-01T00:00:00.000Z'
			);
		});

		test('should serialize Map<Symbol, Date> correctly', () => {
			const model = new Timeline({
				events: [['global.key1', '2024-06-15T12:00:00.000Z']],
			});

			const serialized = model.$qSerialize();
			expect(Array.isArray(serialized.events)).toBe(true);
			expect(serialized.events[0][0]).toBe('global.key1'); // Symbol serialized as string
			expect(serialized.events[0][1]).toMatch(/2024-06-15/); // Date serialized
		});
	});

	// ========================================================================
	// 2. THREE-LEVEL NESTING: SET<MAP<STRING, BIGINT>>
	// ========================================================================

	describe('Set<Map<string, BigInt>> - 3-level nested composition', () => {
		interface IDeep {
			data: [string, string][][]; // Array of arrays of tuples
		}

		@Quick({ data: [Set] })
		class DeepNested extends QModel<IDeep> {
			declare data: Set<Map<string, bigint>>[];
		}

		test('should handle 3-level nesting correctly', () => {
			const model = new DeepNested({
				data: [
					// First Set: contains 2 Maps
					[[['a', '123456789012345']], [['b', '987654321098765']]],
					// Second Set: contains 1 Map
					[[['c', '555555555555555']]],
				],
			});

			expect(model.data).toHaveLength(2);

			// First array element should be a Set
			const firstSet = model.data[0];
			expect(firstSet).toBeInstanceOf(Set);
			expect(firstSet.size).toBe(2);

			// Set should contain Maps
			const firstMap = Array.from(firstSet)[0];
			expect(firstMap).toBeInstanceOf(Map);

			// Map values should be BigInt
			expect(firstMap.get('a')).toBe(123456789012345n);
		});

		test('should serialize 3-level nested structure', () => {
			const model = new DeepNested({
				data: [[[['x', '999999999999999']]]],
			});

			const serialized = model.$qSerialize();
			expect(Array.isArray(serialized.data)).toBe(true); // Array<Set<Map>> → Array
			expect(Array.isArray(serialized.data[0])).toBe(true); // Set<Map> → Array

			// Map without Symbol keys serializes as object: { x: '999999999999999' }
			const firstMapSerialized = serialized.data[0][0];
			expect(typeof firstMapSerialized).toBe('object');
			expect(firstMapSerialized).toHaveProperty('x');
			expect((firstMapSerialized as any).x).toBe('999999999999999');
		});
	});

	// ========================================================================
	// 3. ARRAY OF SETS WITH DATES
	// ========================================================================

	describe('Array<Set<Date>> - Empty and populated sets', () => {
		interface ICalendars {
			calendars: string[][]; // Backend: array of arrays of ISO dates
		}

		@Quick({ calendars: [Set] })
		class Calendars extends QModel<ICalendars> {
			declare calendars: Set<Date>[];
		}

		test('should handle empty sets in array', () => {
			const model = new Calendars({
				calendars: [
					[],
					['2024-01-01', '2024-01-02'],
					[],
					['2024-12-25'],
				],
			});

			expect(model.calendars).toHaveLength(4);
			expect(model.calendars[0]).toBeInstanceOf(Set);
			expect(model.calendars[0].size).toBe(0);
			expect(model.calendars[1].size).toBe(2);
			expect(model.calendars[2].size).toBe(0);
			expect(model.calendars[3].size).toBe(1);
		});

		test('should transform dates in sets correctly', () => {
			const model = new Calendars({
				calendars: [
					['2024-01-01T00:00:00.000Z', '2024-06-15T12:30:45.123Z'],
				],
			});

			const firstSet = model.calendars[0];
			const dates = Array.from(firstSet);

			expect(dates[0]).toBeInstanceOf(Date);
			expect(dates[1]).toBeInstanceOf(Date);
			expect(dates[0].toISOString()).toBe('2024-01-01T00:00:00.000Z');
		});

		test('should serialize Array<Set<Date>> correctly', () => {
			const model = new Calendars({
				calendars: [['2024-01-01'], [], ['2024-12-31', '2024-06-15']],
			});

			const serialized = model.$qSerialize();
			expect(serialized.calendars).toHaveLength(3);
			expect(serialized.calendars[0]).toHaveLength(1);
			expect(serialized.calendars[1]).toHaveLength(0);
			expect(serialized.calendars[2]).toHaveLength(2);
		});
	});

	// ========================================================================
	// 4. MAP WITH ARRAY VALUES OF COMPLEX TYPES
	// ========================================================================

	describe('Map<string, Error[]> - Map with array of complex types', () => {
		interface IErrorLog {
			errors: [string, { name: string; message: string }[]][]; // Backend format
		}

		@Quick({ errors: Map })
		class ErrorLog extends QModel<IErrorLog> {
			declare errors: Map<string, Error[]>;
		}

		test('should handle Map with Error array values', () => {
			const model = new ErrorLog({
				errors: [
					[
						'validation',
						[
							{
								name: 'ValidationError',
								message: 'Invalid email',
							},
							{
								name: 'ValidationError',
								message: 'Required field missing',
							},
						],
					],
					['network', [{ name: 'NetworkError', message: 'Timeout' }]],
				],
			});

			expect(model.errors).toBeInstanceOf(Map);
			expect(model.errors.size).toBe(2);

			const validationErrors = model.errors.get('validation');
			expect(Array.isArray(validationErrors)).toBe(true);
			expect(validationErrors).toHaveLength(2);
			expect(validationErrors![0]).toBeInstanceOf(Error);
			expect(validationErrors![0].message).toBe('Invalid email');
		});

		test('should handle empty error arrays', () => {
			const model = new ErrorLog({
				errors: [
					['info', []],
					['warnings', []],
				],
			});

			expect(model.errors.get('info')).toEqual([]);
			expect(model.errors.get('warnings')).toEqual([]);
		});
	});

	// ========================================================================
	// 5. NULL/UNDEFINED IN NESTED COLLECTIONS
	// ========================================================================

	describe('Null/undefined handling in composed types', () => {
		interface INullable {
			optionalMap?: [string, string][];
			maybeSet?: string[];
		}

		@Quick({ optionalMap: Map, maybeSet: Set })
		class Nullable extends QModel<INullable> {
			declare optionalMap?: Map<string, Date>;
			declare maybeSet?: Set<number>;
		}

		test('should handle undefined nested collections', () => {
			const model = new Nullable({});

			expect(model.optionalMap).toBeUndefined();
			expect(model.maybeSet).toBeUndefined();
		});

		test('should handle null values in collections', () => {
			const model = new Nullable({
				optionalMap: null as any,
				maybeSet: null as any,
			});

			// Should handle null gracefully (not transform or throw)
			expect(model.optionalMap).toBeNull();
			expect(model.maybeSet).toBeNull();
		});
	});

	// ========================================================================
	// 6. DEEPLY NESTED ARRAYS WITH TRANSFORMERS
	// ========================================================================

	describe('Deeply nested arrays with transformers', () => {
		interface IMatrix {
			matrix3D: string[][][]; // 3D array of ISO dates
		}

		@Quick({ matrix3D: [[[Date]]] })
		class Matrix extends QModel<IMatrix> {
			declare matrix3D: Date[][][];
		}

		test('should handle 3D arrays with Date transformation', () => {
			const model = new Matrix({
				matrix3D: [
					[['2024-01-01', '2024-01-02'], ['2024-01-03']],
					[['2024-02-01', '2024-02-02', '2024-02-03']],
				],
			});

			expect(model.matrix3D).toHaveLength(2);
			expect(model.matrix3D[0][0][0]).toBeInstanceOf(Date);
			expect(model.matrix3D[0][1][0]).toBeInstanceOf(Date);
			expect(model.matrix3D[1][0][2]).toBeInstanceOf(Date);
			expect(model.matrix3D[0][0][0].toISOString()).toContain(
				'2024-01-01'
			);
		});

		test('should serialize 3D Date array correctly', () => {
			const model = new Matrix({
				matrix3D: [[['2024-01-01T00:00:00.000Z']]],
			});

			const serialized = model.$qSerialize();
			expect(serialized.matrix3D[0][0][0]).toMatch(/2024-01-01/);
		});
	});

	// ========================================================================
	// 7. MIXED COMPOSED TYPES IN SINGLE MODEL
	// ========================================================================

	describe('Multiple composed types in one model', () => {
		interface IComplex {
			dateMap: [string, string][]; // Map<string, Date>
			bigintSets: string[][]; // Set<BigInt>[]
			errorArrays: { name: string; message: string }[][]; // Error[][]
		}

		@Quick({
			dateMap: Map,
			bigintSets: [Set],
			errorArrays: [[Error]],
		})
		class ComplexComposed extends QModel<IComplex> {
			declare dateMap: Map<string, Date>;
			declare bigintSets: Set<bigint>[];
			declare errorArrays: Error[][];
		}

		test('should handle multiple composed types simultaneously', () => {
			const model = new ComplexComposed({
				dateMap: [
					['start', '2024-01-01'],
					['end', '2024-12-31'],
				],
				bigintSets: [
					['111111111111111', '222222222222222'],
					['333333333333333'],
				],
				errorArrays: [
					[{ name: 'Error1', message: 'Msg1' }],
					[
						{ name: 'Error2', message: 'Msg2' },
						{ name: 'Error3', message: 'Msg3' },
					],
				],
			});

			// Verify dateMap
			expect(model.dateMap.get('start')).toBeInstanceOf(Date);

			// Verify bigintSets
			expect(model.bigintSets[0]).toBeInstanceOf(Set);
			expect(Array.from(model.bigintSets[0])[0]).toBe(111111111111111n);

			// Verify errorArrays
			expect(model.errorArrays[1][1]).toBeInstanceOf(Error);
			expect(model.errorArrays[1][1].message).toBe('Msg3');
		});
	});

	// ========================================================================
	// 8. EDGE CASE: CIRCULAR REFERENCES IN COMPOSED TYPES
	// ========================================================================

	describe('Circular references in composed types', () => {
		interface ICircularMap {
			data: [string, any][];
		}

		@Quick({ data: Map })
		class CircularMap extends QModel<ICircularMap> {
			declare data: Map<string, any>;
		}

		test('should detect circular reference in Map values', () => {
			const circular: any = { self: null };
			circular.self = circular;

			const model = new CircularMap({
				data: [
					['safe', { value: 42 }],
					['circular', circular],
				],
			});

			// Should serialize without throwing
			expect(() => model.$qSerialize()).not.toThrow();
		});
	});
});
