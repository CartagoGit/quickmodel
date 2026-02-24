/**
 * Integration Test: QuickModel + Mocha / Chai (simulation)
 *
 * Chai plugins extend `chai.Assertion` prototype via `chai.use()`:
 * ```typescript
 * chai.use((chai, utils) => {
 *   chai.Assertion.addMethod('validQModel', function() { ... });
 * });
 * ```
 *
 * This file:
 * 1. Implements a `quickmodelChaiPlugin` compatible with Chai's plugin API.
 * 2. Validates the plugin with a minimal Chai-like assertion simulator.
 * 3. Shows how Mocha users would write `expect(dto).to.be.a.validQModel()`.
 *
 * In a real Mocha/Chai project:
 * ```typescript
 * // test/setup.ts (loaded via --require)
 * import * as chai from 'chai';
 * import { quickmodelChaiPlugin } from '@cartago-git/quickmodel/chai-matchers';
 * chai.use(quickmodelChaiPlugin);
 * ```
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick, QRule, QField } from '@/index';
import { quickmodelMatchers } from '@/matchers';

// ---------------------------------------------------------------------------
// Chai plugin implementation
// ---------------------------------------------------------------------------

interface IChaiAssertionContext {
	_obj: object;
	negate: boolean;
	assert(
		expr: boolean,
		msg: string,
		negMsg: string,
		...rest: unknown[]
	): void;
}

type IChaiLike = {
	Assertion: {
		addMethod(
			name: string,
			fn: (this: IChaiAssertionContext, ...args: unknown[]) => void
		): void;
	};
};

/**
 * Chai plugin for QuickModel matchers.
 *
 * Adds the following assertion methods:
 * - `.validQModel()` — passes all `@QRule` checks
 * - `.qRuleError(field, message?)` — field has a rule error
 * - `.qField(fieldName)` — property has `@QField` decorator
 * - `.matchQModel(expected)` — deep equality via serialize()
 * - `.intact()` — hasIntegrity() returns true
 * - `.dirtyField(field)` — isDirty(field) returns true
 */
function quickmodelChaiPlugin(chai: IChaiLike): void {
	chai.Assertion.addMethod(
		'validQModel',
		function (this: IChaiAssertionContext) {
			const result = quickmodelMatchers.toBeValidQModel(this._obj);
			this.assert(result.pass, result.message(), result.message());
		}
	);

	chai.Assertion.addMethod(
		'qRuleError',
		function (
			this: IChaiAssertionContext,
			field: unknown,
			message?: unknown
		) {
			const result = quickmodelMatchers.toHaveQRuleError(
				this._obj,
				field as string,
				message as string | undefined
			);
			this.assert(result.pass, result.message(), result.message());
		}
	);

	chai.Assertion.addMethod(
		'qField',
		function (this: IChaiAssertionContext, fieldName: unknown) {
			const result = quickmodelMatchers.toHaveQField(
				this._obj,
				fieldName as string
			);
			this.assert(result.pass, result.message(), result.message());
		}
	);

	chai.Assertion.addMethod(
		'matchQModel',
		function (this: IChaiAssertionContext, expected: unknown) {
			const result = quickmodelMatchers.toMatchQModel(
				this._obj,
				expected as object
			);
			this.assert(result.pass, result.message(), result.message());
		}
	);

	chai.Assertion.addMethod('intact', function (this: IChaiAssertionContext) {
		const result = quickmodelMatchers.toBeIntact(this._obj);
		this.assert(result.pass, result.message(), result.message());
	});

	chai.Assertion.addMethod(
		'dirtyField',
		function (this: IChaiAssertionContext, field: unknown) {
			const result = quickmodelMatchers.toHaveDirtyField(
				this._obj,
				field as string
			);
			this.assert(result.pass, result.message(), result.message());
		}
	);
}

// ---------------------------------------------------------------------------
// Minimal Chai-like simulator (for running without Chai installed)
// ---------------------------------------------------------------------------

