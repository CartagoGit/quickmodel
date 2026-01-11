
import { describe, test, expect } from 'bun:test';
import { QModel } from '@/index';
import { QTYPES_METADATA_KEY } from '@/core/decorators/qtype.decorator';

describe('Validation Robustness: Circular References', () => {

    test('should handle circular references without stack overflow', () => {
        interface INode {
            name: string;
            child?: INode;
        }
        
        class CircularNode extends QModel<INode> {
            declare name: string;
            declare child?: CircularNode;
        }
        
        // 1. Register 'child' as a Quick field so validate() iterates it
        Reflect.defineMetadata(QTYPES_METADATA_KEY, ['child'], CircularNode.prototype);
        
        // 2. We need 'fieldType' to be defined?
        // In the code I wrote:
        // const fieldType = Reflect.getMetadata('fieldType', instance, key);
        // if (fieldType) { ... }
        // 
        // AND THEN... 
        // 
        // // RECURSIVE VALIDATION for Nested Models
        // if (value) { ... }
        // 
        // Wait, did I place the recursive validation INSIDE `if (fieldType)` or OUTSIDE?
        // If inside, then I need to define logic for fieldType.
        // If outside, just iterating `decoratedFields` is enough.
        // Let's assume I put it outside (I hope).
        // Actually, if I look at my previous `replace_string_in_file` call...
        // It replaced the closing brace of `if (fieldType)`.
        // So recursive validation IS OUTSIDE `if (fieldType)`.
        // So this test setup should be sufficient.

        const parent = new CircularNode({ name: 'Parent' });
        const child = new CircularNode({ name: 'Child' });

        parent.child = child;
        child.child = parent; // Cycle created
        
        console.log('Test: calling validate on circular structure...');
        
        // This SHOULD crash if not protected
        const errors = parent.validate();
        
        expect(errors).toBeArray();
    });
});
