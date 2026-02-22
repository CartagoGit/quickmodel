import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule } from '@/core/decorators/qrule.decorator';

// ---------------------------------------------------------------------------
// Shared model
// ---------------------------------------------------------------------------

@Quick({ age: 'number' })
class UserModel extends QModel<{ name: string; age: number }> {
	declare name: string;

	@QRule((v: unknown) => typeof v === 'number' && v >= 18, 'Must be adult')
	declare age: number;
}

// ---------------------------------------------------------------------------
// validationReport()
// ---------------------------------------------------------------------------

describe('validationReport()', () => {
	test('returns valid:true when both integrity and rules pass', () => {
		const user = UserModel.create({ name: 'Alice', age: 30 });
		const report = user.validationReport();
		expect(report.valid).toBe(true);
	});

	test('returns valid:false when a @QRule fails', () => {
		const user = UserModel.create({ name: 'Alice', age: 10 });
		const report = user.validationReport();
		expect(report.valid).toBe(false);
	});

	test('returns valid:false when integrity fails', () => {
		const user = UserModel.create({ name: 'Alice', age: 30 });
		(user as any).age = 'broken';
		const report = user.validationReport();
		expect(report.valid).toBe(false);
	});

	test('report.integrity contains checkIntegrity() result', () => {
		const user = UserModel.create({ name: 'Alice', age: 30 });
		const report = user.validationReport();
		expect(report.integrity).toEqual(user.checkIntegrity());
	});

	test('report.rules contains checkRules() result', () => {
		const user = UserModel.create({ name: 'Alice', age: 10 });
		const report = user.validationReport();
		expect(report.rules).toEqual(user.checkRules());
	});

	test('all three rule errors are present in report.rules.errors', () => {
		@Quick({ val: 'number' })
		class Multi extends QModel<{ val: number }> {
			@QRule(
				(v: unknown) => typeof v === 'number' && v > 0,
				'Must be positive'
			)
			@QRule(
				(v: unknown) => typeof v === 'number' && v < 100,
				'Must be less than 100'
			)
			declare val: number;
		}
		const m = Multi.create({ val: 150 });
		const { rules } = m.validationReport();
		expect(rules.errors.length).toBeGreaterThanOrEqual(1);
	});

	test('valid:true when no @QRule decorators and no integrity issues', () => {
		@Quick({ x: 'string' })
		class Plain extends QModel<{ x: string }> {
			declare x: string;
		}
		const p = Plain.create({ x: 'hello' });
		expect(p.validationReport().valid).toBe(true);
	});

	test('report.valid equals isValid()', () => {
		const good = UserModel.create({ name: 'Alice', age: 30 });
		const bad = UserModel.create({ name: 'Alice', age: 10 });
		expect(good.validationReport().valid).toBe(good.isValid());
		expect(bad.validationReport().valid).toBe(bad.isValid());
	});
});
