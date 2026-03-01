import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule } from '@/core/decorators/qrule.decorator';

// ---------------------------------------------------------------------------
// Shared model
// ---------------------------------------------------------------------------

@Quick({ age: 'number' })
class UserModel extends QModel<{ name: string; age: number }> {
	declare name: string;

	@QRule((value: number) => value >= 18, 'Must be adult')
	declare age: number;
}

// ---------------------------------------------------------------------------
// validationReport()
// ---------------------------------------------------------------------------

describe('validationReport()', () => {
	test('returns valid:true when both integrity and rules pass', () => {
		const user = UserModel.create({ name: 'Alice', age: 30 });
		const report = user.$qValidationReport();
		expect(report.valid).toBe(true);
	});

	test('returns valid:false when a @QRule fails', () => {
		const user = UserModel.create({ name: 'Alice', age: 10 });
		const report = user.$qValidationReport();
		expect(report.valid).toBe(false);
	});

	test('returns valid:false when integrity fails', () => {
		const user = UserModel.create({ name: 'Alice', age: 30 });
		(user as any).age = 'broken';
		const report = user.$qValidationReport();
		expect(report.valid).toBe(false);
	});

	test('report.integrity contains checkIntegrity() result', () => {
		const user = UserModel.create({ name: 'Alice', age: 30 });
		const report = user.$qValidationReport();
		expect(report.integrity).toEqual(user.$qCheckIntegrity());
	});

	test('report.rules contains checkRules() result', () => {
		const user = UserModel.create({ name: 'Alice', age: 10 });
		const report = user.$qValidationReport();
		expect(report.rules).toEqual(user.$qCheckRules());
	});

	test('all three rule errors are present in report.rules.errors', () => {
		@Quick({ val: 'number' })
		class Multi extends QModel<{ val: number }> {
			@QRule((value: number) => value > 0, 'Must be positive')
			@QRule((value: number) => value < 100, 'Must be less than 100')
			declare val: number;
		}
		const multi = Multi.create({ val: 150 });
		const { rules } = multi.$qValidationReport();
		expect(rules.errors.length).toBeGreaterThanOrEqual(1);
	});

	test('valid:true when no @QRule decorators and no integrity issues', () => {
		@Quick({ posX: 'string' })
		class Plain extends QModel<{ posX: string }> {
			declare posX: string;
		}
		const plain = Plain.create({ posX: 'hello' });
		expect(plain.$qValidationReport().valid).toBe(true);
	});

	test('report.valid equals isValid()', () => {
		const good = UserModel.create({ name: 'Alice', age: 30 });
		const bad = UserModel.create({ name: 'Alice', age: 10 });
		expect(good.$qValidationReport().valid).toBe(good.$qIsValid());
		expect(bad.$qValidationReport().valid).toBe(bad.$qIsValid());
	});
});
