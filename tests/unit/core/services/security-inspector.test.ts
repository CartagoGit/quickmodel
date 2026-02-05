import { describe, it, expect, beforeEach } from 'bun:test';
import { SecurityInspector } from '../../../../src/core/services/security-inspector.service';

describe('SecurityInspector', () => {
	let inspector: SecurityInspector;

	beforeEach(() => {
		inspector = new SecurityInspector();
	});

	describe('getTemplateInstance', () => {
		it('should create instance for no-arg constructor', () => {
			class NoArg {
				prop = 1;
			}
			const instance = inspector.getTemplateInstance(NoArg);
			expect(instance).not.toBeNull();
			expect(instance).toBeInstanceOf(NoArg);
		});

		it('should create instance for object-arg constructor', () => {
			class ObjectArg {
				constructor(data: any) {
					if (!data) throw new Error('Data required');
				}
			}
			const instance = inspector.getTemplateInstance(ObjectArg);
			expect(instance).not.toBeNull();
			expect(instance).toBeInstanceOf(ObjectArg);
		});

		it('should return null if constructor fails', () => {
			class Failing {
				constructor() {
					throw new Error('Fail');
				}
			}
			const instance = inspector.getTemplateInstance(Failing);
			expect(instance).toBeNull();
		});

		it('should cache results', () => {
			let calls = 0;
			class Cached {
				constructor() {
					calls++;
				}
			}
			inspector.getTemplateInstance(Cached);
			inspector.getTemplateInstance(Cached);
			expect(calls).toBe(1); // Constructor called only once due to cache?
			// Wait, getTemplateInstance instantiates using new(), so calls will be 1 if it succeeds and we try again?
			// Actually, the method caches the *result*.
			// So second call returns the *same instance* from cache.
		});
	});

	describe('isDangerousKey', () => {
		it('should identify dangerous keys', () => {
			const dangerous = [
				'__proto__',
				'constructor',
				'prototype',
				'__defineGetter__',
				'__defineSetter__',
				'__lookupGetter__',
				'__lookupSetter__',
			];
			dangerous.forEach((key) => {
				expect(inspector.isDangerousKey(key)).toBe(true);
			});
		});

		it('should allow safe keys', () => {
			expect(inspector.isDangerousKey('id')).toBe(false);
			expect(inspector.isDangerousKey('name')).toBe(false);
			expect(inspector.isDangerousKey('toString')).toBe(false); // toString is method, but not "dangerous key" in this check
		});
	});

	describe('isMethodOnPrototype', () => {
		class ProtoCheck {
			method() {}
			get accessor() {
				return 1;
			}
			prop = 1;
		}

		it('should detect methods on prototype', () => {
			expect(
				inspector.isMethodOnPrototype(ProtoCheck.prototype, 'method')
			).toBe(true);
		});

		it('should ignore properties that are not methods', () => {
			expect(
				inspector.isMethodOnPrototype(ProtoCheck.prototype, 'prop')
			).toBe(false); // prop is not on prototype usually for class fields, let's verify
			// Class fields are initialized on the instance, but not on the prototype.
			// So searching prototype for 'prop' will be undefined unless defined.
		});

		it('should return false for toString on Object prototype (explicit exclusion)', () => {
			expect(
				inspector.isMethodOnPrototype(ProtoCheck.prototype, 'toString')
			).toBe(false);
		});

		it('should return true for toString if overridden in class', () => {
			class Overridden extends ProtoCheck {
				toString() {
					return 'overridden';
				}
			}
			expect(
				inspector.isMethodOnPrototype(Overridden.prototype, 'toString')
			).toBe(true);
		});

		it('should allow accessors (getters)', () => {
			expect(
				inspector.isMethodOnPrototype(ProtoCheck.prototype, 'accessor')
			).toBe(false);
		});

		it('should bypass check if field is decorated', () => {
			expect(
				inspector.isMethodOnPrototype(ProtoCheck.prototype, 'method', [
					'method',
				])
			).toBe(false);
		});
	});

	describe('isArrowFunctionMethod', () => {
		class ArrowCheck {
			arrow = () => {};
			prop = 1;
			norm() {}
		}

		it('should detect arrow functions on instance template', () => {
			const template = new ArrowCheck() as any;
			expect(inspector.isArrowFunctionMethod('arrow', template, [])).toBe(
				true
			);
		});

		it('should return false for regular properties', () => {
			const template = new ArrowCheck() as any;
			expect(inspector.isArrowFunctionMethod('prop', template, [])).toBe(
				false
			);
		});

		it('should return false if template is null', () => {
			expect(inspector.isArrowFunctionMethod('arrow', null, [])).toBe(
				false
			);
		});

		it('should bypass if field is decorated', () => {
			const template = new ArrowCheck() as any;
			expect(
				inspector.isArrowFunctionMethod('arrow', template, ['arrow'])
			).toBe(false);
		});
	});
});
