import { describe, it, expect } from 'bun:test';
import { ValueTransformerService } from '@/core/services/value-transformer.service';
import { TransformerLookupService } from '@/core/services/transformer-lookup.service';
import { QModel } from '@/index';

class MockRecursiveDeserializer {
	deserialize(data: any, modelClass: new (data: any) => any) {
		return new modelClass(data);
	}
}

describe('ValueTransformerService Gaps', () => {
	const lookup = new TransformerLookupService();
	const recursive = new MockRecursiveDeserializer();
	const service = new ValueTransformerService(lookup, recursive);

	// Mock Models
	class Base extends QModel<any> {
		declare type: string;
	}
	class ChildA extends Base {
		declare type: 'A';
	}
	class ChildB extends Base {
		declare type: 'B';
	}
	// Register primitives as transformers implicitly handled

	it('should handle nulls differently in primitive vs model arrays', () => {
		// Primitive Array: Preserves nulls
		const primArr = [1, null, 2];
		const resPrim = service.transformNestedArray(primArr, Number, {
			propertyKey: 'p',
			className: 'Test',
		});
		expect(resPrim).toEqual([1, null, 2]);

		// Model Array: NOW Preserves nulls too (Security Fix)
		const modelArr = [{ type: 'A' }, null, { type: 'B' }];
		const resModel = service.transformNestedModelArray(modelArr, [
			ChildA,
			ChildB,
		]);
		expect(resModel).toHaveLength(3);
		expect(resModel[0]).toBeInstanceOf(ChildA);
		expect(resModel[1]).toBeNull();
		expect(resModel[2]).toBeInstanceOf(ChildA); // Default to first type if no discriminator
	});

	it('should handle runtime error in discriminator function by THROWING (Security Fix)', () => {
		const arr = [{ type: 'B' }];
		const discriminator = () => {
			throw new Error('Boom');
		};

		// Should NOT fallback, should throw
		expect(() => {
			service.transformNestedModelArray(
				arr,
				[ChildA, ChildB],
				discriminator
			);
		}).toThrow('Boom');
	});

	it('should match case-insensitive string discriminators', () => {
		const arr = [{ type: 'childb' }, { type: 'CHILDA' }];

		// Need to mock name lookup or rely on classes having names
		// ChildA.name is 'ChildA'

		const res = service.transformNestedModelArray(
			arr,
			[ChildA, ChildB],
			'type' // Discriminator is field 'type'
		);

		expect(res[0]).toBeInstanceOf(ChildB);
		expect(res[1]).toBeInstanceOf(ChildA);
	});

	it('should handle recursive nested arrays', () => {
		// Number[][]
		const arr = [[1, 2], [3]];
		const res = service.transformNestedArray(arr, Number, {
			propertyKey: 'p',
			className: 'T',
		});

		expect(res).toEqual([[1, 2], [3]]);
	});
});
