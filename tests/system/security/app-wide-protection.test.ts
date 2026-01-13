import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { QModel, Quick, QConfig } from '../../../src/index';

/**
 * System Test: App-Wide Security Protection
 * 
 * Simulates a real application scenario where security defaults
 * are configured at bootstrap and expected to propagate to all modules.
 */
describe('System Security: App-Wide Protection', () => {

    // Clean state before and after
    const originalDefaults = { ...QConfig.get().defaults };

    beforeAll(() => {
        // 1. BOOTSTRAP PHASE
        // In a real app, this happens in main.ts / index.ts
        QConfig.configure({
            defaults: {
                strict: true // 🛡️ LOCK DOWN EVERYTHING
            }
        });
    });

    afterAll(() => {
        // Restore cleanup
        QConfig.configure({ defaults: originalDefaults });
    });

    test('Scenario: Full Application Lockdown', () => {
        
        // --- MODULE A: Users ---
        interface IUser { username: string; }
        
        // Dev forgets to add { strict: true } !
        @Quick({ username: String })
        class User extends QModel<IUser> {
            declare username: string;
            
            // Vulnerable method if strict mode wasn't on?
            isAdmin() { return false; }
        }

        // --- MODULE B: Products ---
        interface IProduct { sku: string; price: number; }
        
        @Quick({ sku: String, price: Number })
        class Product extends QModel<IProduct> {
            declare sku: string;
            declare price: number;
        }

        // --- MODULE C: Legacy Data (Exceptions) ---
        @Quick({}, { strict: false }) // Explicit opt-out
        class LegacyLog extends QModel<any> {}


        // 2. ATTACK PHASE
        
        // Attack 1: Try to inject 'isAdmin' via constructor shadowing into User
        // The Method Shadowing protection (always active) should silently skip this assignment
        // preventing the attack without crashing the application.
        const attackedUser = new User({ 
            username: 'hacker',
            // @ts-ignore
            isAdmin: () => true 
        });

        // Verify key security properties:
        expect(attackedUser.username).toBe('hacker');
        // 1. The Method was NOT overwritten
        expect(attackedUser.isAdmin()).toBe(false); 
        // 2. The 'isAdmin' property was NOT added to the instance (it stays on prototype)
        expect(Object.hasOwn(attackedUser, 'isAdmin')).toBe(false);

        // Attack 2: Try to mass-assign metadata to Product
        // This is where Global Strict Mode specifically kicks in:
        // identifying 'unknown' properties and rejecting the payload.
        expect(() => {
            new Product({
                sku: 'A-123',
                price: 100,
                // @ts-ignore
                _internal_id: 999
            });
        }).toThrow(/Strict Mode/);

        // 3. LEGACY COMPATIBILITY PHASE
        
        // Legacy logs should still accept junk data
        const log = new LegacyLog({ message: 'hello', extra: 123 });
        // @ts-ignore
        expect(log.extra).toBe(123);
    });

});