function chaiExpect(actual: object): {
	to: {
		be: {
			validQModel(): void;
			intact(): void;
		};
		have: {
			qField(name: string): void;
			qRuleError(field: string, message?: string): void;
			dirtyField(field: string): void;
		};
		matchQModel(expected: object): void;
		not: {
			have: {
				qField(name: string): void;
				qRuleError(field: string, message?: string): void;
				dirtyField(field: string): void;
			};
			be: {
				validQModel(): void;
			};
			matchQModel(expected: object): void;
		};
	};
} {
	function assertPass(
		result: { pass: boolean; message: () => string },
		negate = false
	): void {
		const fails = negate ? result.pass : !result.pass;
		if (fails)
			throw new Error(`Chai assertion failed: ${result.message()}`);
	}

	return {
		to: {
			be: {
				validQModel: () =>
					assertPass(quickmodelMatchers.toBeValidQModel(actual)),
				intact: () => assertPass(quickmodelMatchers.toBeIntact(actual)),
			},
			have: {
				qField: (name: string) =>
					assertPass(quickmodelMatchers.toHaveQField(actual, name)),
				qRuleError: (field: string, msg?: string) =>
					assertPass(
						quickmodelMatchers.toHaveQRuleError(actual, field, msg)
					),
				dirtyField: (field: string) =>
					assertPass(
						quickmodelMatchers.toHaveDirtyField(actual, field)
					),
			},
			matchQModel: (expected: object) =>
				assertPass(quickmodelMatchers.toMatchQModel(actual, expected)),
			not: {
				have: {
					qField: (name: string) =>
						assertPass(
							quickmodelMatchers.toHaveQField(actual, name),
							true
						),
					qRuleError: (field: string, msg?: string) =>
						assertPass(
							quickmodelMatchers.toHaveQRuleError(
								actual,
								field,
								msg
							),
							true
						),
					dirtyField: (field: string) =>
						assertPass(
							quickmodelMatchers.toHaveDirtyField(actual, field),
							true
						),
				},
				be: {
					validQModel: () =>
						assertPass(
							quickmodelMatchers.toBeValidQModel(actual),
							true
						),
				},
				matchQModel: (expected: object) =>
					assertPass(
						quickmodelMatchers.toMatchQModel(actual, expected),
						true
					),
			},
		},
	};
}

// ---------------------------------------------------------------------------
// Test models
// ---------------------------------------------------------------------------

interface ISubscriptionDto {
	planId: string;
	seatsCount: number;
	pricePerSeat: number;
	renewsAt: Date;
}

@Quick(
	{
		planId: 'string',
		seatsCount: 'number',
		pricePerSeat: 'number',
		renewsAt: Date,
	},
	{ unknownPropertyPolicy: 'strip' }
)
class SubscriptionDto extends QModel<ISubscriptionDto> {
	@QField({ label: 'Plan', required: true })
	@QRule(
		(val: string) => ['free', 'pro', 'enterprise'].includes(val),
		'Plan must be free, pro, or enterprise'
	)
	declare planId: string;

	@QField({ label: 'Seats', required: true })
	@QRule(
		(val: number) => Number.isInteger(val) && val >= 1,
		'At least 1 seat required'
	)
	@QRule((val: number) => val <= 500, 'Cannot exceed 500 seats')
	declare seatsCount: number;

	@QField({ label: 'Price per seat' })
	@QRule((val: number) => val >= 0, 'Price cannot be negative')
	declare pricePerSeat: number;

	declare renewsAt: Date;
}

function makeValidSubscription(): SubscriptionDto {
	return new SubscriptionDto({
		planId: 'pro',
		seatsCount: 10,
		pricePerSeat: 9.99,
		renewsAt: '2026-03-01T00:00:00Z',
	});
}

function makeInvalidSubscription(): SubscriptionDto {
	return new SubscriptionDto({
		planId: 'gold', // invalid
		seatsCount: 0, // < 1
		pricePerSeat: -1, // negative
		renewsAt: '2026-03-01T00:00:00Z',
	});
}

// ---------------------------------------------------------------------------
// Plugin contract tests
// ---------------------------------------------------------------------------

describe('Mocha/Chai Integration: quickmodelChaiPlugin()', () => {
	test('plugin is a function that accepts a chai-like object', () => {
		expect(typeof quickmodelChaiPlugin).toBe('function');
	});

	test('plugin registers all expected methods on chai.Assertion', () => {
		const registeredMethods: string[] = [];
		const fakeChaiLike: IChaiLike = {
			Assertion: {
				addMethod: (name: string) => void registeredMethods.push(name),
			},
		};
		quickmodelChaiPlugin(fakeChaiLike);
		expect(registeredMethods).toContain('validQModel');
		expect(registeredMethods).toContain('qRuleError');
		expect(registeredMethods).toContain('qField');
		expect(registeredMethods).toContain('matchQModel');
		expect(registeredMethods).toContain('intact');
		expect(registeredMethods).toContain('dirtyField');
		expect(registeredMethods).toHaveLength(6);
	});
});

// ---------------------------------------------------------------------------
// Chai-style assertions (Mocha/Chai workflow simulation)
// ---------------------------------------------------------------------------

