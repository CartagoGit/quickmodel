import { describe, it, expect } from 'bun:test';
import { QModel, Quick } from '../../../../src';

describe('ToInterface Coverage Gaps', () => {
    it('should handle null original value becoming a model instance', () => {
        @Quick({ name: 'string' })
        class Child extends QModel<any> {
            declare name: string;
        }

        @Quick({ child: Child })
        class Parent extends QModel<any> {
            declare child: Child | null;
        }

        // Initialize with null
        const p = new Parent({ child: null });
        expect(p.toInterface()).toEqual({ child: null });

        // Update to instance
        p.child = new Child({ name: 'New' });
        
        // toInterface should now recurse into custom model serialization
        // The uncovered lines at 402-413 handle this case: original is null, current is object with toInterface
        expect(p.toInterface()).toEqual({ child: { name: 'New' } });
    });

    it('should handle circular reference in conversion', () => {
        // Line 155-160: check saw.has(currentValue)
        @Quick({ self: 'any' })
        class Circular extends QModel<any> {
            declare self: Circular;
        }

        const c = new Circular({ self: null });
        c.self = c;

        // In production, it might log or return value.
        // In dev/test (NODE_ENV!=production), it should throw.
        // QuickModel implementation checks process.env.NODE_ENV
        
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test'; // Ensure throws
        
        expect(() => c.toInterface()).toThrow('Circular reference');
        
        process.env.NODE_ENV = originalEnv;
    });
    
    it('should handle "any" array inference mismatch', () => {
        // Line ~37 in to-interface: if (Array.isArray(model))
        // This is tricky to hit via QModel.toInterface() since instance is object.
        // Need to call ToInterfaceService directly with array.
        
        // But let's check nested array of models where original was missing?
    });
});
