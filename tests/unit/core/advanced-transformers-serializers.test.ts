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
			}
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
		const output = event.toInterface();
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
			}
		)
		class User extends QModel<IUser> {
			declare email: string;
		}

		const user = new User({ email: 'test@example.com' });
		expect(user.email).toBe('TEST@EXAMPLE.COM');

		// toInterface should return the current value because no serializer is defined,
		// and the standard string behavior preserves the value.
		expect(user.toInterface().email).toBe('TEST@EXAMPLE.COM');
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
			}
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
			}
		)
		class Data extends QModel<IData> {
			declare value: number;
		}

		const data = new Data({ value: 100 });
		const raw = data.toInterface();

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
				strict: true,
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
					val: (v) => {
						transformerCalled = true;
						return v;
					},
				},
			}
		)
		class Optional extends QModel<IOptional> {
			declare val?: number;
		}

		const opt = new Optional({});
		expect(opt.val).toBeUndefined();
		expect(transformerCalled).toBe(false); // Should be false because deserializer skips undefined before transformers
	});
});
