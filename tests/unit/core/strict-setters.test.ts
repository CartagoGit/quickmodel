import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Robustness: Strict Setters', () => {
	test('should throw error on invalid assignment in strict mode', () => {
		interface IUser {
			birthDate: Date;
		}
		
        // Enable strict mode
        @Quick({ birthDate: Date }, { strict: true })
		class StrictUser extends QModel<IUser> {
			declare birthDate: Date;
		}

		const user = new StrictUser({ birthDate: new Date() });

		// Act & Assert
        // Assigning an invalid date string that cannot be parsed by Date
        // Date constructor returns "Invalid Date" but doesn't throw.
        // Wait, DateTransformer might throw if it checks validity?
        // Let's rely on something that definitely throws or fails check.
        
        // If I assign a boolean to a Date field, DateTransformer might try new Date(true) -> valid date (epoch+1).
        
        // Let's use something that the transformer rejects or fails validation.
        // Actually, DateTransformer currently swallows errors and returns Invalid Date (if native).
        // Does DateTransformer throw?
        
        // Let's assume we want to enforce type check AFTER transformation.
        // If result is Invalid Date, it should throw in strict mode.
        
		expect(() => {
			user.birthDate = 'invalid-date-string' as any;
            
            // If transformation results in Invalid Date, strict mode checks should catch it?
            // Or the smart setter catches the error?
		}).toThrow();
	});

	test('should NOT throw error on invalid assignment in non-strict mode (default)', () => {
		interface IUser {
			birthDate: Date;
		}
		
        // Default (strict: false)
        @Quick({ birthDate: Date })
		class LaxUser extends QModel<IUser> {
			declare birthDate: Date;
		}

		const user = new LaxUser({ birthDate: new Date() });

		// Act
        user.birthDate = 'invalid-date-string' as any;
        
        // Assert: Should hold the string value (raw assignment fallback)
        expect(user.birthDate).toBe('invalid-date-string' as any);
	});
});
