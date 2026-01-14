import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { QConfig } from '@/core/config/quick.config';
import { QModel } from '@/core/models/quick.model';
import { Quick } from '@/core/decorators/quick.decorator';
import { dateTransformer } from '@/transformers/date.transformer';

describe('Configuration: dateStrategy', () => {
	beforeEach(() => {
		QConfig.reset();
	});

	afterEach(() => {
		QConfig.reset();
	});

	test('should default to "iso" strategy', () => {
		class TestModel extends QModel<{ date: string | number | Date }> {
			declare date: Date;
		}

		Quick({ date: Date })(TestModel);

		const date = new Date('2024-01-01T12:00:00.000Z');
		const model = new TestModel({ date });

		const serialized = JSON.parse(model.toJSON());
		expect(serialized.date).toBe('2024-01-01T12:00:00.000Z');
	});

	test('should support "timestamp" strategy via decorator', () => {
		class TestModel extends QModel<{ date: string | number | Date }> {
			declare date: Date;
		}

		Quick({ date: Date }, { dateStrategy: 'timestamp' })(TestModel);

		const date = new Date('2024-01-01T12:00:00.000Z');
		const model = new TestModel({ date });

		const serialized = JSON.parse(model.toJSON());
		expect(serialized.date).toBe(1704110400000); // 2024-01-01T12:00:00.000Z in ms
		expect(typeof serialized.date).toBe('number');
	});

	test('should support "native" strategy via decorator', () => {
		class TestModel extends QModel<{ date: string | number | Date }> {
			declare date: Date;
		}

		Quick({ date: Date }, { dateStrategy: 'native' })(TestModel);

		const date = new Date('2024-01-01T12:00:00.000Z');
		const model = new TestModel({ date });

        // Native strategy means toJSON returns Date object? 
        // No, model.toJSON() calls serializeToJson() which stringifies.
        // If serialize() returns Date object, JSON.stringify(Date) -> ISO String.
        // So "native" strategy via toJSON() ends up being ISO string anyway but implicit.
        // But if I use QModel.serializer.serialize() directly, I get Date object.
        
        const serializedObject = (TestModel as any).serializer.serialize(model);
		expect(serializedObject.date).toBeInstanceOf(Date);
		expect(serializedObject.date.toISOString()).toBe('2024-01-01T12:00:00.000Z');
	});

	test('should support global configuration defaults', () => {
		QConfig.configure({
			defaults: {
				dateStrategy: 'timestamp',
			},
		});

		class TestModel extends QModel<{ date: string | number | Date }> {
			declare date: Date;
		}
		Quick({ date: Date })(TestModel);

		const date = new Date('2024-01-01T12:00:00.000Z');
		const model = new TestModel({ date });

		expect(JSON.parse(model.toJSON()).date).toBe(1704110400000);
	});

	test('should override global config with decorator config', () => {
		QConfig.configure({
			defaults: {
				dateStrategy: 'timestamp',
			},
		});

		class TestModel extends QModel<{ date: string | number | Date }> {
			declare date: Date;
		}
		// Decorator overrides global timestamp to iso
		Quick({ date: Date }, { dateStrategy: 'iso' })(TestModel);

		const date = new Date('2024-01-01T12:00:00.000Z');
		const model = new TestModel({ date });

		expect(JSON.parse(model.toJSON()).date).toBe('2024-01-01T12:00:00.000Z');
	});

	test('should handle nested dates correctly', () => {
		class Nested extends QModel<any> {
			declare when: Date;
		}
		Quick({ when: Date }, { dateStrategy: 'timestamp' })(Nested);

		class Root extends QModel<any> {
			declare nested: Nested;
			declare other: Date;
		}
		// root uses native, but nested uses timestamp
		Quick(
			{ nested: Nested, other: Date },
			{ dateStrategy: 'native' }
		)(Root);

		const date = new Date('2024-01-01T12:00:00.000Z');
		const model = new Root({
			nested: { when: date },
			other: date,
		});
		
        // Use direct serializer to check 'native' output
        const json = (Root as any).serializer.serialize(model);
		expect(json.nested.when).toBe(1704110400000); // from Nested config
		expect(json.other).toBeInstanceOf(Date); // from Root config
	});
});
