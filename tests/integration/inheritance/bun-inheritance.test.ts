import { describe, it, expect } from 'bun:test';
import 'reflect-metadata';

const METADATA_KEY = Symbol('test:metadata');

function MyType(value: string) {
	return function (target: object, propertyKey: string) {
		const existing = (Reflect.getMetadata(METADATA_KEY, target) as string[]) || [];
		const merged = [...existing, `${propertyKey}:${value}`];
		Reflect.defineMetadata(METADATA_KEY, merged, target);
	};
}

function MyClassDecorator(arg: string) {
	return function (target: any) {
		const originalConstructor = target;
		// Apply property decorator manually
		MyType(arg)(target.prototype, 'decoratedProp');

		const wrapped: any = function (this: any, ...args: any[]) {
			// Mimic Quick decorator logic exactly
			const instance = Reflect.construct(originalConstructor, args, wrapped);
			return instance;
		};
		wrapped.prototype = target.prototype;
		Object.defineProperty(wrapped, 'name', { value: target.name });
		
        // Copy keys - crucial step
        Object.setPrototypeOf(wrapped, originalConstructor);
		
		return wrapped;
	};
}

describe('Bun Metadata Inheritance', () => {
    
    it('should maintain correct constructor reference during instantiation', () => {
        let capturedConstructorName: string = '';
        
        @MyClassDecorator('parent')
        class Parent {
            constructor() {
                // @ts-ignore
                capturedConstructorName = this.constructor.name;
            }
        }
        
        @MyClassDecorator('child')
        class Child extends Parent { }
        
        const instance = new Child();
        console.log('Instance constructor name:', instance.constructor.name);
        console.log('Captured in constructor:', capturedConstructorName);
        
        expect(instance.constructor.name).toBe('Child');
        expect(capturedConstructorName).toBe('Child');
        
        // Check metadata on instance constructor (which is the Wrapper) prototype
        // @ts-ignore
        const proto = instance.constructor.prototype;
        const meta = Reflect.getMetadata(METADATA_KEY, proto);
        expect(meta).toContain('decoratedProp:child');
    });

	it('should inherit metadata from parent prototype', () => {
		@MyClassDecorator('parent')
		class Parent {}

		@MyClassDecorator('child')
		class Child extends Parent {}

		// Check Parent prototype metadata
		const parentMeta = Reflect.getMetadata(METADATA_KEY, Parent.prototype);
		console.log('Parent Meta:', parentMeta);
		
        // CAREFUL: Parent is now the Wrapper. Parent.prototype is target.prototype.
        // The property decorator ran on target.prototype.
        expect(parentMeta).toContain('decoratedProp:parent');

		// Check Child prototype metadata
		const childMeta = Reflect.getMetadata(METADATA_KEY, Child.prototype);
		console.log('Child Meta:', childMeta);
        
        // Should contain BOTH
		expect(childMeta).toContain('decoratedProp:parent');
		expect(childMeta).toContain('decoratedProp:child');
	});

    it('should inherit property metadata from parent prototype', () => {
        const FIELD_TYPE = Symbol('field:type');
        
        @MyClassDecorator('parent')
        class Parent {
            // Simulate @QType behavior
        }
        // Define metadata on Parent prototype property 'parentDate'
        Reflect.defineMetadata(FIELD_TYPE, Date, Parent.prototype, 'parentDate');

        @MyClassDecorator('child')
        class Child extends Parent {}
        // Define metadata on Child prototype property 'childDate'
        Reflect.defineMetadata(FIELD_TYPE, Number, Child.prototype, 'childDate');

        // Verify lookup
        const parentDateType = Reflect.getMetadata(FIELD_TYPE, Child.prototype, 'parentDate');
        const childDateType = Reflect.getMetadata(FIELD_TYPE, Child.prototype, 'childDate');
        
        console.log('Inherited parentDate type:', parentDateType);
        console.log('Own childDate type:', childDateType);

        expect(parentDateType).toBe(Date);
        expect(childDateType).toBe(Number);
    });
});
