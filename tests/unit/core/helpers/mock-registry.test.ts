/**
 * Unit tests for mock-registry.ts.
 *
 * This file must NOT import `quickmodel`, `quickmodel/mock`, or any module
 * that transitively imports them — otherwise `registerMockServices()` would
 * already have been called and the "not registered" guard paths would be
 * unreachable.
 *
 * ### Cross-file contamination strategy
 * In Bun's test runner, all test files share the same process and module
 * cache. To prevent this file from breaking subsequent test files that rely
 * on real mock services being registered, we:
 *
 * 1. `beforeAll` (file-level): Save the real services registered by earlier
 *    test files (e.g. via `@/index` import). Runs before ANY describe/beforeEach.
 * 2. `afterAll` (file-level): Restore those real services after ALL tests here.
 * 3. "unregistered state" `beforeEach`: Reset to undefined before each test so
 *    the guard paths (throw) are exercised cleanly.
 */
import {
	describe,
	it,
	expect,
	beforeEach,
	afterEach,
	beforeAll,
	afterAll,
} from 'bun:test';
import {
	getMockGenSingleton,
	getMockBuilderCtor,
	hasMockServices,
	registerMockServices,
	_resetMockServicesForTesting,
	_getMockServicesState,
} from '../../../../src/core/helpers/mock-registry';
import type {
	IMockGenGetter,
	IMockBuilderCtor,
} from '../../../../src/core/helpers/mock-registry';

describe('mock-registry (unregistered state)', () => {
	let _savedGetter: IMockGenGetter | undefined;
	let _savedCtor: IMockBuilderCtor | undefined;

	beforeAll(() => {
		// Capture real services BEFORE any beforeEach has a chance to reset them.
		const state = _getMockServicesState();
		_savedGetter = state.getter;
		_savedCtor = state.ctor;
	});

	afterAll(() => {
		// Restore real services so "registered state" describe starts with them.
		if (_savedGetter !== undefined && _savedCtor !== undefined) {
			registerMockServices(_savedGetter, _savedCtor);
		} else {
			_resetMockServicesForTesting();
		}
	});

	beforeEach(() => {
		_resetMockServicesForTesting();
	});

	it('getMockGenSingleton() throws descriptive error when not registered', () => {
		expect(() => getMockGenSingleton()).toThrow(
			/Mock generation is not available/
		);
	});

	it('getMockGenSingleton() error message instructs to import quickmodel mock', () => {
		expect(() => getMockGenSingleton()).toThrow(
			/import "quickmodel\/mock"/
		);
	});

	it('getMockBuilderCtor() throws descriptive error when not registered', () => {
		expect(() => getMockBuilderCtor()).toThrow(
			/Mock generation is not available/
		);
	});

	it('getMockBuilderCtor() error message instructs to import quickmodel mock', () => {
		expect(() => getMockBuilderCtor()).toThrow(/import "quickmodel\/mock"/);
	});

	it('hasMockServices() returns false when not registered', () => {
		expect(hasMockServices()).toBe(false);
	});
});

describe('mock-registry (registered state)', () => {
	// ── Fixtures ──────────────────────────────────────────────────────────────

	const fakeGen = { generate: () => ({}) } as any;

	const fakeGenGetter: IMockGenGetter = () =>
		fakeGen as ReturnType<IMockGenGetter>;
	const fakeBuilderCtor = class MockBuilder {} as unknown as IMockBuilderCtor; // @quickmodel-rule-ignore: no-as-unknown

	// ── Save/restore real services ─────────────────────────────────────────────
	// At this point "unregistered state" afterAll has already run and restored real services.
	let _savedGetter2: IMockGenGetter | undefined;
	let _savedCtor2: IMockBuilderCtor | undefined;

	beforeAll(() => {
		const state = _getMockServicesState();
		_savedGetter2 = state.getter;
		_savedCtor2 = state.ctor;
	});

	afterAll(() => {
		// Restore real services so subsequent test files (e.g. mock-lazy-init,
		// mock-generator-gaps, special-float) find a working mock registry.
		if (_savedGetter2 !== undefined && _savedCtor2 !== undefined) {
			registerMockServices(_savedGetter2, _savedCtor2);
		} else {
			_resetMockServicesForTesting();
		}
	});

	beforeEach(() => {
		registerMockServices(fakeGenGetter, fakeBuilderCtor);
	});

	afterEach(() => {
		_resetMockServicesForTesting();
	});

	it('registerMockServices() sets mock gen + builder, hasMockServices() returns true', () => {
		expect(hasMockServices()).toBe(true);
	});

	it('getMockGenSingleton() returns the registered generator after registration', () => {
		const gen = getMockGenSingleton();
		expect(gen).toBeDefined();
	});

	it('getMockBuilderCtor() returns the registered constructor after registration', () => {
		const ctor = getMockBuilderCtor();
		expect(typeof ctor).toBe('function');
	});
});
