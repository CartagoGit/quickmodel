import { describe, it, expect } from 'bun:test';
import { BaseTransformer } from '../../../src/core/bases/base-transformer';

describe('BaseTransformer Coverage', () => {
	class ConcreteTransformer extends BaseTransformer<string, number> {
		deserialize(value: any, _propertyKey: string, _className: string) {
			return Number(value);
		}
		serialize(value: number) {
			return String(value);
		}
	}

	it('should be instantiable', () => {
		const transformer = new ConcreteTransformer();
		expect(transformer).toBeDefined();
		expect(transformer.deserialize('123', 'key', 'Class')).toBe(123);
	});
});
