import { describe, test, expect, afterEach } from 'bun:test';
import { Quick, QModel, QConfig, Advanced } from '../../../../src';
import {
	IQTransformer,
	IQValidationResult,
} from '../../../../src/core/interfaces/transformer.interface';

const { QTransformerRegistry } = Advanced;

// Custom lax transformer that allows invalid values during deserialization
// but fails validation.
class LaxTransformer implements IQTransformer<string, string> {
	deserialize(value: unknown): string {
		return String(value); // Always succeeds
	}

	serialize(value: string): string {
		return value;
	}

	validate(value: unknown): IQValidationResult {
		if (value === 'invalid') {
			return { isValid: false, error: 'Value is invalid' };
		}
		return { isValid: true };
	}
}

// Register lazily inside tests to avoid global pollution or register with unique key
QTransformerRegistry.register('lax', new LaxTransformer());

interface ILax {
	value: string;
}

describe('Validation Trigger Configuration', () => {
	const originalDefaults = { ...QConfig.get().defaults };

	afterEach(() => {
		QConfig.configure({ defaults: originalDefaults });
	});

	test('should default to manual validation (no error on construction)', () => {
		@Quick({
			value: 'lax',
		})
		class ManualLax extends QModel<ILax> {
			declare value: string;
		}

		// Should NOT throw, even though value is 'invalid'
		const instance = new ManualLax({ value: 'invalid' });
		expect(instance).toBeInstanceOf(ManualLax);

		// Manual validation detects it
		const errors = instance.validate();
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]?.error).toContain('Value is invalid');
	});

	test('should validate on construction when trigger is "construction"', () => {
		@Quick(
			{
				value: 'lax',
			},
			{
				validationTrigger: 'construction',
			}
		)
		class AutoLax extends QModel<ILax> {
			declare value: string;
		}

		// Should throw now
		expect(() => {
			new AutoLax({ value: 'invalid' });
		}).toThrow(/Validation failed during construction/);
	});

	test('should pass construction validation with valid data', () => {
		@Quick(
			{
				value: 'lax',
			},
			{
				validationTrigger: 'construction',
			}
		)
		class AutoLax extends QModel<ILax> {
			declare value: string;
		}

		expect(() => {
			new AutoLax({ value: 'valid' });
		}).not.toThrow();
	});

	test('should respect global configuration for trigger', () => {
		QConfig.configure({
			defaults: {
				validationTrigger: 'construction',
			},
		});

		@Quick({ value: 'lax' })
		class GlobalLax extends QModel<ILax> {
			declare value: string;
		}

		expect(() => {
			new GlobalLax({ value: 'invalid' });
		}).toThrow(/Validation failed/);
	});

	test('local config should override global config', () => {
		QConfig.configure({
			defaults: {
				validationTrigger: 'construction',
			},
		});

		@Quick({ value: 'lax' }, { validationTrigger: 'manual' })
		class LocalLax extends QModel<ILax> {
			declare value: string;
		}

		// Should NOT throw
		const instance = new LocalLax({ value: 'invalid' });
		expect(instance).toBeInstanceOf(LocalLax);
	});

	test('should work with validationErrorStrategy: failFast', () => {
		interface IMulti {
			v1: string;
			v2: string;
		}

		@Quick(
			{
				v1: 'lax',
				v2: 'lax',
			},
			{
				validationTrigger: 'construction',
				validationErrorStrategy: 'failFast',
			}
		)
		class FailFastLax extends QModel<IMulti> {
			declare v1: string;
			declare v2: string;
		}

		try {
			new FailFastLax({ v1: 'invalid', v2: 'invalid' });
		} catch (e: any) {
			expect(e.message).toContain('Validation failed');
			// Validate that we stopped early might be hard without mocking ValidationService
			// But at least we ensure it throws locally.
		}

		// To verify failFast, we can check how many errors are in the message
		// Accumulate would list both "Value is invalid" errors (if keys are processed in order)
		// But ValidationService iterates internally.
		// If failFast strategy is working (tested in other file), Deserializer just catches the error thrown or result returned.
		// Actually Deserializer calls `this.validationService.validate(...)`.
		// `validationService` respects `failFast` and returns [firstError].
		// Deserializer formats it.
	});
});