describe('Mocha/Chai Integration: .to.be.validQModel()', () => {
	test('valid subscription passes', () => {
		expect(() =>
			chaiExpect(makeValidSubscription()).to.be.validQModel()
		).not.toThrow();
	});

	test('invalid subscription fails', () => {
		expect(() =>
			chaiExpect(makeInvalidSubscription()).to.be.validQModel()
		).toThrow();
	});

	test('.not.be.validQModel() passes for invalid', () => {
		expect(() =>
			chaiExpect(makeInvalidSubscription()).to.not.be.validQModel()
		).not.toThrow();
	});
});

describe('Mocha/Chai Integration: .to.have.qRuleError(field, message?)', () => {
	let sub: SubscriptionDto;

	beforeEach(() => {
		sub = makeInvalidSubscription();
	});

	test('detects invalid plan error', () => {
		expect(() =>
			chaiExpect(sub).to.have.qRuleError(
				'planId',
				'Plan must be free, pro, or enterprise'
			)
		).not.toThrow();
	});

	test('detects seats count error', () => {
		expect(() =>
			chaiExpect(sub).to.have.qRuleError(
				'seatsCount',
				'At least 1 seat required'
			)
		).not.toThrow();
	});

	test('detects price error', () => {
		expect(() =>
			chaiExpect(sub).to.have.qRuleError(
				'pricePerSeat',
				'Price cannot be negative'
			)
		).not.toThrow();
	});

	test('valid subscription has no plan errors', () => {
		expect(() =>
			chaiExpect(makeValidSubscription()).to.not.have.qRuleError('planId')
		).not.toThrow();
	});
});

describe('Mocha/Chai Integration: .to.have.qField(fieldName)', () => {
	test('QField-decorated properties are detected', () => {
		const sub = makeValidSubscription();
		expect(() => chaiExpect(sub).to.have.qField('planId')).not.toThrow();
		expect(() =>
			chaiExpect(sub).to.have.qField('seatsCount')
		).not.toThrow();
		expect(() =>
			chaiExpect(sub).to.have.qField('pricePerSeat')
		).not.toThrow();
	});

	test('non-decorated properties are not detected', () => {
		const sub = makeValidSubscription();
		expect(() =>
			chaiExpect(sub).to.not.have.qField('renewsAt')
		).not.toThrow();
	});
});

describe('Mocha/Chai Integration: .to.matchQModel(expected)', () => {
	test('identical subscriptions match', () => {
		const subA = makeValidSubscription();
		const subB = makeValidSubscription();
		expect(() => chaiExpect(subA).to.matchQModel(subB)).not.toThrow();
	});

	test('subscriptions with different seats do not match', () => {
		const subA = makeValidSubscription();
		const subB = new SubscriptionDto({
			planId: 'pro',
			seatsCount: 20,
			pricePerSeat: 9.99,
			renewsAt: '2026-03-01T00:00:00Z',
		});
		expect(() => chaiExpect(subA).to.not.matchQModel(subB)).not.toThrow();
	});
});

describe('Mocha/Chai Integration: .to.be.intact()', () => {
	test('new subscription is intact', () => {
		expect(() =>
			chaiExpect(makeValidSubscription()).to.be.intact()
		).not.toThrow();
	});
});

describe('Mocha/Chai Integration: .to.have.dirtyField(field)', () => {
	test('fresh model has no dirty fields', () => {
		const sub = makeValidSubscription();
		expect(() =>
			chaiExpect(sub).to.not.have.dirtyField('seatsCount')
		).not.toThrow();
	});

	test('mutated field is detected', () => {
		const sub = makeValidSubscription();
		sub.seatsCount = 25;
		expect(() =>
			chaiExpect(sub).to.have.dirtyField('seatsCount')
		).not.toThrow();
	});

	test('only mutated field is dirty', () => {
		const sub = makeValidSubscription();
		sub.pricePerSeat = 14.99;
		expect(() =>
			chaiExpect(sub).to.have.dirtyField('pricePerSeat')
		).not.toThrow();
		expect(() =>
			chaiExpect(sub).to.not.have.dirtyField('seatsCount')
		).not.toThrow();
	});
});

describe('Mocha/Chai Integration: type coercion (Mocha workflow)', () => {
	test('Date fields are proper Date instances', () => {
		const sub = makeValidSubscription();
		expect(sub.renewsAt).toBeInstanceOf(Date);
		expect(sub.renewsAt.getFullYear()).toBe(2026);
	});

	test('roundtrip: serialize() + re-create matches original', () => {
		const original = makeValidSubscription();
		const serialized = original.serialize();
		const restored = new SubscriptionDto(serialized);
		expect(() =>
			chaiExpect(original).to.matchQModel(restored)
		).not.toThrow();
	});
});
