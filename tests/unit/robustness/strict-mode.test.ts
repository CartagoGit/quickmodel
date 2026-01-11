import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QModelError } from '@/core/errors/quickmodel.error';

describe('Robustness: Strict Mode', () => {

    test('should allow extra properties by default (strict: false)', () => {
        interface IUser { name: string }
        @Quick()
        class User extends QModel<IUser> { declare name: string; }

        const user = new User({ name: 'John', extra: 123 } as any);
        expect((user as any).extra).toBe(123);
    });

    test('should REJECT extra properties when strict: true', () => {
        interface IUser { name: string }
        // In Strict Mode, we MUST explicitly define properties since we can't infer them safely
        @Quick({ name: 'string' }, { strict: true })
        class StrictUser extends QModel<IUser> { 
            declare name: string; 
        }

        const action = () => {
             new StrictUser({ name: 'John', extra: 123 } as any);
        };

        expect(action).toThrow(QModelError);
        
        try {
            action();
        } catch (e: any) {
            expect(e.message).toContain("Strict Mode: Property 'extra' is not defined");
        }
    });

    test('should allow properties explicitly mapped in strict mode', () => {
         interface IUser { name: string; age: number }
         // Explicit mapping required for strict mode
         @Quick({ name: 'string', age: 'number' }, { strict: true })
         class User extends QModel<IUser> {
             declare name: string;
             declare age: number;
         }

         const user = new User({ name: 'John', age: 30 });
         expect(user.age).toBe(30);
    });
});
