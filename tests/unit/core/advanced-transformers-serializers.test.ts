import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Advanced Options: Custom Transformers & Serializers', () => {
	test('should handle bidirectional timestamp <-> Date conversion', () => {
		interface IEvent {
			id: number;
			timestamp: number;
		}

		@Quick(
			{
				timestamp: Date, // We declare it as Date for runtime
			},
			{
				transformers: {
					// Deserialize: number -> Date
					timestamp: (val: any) => new Date(val * 1000),
				},
				serializers: {
					// Serialize: Date -> number
					timestamp: (val: any) => {
						if (val instanceof Date) {
							return Math.floor(val.getTime() / 1000);
						}
						return 0;
					},
				},
			},
			{ unknownPropertyPolicy: 'keep' }
		)
		class Event extends QModel<IEvent> {
			declare id: number;
			declare timestamp: Date;
		}

		// 1. Check Deserialization
		const inputTime = 1704067200; // 2024-01-01T00:00:00.000Z
		const event = new Event({ id: 1, timestamp: inputTime });

		expect(event.timestamp).toBeInstanceOf(Date);
		expect(event.timestamp.toISOString()).toBe('2024-01-01T00:00:00.000Z');

		// 2. Check toInterface (Serialization back to original format)
		const output = event.$qToInterface();
		expect(output.timestamp).toBeTypeOf('number');
		expect(output.timestamp).toBe(inputTime);

		// 3. Verify standard primitive properties are unaffected
		expect(output.id).toBe(1);
	});

	test('should allow one-way transformation (deserializer only)', () => {
		interface IUser {
			email: string;
		}

		@Quick(
			{
				email: String,
			},
			{
				transformers: {
					// Force uppercase on input
					email: (val: any) => String(val).toUpperCase(),
				},
			},
			{ unknownPropertyPolicy: 'keep' }
		)
		class User extends QModel<IUser> {
			declare email: string;
		}

		const user = new User({ email: 'test@example.com' });
		expect(user.email).toBe('TEST@EXAMPLE.COM');

		// toInterface should return the current value because no serializer is defined,
		// and the standard string behavior preserves the value.
		expect(user.$qToInterface().email).toBe('TEST@EXAMPLE.COM');
	});

	test('should allow one-way serialization (serializer only)', () => {
		interface IFormat {
			code: string;
		}

		@Quick(
			{
				code: String,
			},
			{
				serializers: {
					// Add prefix on output only
					code: (val: any) => `PREFIX_${val}`,
				},
			},
			{ unknownPropertyPolicy: 'keep' }
		)
		class Format extends QModel<IFormat> {
			declare code: string;
		}

		// Input is normal (no transformer)
		const item = new Format({ code: '123' });
		expect(item.code).toBe('123');

		// Output is transformed (custom serializer)
		const output = item.$qToInterface();
		expect(output.code).toBe('PREFIX_123');
	});

	test('should work with inline transformers (legacy syntax) + custom serializers', () => {
		interface ITime {
			stamp: number;
		}

		@Quick(
			{
				// Inline transformer (Old way: number -> Date)
				stamp: (val: any) => new Date(val * 1000),
			},
			{
				// Serializer (New way: Date -> number)
				serializers: {
					stamp: (val: any) =>
						val instanceof Date ? val.getTime() / 1000 : 0,
				},
			},
			{ unknownPropertyPolicy: 'keep' }
		)
		class TimeModel extends QModel<ITime> {
			declare stamp: Date;
		}

		// 1. Deserialization (Inline transformer)
		const time = new TimeModel({ stamp: 1000 });
		expect(time.stamp).toBeInstanceOf(Date);
		expect(time.stamp.toISOString()).toBe(new Date(1000000).toISOString());

		// 2. Serialization (Option serializer)
		const output = time.$qToInterface();
		expect(output.stamp).toBe(1000);
	});

	test('should support custom mockers to generate data designed for transformers', () => {
		interface IProduct {
			sku: string;
		}

		@Quick(
			{
				// Transformer makes sku consistent
				sku: (val: any) => `ITEM-${val}`,
			},
			{
				mockers: {
					// Mocker generates the raw ID
					sku: () => '1234',
				},
			},
			{ unknownPropertyPolicy: 'keep' }
		)
		class Product extends QModel<IProduct> {
			declare sku: string;
		}

		// 1. Generate Mock
		const mockInstance = Product.mock().random();

		// The mock should be 'ITEM-1234' because:
		// 1. Mocker returns '1234'
		// 2. new Product({ sku: '1234' }) is called
		// 3. Transformer runs: 'ITEM-1234'
		expect(mockInstance.sku).toBe('ITEM-1234');
	});

	test('custom transformer should take precedence over known types (Date)', () => {
		interface ILog {
			date: string;
		}

		@Quick(
			{
				date: Date,
			},
			{
				transformers: {
					// Return a string instead of a Date object, defying the @Quick type
					date: (val: any) => `Date: ${val}`,
				},
			},
			{ unknownPropertyPolicy: 'keep' }
		)
		class Log extends QModel<ILog> {
			declare date: any; // Using any because we broke the contract intentionally
		}

		const log = new Log({ date: '2024-01-01' });
		expect(log.date).toBe('Date: 2024-01-01');
		expect(log.date).not.toBeInstanceOf(Date);
	});

	test('custom serializer should override default preservation logic', () => {
		interface IData {
			value: number;
		}

		@Quick(
			{
				value: Number,
			},
			{
				serializers: {
					// Always return 999 regardless of actual value
					value: () => 999,
				},
			},
			{ unknownPropertyPolicy: 'keep' }
		)
		class Data extends QModel<IData> {
			declare value: number;
		}

		const data = new Data({ value: 100 });
		const raw = data.$qToInterface();

		expect(data.value).toBe(100); // Model has correct value
		expect(raw.value).toBe(999); // Serializer overrode the output
	});

	test('should handle validation/transformation flow with strict mode', () => {
		interface IConfig {
			key: string;
		}

		@Quick(
			{
				key: String,
			},
			{
				unknownPropertyPolicy: 'error',
				transformers: {
					key: (val: any) => `${val}_processed`,
				},
			}
		)
		class Config extends QModel<IConfig> {
			declare key: string;
		}

		const config = new Config({ key: 'test' });
		expect(config.key).toBe('test_processed');

		// Strict mode check for extra properties shouldn't interfere
		expect(() => new Config({ key: 'test', extra: 1 } as any)).toThrow();
	});

	test('should work with undefined values correctly', () => {
		interface IOptional {
			val?: number;
		}

		// Counter to ensure transformer is NOT called for undefined
		let transformerCalled = false;

		@Quick(
			{
				val: Number,
			},
			{
				transformers: {
					val: (val) => {
						transformerCalled = true;
						return val;
					},
				},
			},
			{ unknownPropertyPolicy: 'keep' }
		)
		class Optional extends QModel<IOptional> {
			declare val?: number;
		}

		const opt = new Optional({});
		expect(opt.val).toBeUndefined();
		expect(transformerCalled).toBe(false); // Should be false because deserializer skips undefined before transformers
	});
});
