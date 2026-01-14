import { describe, test, expect, afterEach } from 'bun:test';
import { Quick, QModel, QConfig } from '../../../../src';
import { Serializer } from '../../../../src/core/services/serializer.service';

interface IOptional {
	req: string;
	opt?: string;
	missing?: string;
}

describe('Expose Unset Fields Configuration', () => {
	const originalDefaults = { ...QConfig.get().defaults };
	const serializer = new Serializer();

	afterEach(() => {
		QConfig.configure({ defaults: originalDefaults });
	});

	test('should omit undefined fields by default', () => {
		@Quick({})
		class DefaultModel extends QModel<IOptional> {
			declare req: string;
			declare opt?: string;
			declare missing?: string;
		}

		const instance = new DefaultModel({ req: 'exists', opt: undefined });
		const json = serializer.serialize(
			instance as unknown as Record<string, unknown>
		) as any;

		expect(json.req).toBe('exists');
		expect('opt' in json).toBe(false);
		expect('missing' in json).toBe(false);
	});

	test('should expose undefined fields when exposeUnsetFields is true', () => {
		@Quick({}, { exposeUnsetFields: true })
		class ExposeModel extends QModel<IOptional> {
			declare req: string;
			declare opt?: string;
			declare missing?: string;
		}

		const instance = new ExposeModel({ req: 'exists', opt: undefined });
		// Ensure properties exist on the instance (initialized via defineProperty usually)
		// But QModel only initializes what is passed in constructor or declared?
		// If declared with 'declare', they don't exist in JS runtime until assigned.
		// But Serializer iterates keys from 'getOwnPropertyNames' + 'prototype'.
		// If a property is never assigned, it might not be iterable?

		// Let's force assignment of undefined
		instance.opt = undefined;
		// missing is not assigned at all

		const json = serializer.serialize(
			instance as unknown as Record<string, unknown>
		) as any;

		expect(json.req).toBe('exists');

		// Assigned undefined should be present
		expect('opt' in json).toBe(true);
		expect(json.opt).toBeUndefined();

		// Unassigned property 'missing' won't be in iteration of keys usually,
		// unless QModel initializes all declared fields?
		// QModel does NOT initialize declared fields automatically absent from data.
		expect('missing' in json).toBe(false);
	});

	test('should respect global configuration', () => {
		QConfig.configure({
			defaults: { exposeUnsetFields: true },
		});

		@Quick({})
		class GlobalExpose extends QModel<IOptional> {
			declare opt?: string;
		}

		const instance = new GlobalExpose({});
		instance.opt = undefined; // Explicitly set

		const json = serializer.serialize(
			instance as unknown as Record<string, unknown>
		) as any;
		expect('opt' in json).toBe(true);
	});
});
