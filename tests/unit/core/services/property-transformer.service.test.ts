// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { PropertyTransformer } from '@/core/services/property-transformer.service';
import { ValueTransformerService } from '@/core/services/value-transformer.service';
import { TransformerLookupService } from '@/core/services/transformer-lookup.service';
import 'reflect-metadata';

// Mocks
const mockValidateOrCoercePrimitive = mock((opts: any) => opts.value);
const mockTransformByDesignType = mock((val) => val);
const mockTransformNestedArray = mock((val) => val);
const mockTransformNestedModelArray = mock((val) => val);

const mockValueTransformer = {
	validateOrCoercePrimitive: mockValidateOrCoercePrimitive,
	transformByDesignType: mockTransformByDesignType,
	transformNestedArray: mockTransformNestedArray,
	transformNestedModelArray: mockTransformNestedModelArray,
} as unknown as ValueTransformerService; // @quickmodel-rule-ignore: no-as-unknown

const mockGetTransformer = mock(() => null as any);

const mockTransformerLookup = {
	getTransformer: mockGetTransformer,
} as unknown as TransformerLookupService; // @quickmodel-rule-ignore: no-as-unknown

const mockDeserialize = mock((val) => val);

const mockRecursiveDeserializer = {
	deserialize: mockDeserialize,
};

