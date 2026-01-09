/**
 * Example demonstrating type inference for discriminators in @Quick() decorator
 *
 * This example shows how TypeScript now properly infers:
 * 1. Keys from the typeMap
 * 2. Constructor types for discriminator functions
 */

import { Quick } from '../src/core/decorators/quick.decorator';
import { QModel } from '../src/core/models/quick.model';

// Example 1: Simple discriminator with inferred keys
interface IContent {
	type: 'content';
	text: string;
}

interface IMetadata {
	type: 'metadata';
	tags: string[];
}

class Content extends QModel<IContent> {
	declare type: 'content';
	declare text: string;
}

class Metadata extends QModel<IMetadata> {
	declare type: 'metadata';
	declare tags: string[];
}

@Quick(
	{
		items: [Content, Metadata],
	},
	{
		discriminators: {
			// ✅ TypeScript knows 'items' is a valid key from the typeMap
			// ✅ TypeScript knows the function must return Content | Metadata
			items: (data) => {
				if (data.type === 'content') return Content;
				if (data.type === 'metadata') return Metadata;
				return Content; // Fallback must also be one of the declared types
			},
		},
	}
)
class Data extends QModel<{ items: (Content | Metadata)[] }> {
	declare items: (Content | Metadata)[];
}

// Example 2: Multiple discriminators with different types
@Quick(
	{
		items: [Content, Metadata],
		transforms: [Date, BigInt],
	},
	{
		discriminators: {
			// ✅ Both keys are inferred from typeMap
			items: 'type', // Simple string discriminator

			// ✅ Function knows it can return Date | BigInt
			transforms: (data) => {
				if (
					typeof data === 'string' &&
					/^\d{4}-\d{2}-\d{2}/.test(data)
				) {
					return Date;
				}
				if (typeof data === 'string' && /^\d+$/.test(data)) {
					return BigInt;
				}
				return Date; // ✅ Fallback must be Date or BigInt
			},
		},
	}
)
class ComplexData extends QModel<{
	items: (Content | Metadata)[];
	transforms: (Date | bigint)[];
}> {
	declare items: (Content | Metadata)[];
	declare transforms: (Date | bigint)[];
}

// Example 3: TypeScript will error if you use wrong keys or return wrong types
@Quick(
	{
		items: [Content, Metadata],
	},
	{
		discriminators: {
			// ❌ TypeScript error: 'wrongKey' is not a key in typeMap
			// wrongKey: 'type',
			// ❌ TypeScript error: function returns wrong type
			// items: (data) => {
			//   return Date; // Error: Date is not Content | Metadata
			// },
		},
	}
)
class StrictData extends QModel<{ items: (Content | Metadata)[] }> {
	declare items: (Content | Metadata)[];
}

console.log('Type inference examples compiled successfully!');
