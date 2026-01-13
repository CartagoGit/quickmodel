import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '../../../src/index';

/**
 * Security Test: Intrinsic Arrow Function Protection
 * 
 * Verifies that the model automatically protects instance methods (Arrow Functions)
 * from being overwritten by data payload, even WITHOUT Strict Mode.
 */
describe('Security: Intrinsic Arrow Function Protection', () => {

    test('should prevent overwriting arrow functions with data', () => {
        
        // 1. Define vulnerable class with Arrow Function (Instance Property)
        @Quick({}, { strict: false }) // Explicitly disable strict mode
        class VulnerableUser extends QModel<any> {
            
            // Arrow function (not on prototype, but on instance)
            // Vulnerable to "Property Shadowing" if not protected
            checkAccess = () => false;

            public test() {
                return this.checkAccess();
            }
        }

        // 2. Attack Payload
        // Attempt to overwrite 'checkAccess' with a static value (DoS)
        // or a malicious function (Privilege Escalation - if input is raw object)
        const attackPayload = {
            checkAccess: true // If successful, user.checkAccess() throws TypeError
        };

        // 3. Execution
        const user = new VulnerableUser(attackPayload);

        // 4. Assertions
        
        // The property should STILL be a function
        expect(typeof user.checkAccess).toBe('function');
        
        // The original logic should be intact
        expect(user.checkAccess()).toBe(false);
        
        // The attack value should be ignored
        // @ts-ignore
        expect(user.checkAccess).not.toBe(true);
    });

    test('should prevent replacing arrow function with malicious function', () => {
        @Quick({}, { strict: false })
        class AdminUser extends QModel<any> {
            isAdmin = () => false;
        }

        // Attack: trying to Inject a function returning true
        const maliciousPayload = {
            isAdmin: () => true
        };

        const admin = new AdminUser(maliciousPayload);

        // Should return original value
        expect(admin.isAdmin()).toBe(false);
    });

});
