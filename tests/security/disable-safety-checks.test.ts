/**
 * Behavior verification tests for disableSafetyChecks flag.
 *
 * Documents exactly WHAT IS and IS NOT bypassed when the flag is true,
 * so that future changes don't silently alter the security posture.
 *
 * What IS bypassed:
 *   - Initial recursion depth guard
 *   - Array length limit (maxArrayLength config)
 *   - Nested object size limit
 *
 * What IS NOT bypassed (always active):
 *   - Prototype pollution prevention (__proto__, constructor, prototype keys)
 *   - Method shadowing prevention (arrow function / prototype methods)
 *   - Internal identifier stripping (stripInternalIdentifiers option)
 */

import { QModel } from '@/core/models/quick.model';
import { Quick } from '@/core/decorators/quick.decorator';
import { QConfig } from '@/core/config/quick.config';
import {
	describe,
	test,
	expect,
	beforeEach,
	afterEach,
	spyOn,
	type Mock,
} from 'bun:test';

describe('disableSafetyChecks: behavior verification', () => {
	let warnSpy: Mock<typeof console.warn>;

	beforeEach(() => {
		QConfig.reset();
		warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
	});
	afterEach(() => {
		warnSpy.mockRestore();
		QConfig.reset();
	});

	// -----------------------------------------------------------------------
	// BYPASSED checks
	// -----------------------------------------------------------------------

	test('bypasses maxArrayLength limit', () => {
		// Set a very small limit — without disableSafetyChecks this would throw
		QConfig.configure({ defaults: { maxArrayLength: 2 } });

		@Quick(
			{ items: [String] },
			{
				performance: { disableSafetyChecks: true },
				unknownPropertyPolicy: 'keep',
			}
		)
		class BigList extends QModel<any> {
			declare items: string[];
		}

		const bigArray = Array(10).fill('x');
		expect(() => new BigList({ items: bigArray })).not.toThrow();
		expect(new BigList({ items: bigArray }).items).toHaveLength(10);
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('disableSafetyChecks is ENABLED')
		);
	});

	test('bypasses nested object size limit', () => {
		@Quick(
			{},
			{
				performance: { disableSafetyChecks: true },
				unknownPropertyPolicy: 'keep',
			}
		)
		class BigObject extends QModel<any> {
			declare meta: Record<string, any>;
		}

		// Deep nested object that would normally trigger size checks
		const deep = { a: { b: { c: { d: { e: 'deep' } } } } };
		expect(() => new BigObject({ meta: deep })).not.toThrow();
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('disableSafetyChecks is ENABLED')
		);
	});

	// -----------------------------------------------------------------------
	// NOT bypassed checks (always enforce)
	// -----------------------------------------------------------------------

	test('prototype pollution: __proto__ key is silently skipped even with disableSafetyChecks', () => {
		@Quick(
			{},
			{
				performance: { disableSafetyChecks: true },
				unknownPropertyPolicy: 'keep',
			}
		)
		class Risky extends QModel<any> {
			declare id: number;
		}

		// JSON.parse trick: __proto__ key parsed at JS level
		const vulnerable = JSON.parse('{"id":1,"__proto__":{"hacked":true}}');
		const instance = new Risky(vulnerable);

		// The instance gets populated normally...
		expect(instance.id).toBe(1);
		// ...but __proto__ injection is blocked
		expect((instance as any).hacked).toBeUndefined();
		// Global Object prototype must not be polluted
		expect(({} as any).hacked).toBeUndefined();
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('disableSafetyChecks is ENABLED')
		);
	});

	test('prototype pollution: constructor key is silently skipped even with disableSafetyChecks', () => {
		@Quick(
			{},
			{
				performance: { disableSafetyChecks: true },
				unknownPropertyPolicy: 'keep',
			}
		)
		class Risky extends QModel<any> {
			declare name: string;
		}

		const instance = new Risky({
			name: 'ok',
			constructor: { hacked: true },
		} as any);
		expect(instance.name).toBe('ok');
		// constructor should not be overwritten with the object value
		expect(typeof instance.constructor).toBe('function');
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('disableSafetyChecks is ENABLED')
		);
	});

	test('prototype pollution: "prototype" key is silently skipped even with disableSafetyChecks', () => {
		@Quick(
			{},
			{
				performance: { disableSafetyChecks: true },
				unknownPropertyPolicy: 'keep',
			}
		)
		class Risky extends QModel<any> {
			declare name: string;
		}

		const instance = new Risky({
			name: 'ok',
			prototype: { hacked: true },
		} as any);
		expect(instance.name).toBe('ok');
		expect((Risky as any).hacked).toBeUndefined();
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('disableSafetyChecks is ENABLED')
		);
	});

	// -----------------------------------------------------------------------
	// Normal functionality still works with disableSafetyChecks
	// -----------------------------------------------------------------------

	test('normal property assignment still works', () => {
		@Quick(
			{ created: Date },
			{
				performance: { disableSafetyChecks: true },
				unknownPropertyPolicy: 'keep',
			}
		)
		class Event extends QModel<any> {
			declare title: string;
			declare created: Date;
		}

		const event = new Event({ title: 'Meeting', created: '2025-01-01' });
		expect(event.title).toBe('Meeting');
		expect(event.created).toBeInstanceOf(Date);
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('disableSafetyChecks is ENABLED')
		);
	});
});