describe('PropertyTransformer', () => {
	let service: PropertyTransformer;

	beforeEach(() => {
		// Reset mocks
		mockValidateOrCoercePrimitive.mockClear();
		mockTransformByDesignType.mockClear();
		mockTransformNestedArray.mockClear();
		mockTransformNestedModelArray.mockClear();
		mockGetTransformer.mockClear();
		mockDeserialize.mockClear();

		service = new PropertyTransformer(
			mockValueTransformer,
			mockTransformerLookup,
			mockRecursiveDeserializer as any
		);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	it('should transform undecorated property using implicit coercion', () => {
		const context: any = {
			decoratedFields: [], // Not decorated
			designTypes: { age: Number },
			options: {},
			transformContext: { propertyKey: 'age', className: 'User' },
			recursionContext: {},
		};

		service.transformProperty('age', '123', {
			instance: {},
			modelClass: class User {},
			...context,
		});

		expect(mockValidateOrCoercePrimitive).toHaveBeenCalled();
		expect(mockTransformByDesignType).toHaveBeenCalled();
	});

	it('should delegate to custom transformer from options', () => {
		const customFn = mock((value) => 'custom ' + value);
		const context: any = {
			decoratedFields: ['customField'],
			designTypes: {},
			options: { transformers: { customField: customFn } },
			transformContext: { propertyKey: 'customField' },
		};

		const result = service.transformProperty('customField', 'value', {
			instance: {},
			modelClass: class User {},
			...context,
		});

		expect(result).toBe('custom value');
		expect(customFn).toHaveBeenCalledWith('value');
	});

	it('should delegate to fieldType transformer (e.g. @Quick({ field: Date }))', () => {
		const mockDateTransformer = {
			deserialize: mock(() => new Date('2023-01-01')),
		};
		mockGetTransformer.mockReturnValue(mockDateTransformer);

		const instance = {};
		Reflect.defineMetadata('fieldType', 'Date', instance, 'createdAt');

		const context: any = {
			decoratedFields: ['createdAt'],
			designTypes: {},
			options: {},
			transformContext: { propertyKey: 'createdAt', className: 'User' },
		};

		const result = service.transformProperty('createdAt', '2023-01-01', {
			instance,
			modelClass: class User {},
			...context,
		});

		expect(mockGetTransformer).toHaveBeenCalled();
		expect(mockDateTransformer.deserialize).toHaveBeenCalled();
		expect(result).toBeInstanceOf(Date);
	});
});

// ===========================================================================
// decoratedFieldsSet fast path — O(1) Set.has() vs O(n) Array.includes()
// ===========================================================================

describe('PropertyTransformer — decoratedFieldsSet fast path', () => {
	let service: PropertyTransformer;

	beforeEach(() => {
		mockValidateOrCoercePrimitive.mockClear();
		mockTransformByDesignType.mockClear();
		service = new PropertyTransformer(
			mockValueTransformer,
			mockTransformerLookup,
			mockRecursiveDeserializer as any
		);
	});

	it('uses Set.has() when decoratedFieldsSet is provided: undecorated field routes to coercion', () => {
		// 'name' is NOT in the Set → should call coercePrimitive + transformByDesignType
		const result = service.transformProperty('name', 'Alice', {
			instance: {},
			modelClass: class TestModel {},
			decoratedFields: ['other'],
			decoratedFieldsSet: new Set(['other']),
			designTypes: { name: String },
			options: {},
			discriminators: {},
			transformContext: { propertyKey: 'name', className: 'TestModel' },
			recursionContext: { visited: new WeakSet(), depth: 0 },
			maxArrayLength: 1000,
			coercionStrategy: 'strict',
		});

		expect(mockValidateOrCoercePrimitive).toHaveBeenCalledTimes(1);
		expect(mockTransformByDesignType).toHaveBeenCalledTimes(1);
		// decoratedFieldsSet.has('name') === false → went through undecorated path
		expect(result).toBe('Alice');
	});

	it('uses Set.has() when decoratedFieldsSet is provided: decorated field skips coercion', () => {
		const customFn = mock((val: unknown) => `transformed:${val}`);
		// 'title' IS in the Set → decorated path → custom transformer from options
		service.transformProperty('title', 'hello', {
			instance: {},
			modelClass: class TestModel {},
			decoratedFields: ['title'],
			decoratedFieldsSet: new Set(['title']),
			designTypes: {},
			options: { transformers: { title: customFn } },
			discriminators: {},
			transformContext: { propertyKey: 'title', className: 'TestModel' },
			recursionContext: { visited: new WeakSet(), depth: 0 },
			maxArrayLength: 1000,
			coercionStrategy: 'strict',
		});

		expect(mockValidateOrCoercePrimitive).not.toHaveBeenCalled();
		expect(customFn).toHaveBeenCalledWith('hello');
	});

	it('falls back to Array.includes() when decoratedFieldsSet is omitted (backwards compat)', () => {
		// Callers that don't pass decoratedFieldsSet (e.g. unit tests, external) still work
		const result = service.transformProperty('score', 99, {
			instance: {},
			modelClass: class LegacyModel {},
			decoratedFields: [],
			// decoratedFieldsSet intentionally omitted
			designTypes: { score: Number },
			options: {},
			discriminators: {},
			transformContext: {
				propertyKey: 'score',
				className: 'LegacyModel',
			},
			recursionContext: { visited: new WeakSet(), depth: 0 },
			maxArrayLength: 1000,
			coercionStrategy: 'strict',
		} as any);

		// 'score' not in decoratedFields → coercion path
		expect(mockValidateOrCoercePrimitive).toHaveBeenCalledTimes(1);
		expect(result).toBe(99);
	});

	it('produces the same result with decoratedFieldsSet as without it', () => {
		const baseContext = {
			instance: {},
			modelClass: class SameModel {},
			decoratedFields: ['active'],
			designTypes: { active: Boolean },
			options: {},
			discriminators: {},
			transformContext: { propertyKey: 'active', className: 'SameModel' },
			recursionContext: { visited: new WeakSet(), depth: 0 },
			maxArrayLength: 1000,
			coercionStrategy: 'strict' as const,
		};

		mockValidateOrCoercePrimitive.mockClear();
		service.transformProperty('active', true, {
			...baseContext,
			// without Set
		});
		const callsWithoutSet = mockValidateOrCoercePrimitive.mock.calls.length;

		mockValidateOrCoercePrimitive.mockClear();
		service.transformProperty('active', true, {
			...baseContext,
			decoratedFieldsSet: new Set(['active']),
		});
		const callsWithSet = mockValidateOrCoercePrimitive.mock.calls.length;

		// Both paths must produce the same call count — Set.has() must not change behaviour
		expect(callsWithSet).toBe(callsWithoutSet);
	});
});
