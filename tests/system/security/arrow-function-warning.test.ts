import { describe, test, expect, spyOn } from 'bun:test';
import { QModel, Quick } from '../../../src/index';

describe('Security: Arrow Function Warning & Bypass', () => {
	test('should WARN and BLOCK overwrite of undecorated arrow function', () => {
		class ProtectedUser extends QModel<any> {
			// Undecorated arrow function = Protected
			getCreditCard = () => 'HIDDEN';
		}

		const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});

		const user = new ProtectedUser({
			getCreditCard: '1234-5678', // Attack?
		});

		// 1. Should block
		expect(user.getCreditCard()).toBe('HIDDEN');

		// 2. Should warn
		expect(warnSpy).toHaveBeenCalled();
		expect(warnSpy.mock.calls[0]?.[0]).toContain('Security Warning');
		expect(warnSpy.mock.calls[0]?.[0]).toContain('getCreditCard');

		warnSpy.mockRestore();
	});

	test('should ALLOW overwrite if explicitly decorated (Bypass)', () => {
		@Quick(
			{
				algo: String, // Explicit decoration authorizes overwrite
			},
			{ unknownPropertyPolicy: 'keep' } // silence v2.0 deprecation warning
		)
		class ValidBypass extends QModel<any> {
			// Arrow function
			algo: any = () => 'default';
		}

		const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});

		const model = new ValidBypass({
			algo: 'replaced-data',
		});

		// 1. Should ALLOW overwrite because it's decorated
		expect(model.algo).toBe('replaced-data');

		// 2. Should NOT warn
		expect(warnSpy).not.toHaveBeenCalled();

		warnSpy.mockRestore();
	});
});
