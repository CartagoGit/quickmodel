import { describe, it, expect, spyOn } from 'bun:test';
import { ValidationService } from '../../../../src/core/services/validation.service';
import { QType } from '../../../../src/index';

describe('Validation Service Coverage Gaps', () => {
	it('should handle exceptions thrown by validator', () => {
		const service = new ValidationService();

		// Mock a throwing transformer
		const throwingTransformer = {
			serialize: () => '',
			deserialize: () => null,
			validate: () => {
				throw new Error('Validator Crash');
			},
		};

		// We need to inject this transformer. transformers is private.
		// We can register it via QTransformerRegistry or cast service to any.
		(service as any).transformers.set('throwing-type', throwingTransformer);

		class CrashModel {
			@QType('throwing-type' as any)
			prop: any = 'test';
		}

		const instance = new CrashModel();
		// We need to ensure metadata is set correctly for CrashModel even if we didn't extend QModel
		// QType decorator sets 'fieldType'.

		// Wait, QType sets 'fieldType' on prototype.
		// validate(instance) checks Reflect.getMetadata('fieldType', instance, key)
		// This should work.

		const results = service.validate(instance as any);

		expect(results.length).toBe(1);
		expect(results[0]?.isValid).toBe(false);
		expect(results[0]?.error).toContain('Validator Crash');
	});

	it('should catch errors during recursive validation of nested object', () => {
		const service = new ValidationService();

		class Child {
			@QType('string')
			val = 'ok';

			// To be recognized as validate-able, it needs validate method?
			// Line 269: check 'validate' in value.
			// QModel has validate.
			validate() {
				return [];
			}
		}

		class Parent {
			@QType('string') // just to ensure it's processed if needed, but we look at value recursively
			child = new Child();
		}

		// The check 'value' block (line 265) runs for every field.
		// But wait, the loop iterates over DECORATED fields of the PARENT instance.
		// Parent has 'child' decorated? we need a decorator.
		Reflect.defineMetadata('quick:types', ['child'], Parent.prototype);
		Reflect.defineMetadata('fieldType', 'any', Parent.prototype, 'child'); // fake type

		// Spy on validate to throw when called with Child
		const spy = spyOn(service, 'validate');
		spy.mockImplementation((inst) => {
			if (inst instanceof Child) {
				throw new Error('Recursive Crash');
			}
			// Call original for Parent
			// We can't easily call original if we mocked it.
			// We need to mock implementation for specific call args?
			// Bun spy doesn't support conditional pass-through easily in one line.

			// Alternative: Override 'validate' property on the child instance to throw?
			// But service.validate calls this.validate recursively using the service instance.
			// It does NOT call child.validate().
			// Wait, logic at 267:
			// if (typeof value === 'object' && 'validate' in value ...)
			// Then it calls `this.validate(value, ...)`

			// So recursively calling service.validate.
			return []; // Default for others
		});

		// Actually, if we want `this.validate` to execute logic for Parent, and fail for Child.
		// We can't easily spy `this` method while executing it.

		// Alternative: Make the Child instance throw on property access?
		// Service.validate reads `instance.constructor.name`.
		// Service.validate reads `Reflect.getMetadata`.

		// If we make `Object.getPrototypeOf(child)` throw?
		// Or `child.constructor` throw?

		// Let's rely on `validate` method check?
		// No, the catch block surrounds `this.validate(...)`.

		// The only way `this.validate` throws is if it fails synchronously.
		// Example: Stack overflow (covered implicitly by depth/seen check?), or Proxy trap.

		// Proxy approach:
		const child = new Child();
		const proxyChild = new Proxy(child, {
			get(target, prop, receiver) {
				if (prop === 'constructor') throw new Error('Proxy Trap');
				return Reflect.get(target, prop, receiver);
			},
		});

		const parent = new Parent();
		parent.child = proxyChild as any;

		// Ensure parent is processed
		// We need service.validate(parent) to run.
		// spy restore
		spy.mockRestore();

		// Now run
		// We expect console.error to be called (line 290)
		// And result to have errors? No, it catches and ignores validation errors in child.
		// Wait, line 280: if nestedErrors returns.
		// Line 288: catch(e) -> console.error.

		// So validation passes (returns empty array for that field) but logs error.

		const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});

		service.validate(parent as any);

		expect(consoleSpy).toHaveBeenCalledWith(
			'Caught validation error:',
			expect.any(Error)
		);

		consoleSpy.mockRestore();
	});
});
