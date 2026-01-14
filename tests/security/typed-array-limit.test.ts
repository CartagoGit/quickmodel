
import { describe, test, expect } from 'bun:test';
import { TypedArrayTransformer } from '../../src/transformers/typed-array.transformer';
import { QModelError } from '../../src/core/errors/quickmodel.error';

describe('Security: TypedArray Resource Limits', () => {
    test('should reject huge arrays', () => {
        const transformer = new TypedArrayTransformer(Int8Array);
        const hugeArray = new Array(2_000_000).fill(1); // Default limit is 1,000,000
        
        expect(() => {
            transformer.deserialize(hugeArray, 'data', 'TestClass');
        }).toThrow(QModelError);
        
        try {
            transformer.deserialize(hugeArray, 'data', 'TestClass');
        } catch (e: any) {
            expect(e.message).toContain('TypedArray input too large');
            expect(e).toBeInstanceOf(QModelError);
        }
    });

    test('should reject huge objects (keys count check)', () => {
        const transformer = new TypedArrayTransformer(Int8Array);
        // We simulate a huge object by mocking the length check behavior
        // because creating a real object with 1M+ keys is slow
        
        const hugeObject: any = {};
        // We can't easily create 1M keys in test without being slow.
        // But we can test with a smaller limit using options.
        
        const context: any = {
            metadata: {
                transformerOptions: { maxItems: 100 }
            }
        };

        const mediumObject: any = {};
        for(let i=0; i<150; i++) {
            mediumObject[i] = i;
        }

        expect(() => {
            transformer.deserialize(mediumObject, 'data', 'TestClass', context);
        }).toThrow(QModelError);

        try {
            transformer.deserialize(mediumObject, 'data', 'TestClass', context);
        } catch (e: any) {
             expect(e.message).toContain('TypedArray input object too large');
             expect(e).toBeInstanceOf(QModelError);
        }
    });
});
