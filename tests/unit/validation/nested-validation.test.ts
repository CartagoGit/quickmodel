import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QTransformerRegistry } from '@/core/registry/transformer.registry';

describe('Nested Model Validation', () => {
	class ValidatingTransformer {
		serialize(value: any) {
			return value;
		}
		deserialize(value: any) {
			return value;
		}
		checkIntegrity(value: any) {
			if (value === 'INVALID_VALUE')
				return { isValid: false, error: 'Value is invalid' };
			return { isValid: true };
		}
	}

	QTransformerRegistry.register(
		'ValidationType',
		new ValidatingTransformer()
	);

	@Quick({ status: 'ValidationType' })
	class Nested extends QModel<{ status: string }> {
		declare status: string;
	}

	@Quick({ nested: Nested })
	class Parent extends QModel<{ nested: any }> {
		declare nested: Nested;
	}

	test('should validate nested models recursively', () => {
		const parent = new Parent({
			nested: { status: 'INVALID_VALUE' },
		});

		// The nested model itself should be invalid
		expect(parent.nested.checkIntegrity().length).toBeGreaterThan(0);

		// The parent validation SHOULD trigger the nested validation and report it
		const parentErrors = parent.checkIntegrity();

		expect(parentErrors.length).toBeGreaterThan(0);
		expect(parentErrors[0]?.error).toContain('nested');
	});
});
