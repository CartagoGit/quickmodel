// @quickmodel-rule-ignore: prefer-quick
// @quickmodel-rule-ignore: no-as-unknown — intentional: testing edge cases of IntegrityService with non-QModel instances and private internals
// This file tests @QType directly — opt-out from the prefer-quick rule.
import { describe, it, expect, spyOn } from 'bun:test';
import { IntegrityService } from '../../../../src/core/services/integrity.service';
import { QType } from '@/decorators';
import 'reflect-metadata';

describe('Integrity Service Coverage Gaps', () => {
	it('should handle exceptions thrown by validator', () => {
		const service = new IntegrityService();

		// Mock a throwing transformer
		const throwingTransformer = {
			serialize: () => '',
			deserialize: () => null,
			checkIntegrity: () => {
				throw new Error('Validator Crash');
			},
		};

		// We need to inject this transformer. transformers is private.
		// We can register it via QTransformerRegistry or cast service to any.
		(
			service as unknown as { transformers: Map<string, unknown> }
		).transformers // @quickmodel-rule-ignore: no-as-unknown
			.set('throwing-type', throwingTransformer);

		class CrashModel {
			@QType('throwing-type' as unknown as string) // @quickmodel-rule-ignore: no-as-unknown
			prop: unknown = 'test';
		}

		const instance = new CrashModel();
		// We need to ensure metadata is set correctly for CrashModel even if we didn't extend QModel
		// QType decorator sets 'fieldType'.

		// Wait, QType sets 'fieldType' on prototype.
		// validate(instance) checks Reflect.getMetadata('fieldType', instance, key)
		// This should work.

		const results = service.checkIntegrity(
			instance as unknown as Record<string, unknown>
		); // @quickmodel-rule-ignore: no-as-unknown

		expect(results.length).toBe(1);
		expect(results[0]?.isValid).toBe(false);
		expect(results[0]?.error).toContain('Validator Crash');
	});

	it('should catch errors during recursive validation of nested object', () => {
		const service = new IntegrityService();

		class Child {
			@QType('string')
			val = 'ok';

			// To be recognized as integrity-checkable, it needs $qCheckIntegrity method.
			// Service checks: '$qCheckIntegrity' in value
			// QModel has $qCheckIntegrity.
			$qCheckIntegrity() {
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

		// Proxy approach: child.constructor throws to trigger the catch block in
		// the "1. Single Nested Model" section of checkIntegrity().
		// When service.checkIntegrity(proxyChild) is called recursively, it will
		// access proxyChild.constructor.name → proxy trap fires → caught by the service.
		const child = new Child();
		const proxyChild = new Proxy(child, {
			get(target, prop, receiver) {
				if (prop === 'constructor') throw new Error('Proxy Trap');
				return Reflect.get(target, prop, receiver);
			},
		});

		const parent = new Parent();
		parent.child = proxyChild as unknown as Child;

		// We expect console.error to be called by the catch block when the proxy throws.
		const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});

		service.checkIntegrity(parent as unknown as Record<string, unknown>); // @quickmodel-rule-ignore: no-as-unknown

		expect(consoleSpy).toHaveBeenCalledWith(
			'Caught integrity error:',
			expect.any(Error)
		);

		consoleSpy.mockRestore();
	});

	it('should silently catch errors thrown during array nested model validation', () => {
		// TDD: cover the `catch (_) { // Ignore }` block inside the
		// "2. Array of Nested Models" section (lines ~381-383 in integrity.service.ts)
		const service = new IntegrityService();

		// ChildModel with @QType so QTYPES_METADATA_KEY is set on ChildModel.prototype.
		// This makes Reflect.hasMetadata(QTYPES_METADATA_KEY, Object.getPrototypeOf(proxy)) === true.
		class ChildModel {
			@QType('string' as unknown as string)
			val = 'ok';
		}
		const childInstance = new ChildModel();

		// Proxy that throws when `constructor` is accessed.
		// This causes `this.validate(proxy)` to throw at `instance.constructor.name`.
		const throwingProxy = new Proxy(childInstance, {
			get(target, prop, receiver) {
				if (prop === 'constructor') throw new Error('array proxy trap');
				return Reflect.get(target, prop, receiver);
			},
		});

		// ParentModel with an array field 'items'.
		class ParentModel {
			@QType('string' as unknown as string)
			items: unknown[] = [];
		}
		const parent = new ParentModel();
		parent.items = [throwingProxy];

		// Should NOT throw — the catch block swallows the error.
		expect(
			() =>
				service.checkIntegrity(
					parent as unknown as Record<string, unknown>
				) // @quickmodel-rule-ignore: no-as-unknown
		).not.toThrow();
	});
});
