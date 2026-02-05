import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QTransformerRegistry } from '@/core/registry/transformer.registry';

describe('Nested Model Validation', () => {
	class ValidatingTransformer {
		serialize(v: any) {
			return v;
		}
		deserialize(v: any) {
			return v;
		}
		validate(v: any) {
			if (v === 'INVALID_VALUE')
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
		expect(parent.nested.validate().length).toBeGreaterThan(0);

		// The parent validation SHOULD trigger the nested validation and report it
		const parentErrors = parent.validate();

		console.log('Parent Errors:', parentErrors);

		expect(parentErrors.length).toBeGreaterThan(0);
		expect(parentErrors[0]?.error).toContain('nested');
	});
});
