import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import 'reflect-metadata';

describe('Debug: Metadata for arrays inside nested models', () => {
	interface IPost {
		id: number;
		dates: string[]; // Should be Date[]
	}

	@Quick({ dates: Date })
	class Post extends QModel<IPost> {
		declare id: number;
		declare dates: Date[];
	}

	test('Check metadata for Post.dates', () => {
		const postInstance = new Post({ id: 1, dates: [] });

		const designType = Reflect.getMetadata('design:type', postInstance, 'dates');
		const arrayElementClass = Reflect.getMetadata('arrayElementClass', postInstance, 'dates');

		console.log('Post.dates metadata:');
		console.log('  design:type:', designType?.name);
		console.log('  arrayElementClass:', arrayElementClass?.name);

		expect(designType).toBe(Array);
		expect(arrayElementClass).toBe(Date);
	});

	interface IMetrics {
		values: string[]; // Should be BigInt[]
	}

	@Quick({ values: BigInt })
	class Metrics extends QModel<IMetrics> {
		declare values: bigint[];
	}

	test('Check metadata for Metrics.values', () => {
		const metricsInstance = new Metrics({ values: [] });

		const designType = Reflect.getMetadata('design:type', metricsInstance, 'values');
		const arrayElementClass = Reflect.getMetadata('arrayElementClass', metricsInstance, 'values');

		console.log('Metrics.values metadata:');
		console.log('  design:type:', designType?.name);
		console.log('  arrayElementClass:', arrayElementClass?.name);

		expect(designType).toBe(Array);
		expect(arrayElementClass).toBe(BigInt);
	});
});
