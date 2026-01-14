import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import { PropertyTransformer } from '@/core/services/property-transformer.service';
import { ValueTransformerService } from '@/core/services/value-transformer.service';
import { TransformerLookupService } from '@/core/services/transformer-lookup.service';
import 'reflect-metadata';

// Mocks
const mockValidateOrCoercePrimitive = mock((key, val) => val);
const mockTransformByDesignType = mock((val) => val);
const mockTransformNestedArray = mock((val) => val);
const mockTransformNestedModelArray = mock((val) => val);

const mockValueTransformer = {
    validateOrCoercePrimitive: mockValidateOrCoercePrimitive,
    transformByDesignType: mockTransformByDesignType,
    transformNestedArray: mockTransformNestedArray,
    transformNestedModelArray: mockTransformNestedModelArray,
} as unknown as ValueTransformerService;

const mockGetTransformer = mock(() => null);

const mockTransformerLookup = {
    getTransformer: mockGetTransformer,
} as unknown as TransformerLookupService;

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

        service.transformProperty('age', '123', {}, class User {}, context);

        expect(mockValidateOrCoercePrimitive).toHaveBeenCalled();
        expect(mockTransformByDesignType).toHaveBeenCalled();
    });

    it('should delegate to custom transformer from options', () => {
        const customFn = mock((v) => 'custom ' + v);
        const context: any = {
            decoratedFields: ['customField'],
            designTypes: {},
            options: { transformers: { customField: customFn } },
            transformContext: { propertyKey: 'customField' },
        };

        const result = service.transformProperty('customField', 'value', {}, class User {}, context);
        
        expect(result).toBe('custom value');
        expect(customFn).toHaveBeenCalledWith('value');
    });

    it('should delegate to fieldType transformer (e.g. @Quick({ field: Date }))', () => {
         const mockDateTransformer = { deserialize: mock(() => new Date('2023-01-01')) };
         mockGetTransformer.mockReturnValue(mockDateTransformer);

         const instance = {};
         Reflect.defineMetadata('fieldType', 'Date', instance, 'createdAt');

         const context: any = {
            decoratedFields: ['createdAt'],
            designTypes: {},
            options: {},
            transformContext: { propertyKey: 'createdAt', className: 'User' },
         };

         const result = service.transformProperty('createdAt', '2023-01-01', instance, class User {}, context);
         
         expect(mockGetTransformer).toHaveBeenCalled();
         expect(mockDateTransformer.deserialize).toHaveBeenCalled();
         expect(result).toBeInstanceOf(Date);
    });
});
