import { describe, test, expect, spyOn } from 'bun:test';
import { QModel, Quick, QType } from '../../../src/index';

describe('Security: Arrow Function Warning & Bypass', () => {

    test('should WARN and BLOCK overwrite of undecorated arrow function', () => {
        class ProtectedUser extends QModel<any> {
            // Undecorated arrow function = Protected
            getCreditCard = () => "HIDDEN";
        }

        const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
        
        const user = new ProtectedUser({
            getCreditCard: "1234-5678" // Attack?
        });

        // 1. Should block
        expect(user.getCreditCard()).toBe("HIDDEN");

        // 2. Should warn
        expect(warnSpy).toHaveBeenCalled();
        expect(warnSpy.mock.calls[0][0]).toContain('Security Warning');
        expect(warnSpy.mock.calls[0][0]).toContain('getCreditCard');
        
        warnSpy.mockRestore();
    });

    test('should ALLOW overwrite if explicitly decorated (Bypass)', () => {
        
        // Scenario: User has a property that defaults to a function 
        // but can hold string data (weird, but explicit).
        @Quick({
            dynamicHandler: String 
        })
        class FlexibleModel extends QModel<any> {
            
            // Defaults to a function
            declare dynamicHandler: string | (() => string);

            constructor(data?: any) {
                super(data);
                // Default init (simulated)
                if (!this.dynamicHandler) {
                    this.dynamicHandler = () => "default implementation";
                }
            }
        }

        // Wait, QModel constructor runs AFTER class fields init.
        // But for explicit arrow functions in class body:
        
        @Quick({
            algo: String // Explicit decoration authorizes overwrite
        })
        class ValidBypass extends QModel<any> {
            // Arrow function
            algo: any = () => "default";
        }

        const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});

        const model = new ValidBypass({
            algo: "replaced-data"
        });

        // 1. Should ALLOW overwrite because it's decorated
        expect(model.algo).toBe("replaced-data");
        
        // 2. Should NOT warn
        expect(warnSpy).not.toHaveBeenCalled();
        
        warnSpy.mockRestore();
    });

});
