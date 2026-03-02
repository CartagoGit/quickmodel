import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import type { IQTransformer } from '@/core/interfaces/transformer.interface';

describe('Robustness: Custom Transformer Objects in TypeMap', () => {
	// Simulate a custom transformer object (not a class/constructor)
	const ReverseStringTransformer: IQTransformer<string, string> = {
		deserialize(value: string | null | undefined): string | null {
			if (!value) return null;
			return value.split('').reverse().join('');
		},
		serialize(value: string): string {
			return value.split('').reverse().join('');
		},
	};

	// Can we pass this directly to @Quick?
	// @Quick type map expects Constructor or String/Symbol
	// It's defined as `spec: IQuickPropertySpec<any>` which is `TConstructor | [TConstructor] | ...`

	// TypeScript might complain if the types don't match IQConstructor.
	// Let's see if it works at runtime first.

	interface ISecret {
		secret: string;
	}

	test('should allow passing transformer object in TypeMap (Runtime Check)', () => {
		// We use @ts-ignore because the type definition might not support it yet
		@Quick({
			secret: ReverseStringTransformer,
		} as any)
		class SecretModel extends QModel<ISecret> {
			declare secret: string;
		}

		const model = new SecretModel({ secret: 'dlrow olleh' });

		// If it works, it should be deserialized (reversed)
		// If it fails/ignores, it will be 'dlrow olleh'

		// EXPECTATION: Currently likely fails or ignores because Deserializer expects a Constructor
		// or a registered string key.

		// "dlrow olleh" reversed -> "hello world"
		expect(model.secret).toBe('hello world'); // Assert what we WANT

		// Test Serialization
		// If it works, $qSerialize() should use ReverseStringTransformer.serialize()
		// 'hello world' -> 'dlrow olleh'
		// Note: toJSON() returns a plain object, access property directly
		const json = model.toJSON();

		expect(json.secret).toBe('dlrow olleh');
	});
});
