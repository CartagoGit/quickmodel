import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import { PropertyTransformer } from '../../../../../src/core/services/property-transformer.service';
import { ValueTransformerService } from '../../../../../src/core/services/value-transformer.service';
import { TransformerLookupService } from '../../../../../src/core/services/transformer-lookup.service';
import 'reflect-metadata';

// Mocks
const mockValueTransformer = {
    validateOrCoercePrimitive: mock((key, val) => val),
    transformByDesignType: mock((val) => val),
    transformNestedArray: mock((val) => val),
    transformNestedModelArray: mock((val) => val),
} as unknown as ValueTransformerService;

const mockTransformerLookup = {
    getTransformer: mock(() => null),
} as unknown as TransformerLookupService;

const mockRecursiveDeserializer = {
    deserialize: mock((val) => val),
};

describe('PropertyTransformer', () => {
    let service: PropertyTransformer;

    beforeEach(() => {
        // Reset mocks
        mock(mockValueTransformer.validateOrCoercePrimitive).mockClear();
        mock(mockValueTransformer.transformByDesignType).mockClear();
        mock(mockValueTransformer.transformNestedArray).mockClear();
        mock(mockValueTransformer.transformNestedModelArray).mockClear();
        mock(mockTransformerLookup.getTransformer).mockClear();
        mock(mockRecursiveDeserializer.deserialize).mockClear();

        service = new PropertyTransformer(
            mockValueTransformer,
            mockTransformerLookup,
            mockRecursiveDeserializer
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

        expect(mockValueTransformer.validateOrCoercePrimitive).toHaveBeenCalled();
        expect(mockValueTransformer.transformByDesignType).toHaveBeenCalled();
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
         mock(mockTransformerLookup.getTransformer).mockReturnValue(mockDateTransformer);

         const instance = {};
         Reflect.defineMetadata('fieldType', 'Date', instance, 'createdAt');

         const context: any = {
            decoratedFields: ['createdAt'],
            designTypes: {},
            options: {},
            transformContext: { propertyKey: 'createdAt', className: 'User' },
         };

         const result = service.transformProperty('createdAt', '2023-01-01', instance, class User {}, context);
         
         expect(mockTransformerLookup.getTransformer).toHaveBeenCalled();
         expect(mockDateTransformer.deserialize).toHaveBeenCalled();
         expect(result).toBeInstanceOf(Date);
    });
});
