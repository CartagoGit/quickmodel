/**
 * Mock Services Registry — lazy-loading contract for `QModel.mock()`.
 *
 * This module holds thin references to `QMockGenerator` and `QMockBuilder`.
 * It has **zero runtime imports** so it never adds to the consumer bundle on its own.
 *
 * Mock services are registered by importing `quickmodel/mock`.
 * `quickmodel` (the default entry point) imports `quickmodel/mock` automatically,
 * so existing consumers are unaffected.
 *
 * Consumers that want the smallest possible bundle should import from
 * `quickmodel/core` and opt-in explicitly:
 *
 * ```typescript
 * import { QModel } from 'quickmodel/core';
 * import 'quickmodel/mock'; // registers mock services → enables QModel.mock()
 * ```
 *
 * @see {@link registerMockServices}  — called by `quickmodel/mock` on import
 * @see {@link getMockGenSingleton}   — called by `QModel._mockGen` access
 * @see {@link getMockBuilderCtor}    — called by `QModel.mock()`
 * @module core/helpers/mock-registry
 */

import type { QMockGenerator } from '@/core/services/mock-generator.service';
import type { QMockBuilder } from '@/core/services/mock-builder.service';

/** @internal Constructor signature for QMockBuilder (type-only, erased at runtime). */
export type IMockBuilderCtor = new (
	modelClass: new (...args: any[]) => any,
	gen: QMockGenerator
) => QMockBuilder<any, any>;

/** @internal Getter that returns the QMockGenerator singleton. */
export type IMockGenGetter = () => QMockGenerator;

/** @internal Registered generator singleton getter. */
let _mockGenGetter: IMockGenGetter | undefined;

/** @internal Registered QMockBuilder constructor. */
let _mockBuilderCtor: IMockBuilderCtor | undefined;

/**
 * Registers the mock services required by `QModel.mock()`.
 *
 * Called automatically when `quickmodel/mock` is imported.
 * Subsequent calls overwrite the previous registration (idempotent).
 *
 * @param genGetter     - A getter that returns the `QMockGenerator` singleton
 * @param builderCtor   - The `QMockBuilder` constructor
 * @see {@link getMockGenSingleton}
 * @see {@link getMockBuilderCtor}
 */
export function registerMockServices(
	genGetter: IMockGenGetter,
	builderCtor: IMockBuilderCtor
): void {
	_mockGenGetter = genGetter;
	_mockBuilderCtor = builderCtor;
}

/**
 * Returns the `QMockGenerator` singleton.
 * Throws a descriptive error if `quickmodel/mock` has not been imported yet.
 *
 * @throws {Error} When mock services have not been registered
 * @see {@link registerMockServices}
 */
export function getMockGenSingleton(): QMockGenerator {
	if (!_mockGenGetter) {
		throw new Error(
			'[QuickModel] Mock generation is not available.\n' +
				'Import "quickmodel/mock" to enable QModel.mock():\n\n' +
				'  import "quickmodel/mock";\n\n' +
				'If you are using the full "quickmodel" package (not "quickmodel/core"), ' +
				'this should have been registered automatically.'
		);
	}
	return _mockGenGetter();
}

/**
 * Returns the `QMockBuilder` constructor.
 * Throws a descriptive error if `quickmodel/mock` has not been imported yet.
 *
 * @throws {Error} When mock services have not been registered
 * @see {@link registerMockServices}
 */
export function getMockBuilderCtor(): IMockBuilderCtor {
	if (!_mockBuilderCtor) {
		throw new Error(
			'[QuickModel] Mock generation is not available.\n' +
				'Import "quickmodel/mock" to enable QModel.mock():\n\n' +
				'  import "quickmodel/mock";\n\n' +
				'If you are using the full "quickmodel" package (not "quickmodel/core"), ' +
				'this should have been registered automatically.'
		);
	}
	return _mockBuilderCtor;
}

/**
 * Returns `true` if mock services have been registered.
 * Useful for producing actionable error messages.
 */
export function hasMockServices(): boolean {
	return _mockGenGetter !== undefined && _mockBuilderCtor !== undefined;
}

/**
 * Resets the mock services registry to its initial (unregistered) state.
 *
 * **For testing purposes only.** Use this in `beforeEach` blocks that need
 * to verify the "not registered" guard paths in `getMockGenSingleton()` and
 * `getMockBuilderCtor()`.
 *
 * @internal
 */
export function _resetMockServicesForTesting(): void {
	_mockGenGetter = undefined;
	_mockBuilderCtor = undefined;
}

/**
 * Returns the current raw registry state (getter + ctor, possibly undefined).
 *
 * **For testing purposes only.** Use this with `registerMockServices()` to
 * save and restore mock services around tests that temporarily register fakes.
 *
 * @internal
 */
export function _getMockServicesState(): {
	getter: IMockGenGetter | undefined;
	ctor: IMockBuilderCtor | undefined;
} {
	return { getter: _mockGenGetter, ctor: _mockBuilderCtor };
}
