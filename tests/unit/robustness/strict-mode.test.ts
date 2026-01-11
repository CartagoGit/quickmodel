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
        @Quick({}, { strict: true })
        class StrictUser extends QModel<IUser> { 
            declare name: string; 
        }

        expect(() => {
            new StrictUser({ name: 'John', extra: 123 } as any);
        }).toThrow(QModelError);
        
        try {
            new StrictUser({ name: 'John', extra: 123 } as any);
        } catch (e: any) {
            expect(e.message).toContain("Strict Mode: Property 'extra' is not defined");
        }
    });

    test('should allow properties defined via declare in strict mode', () => {
         interface IUser { name: string; age: number }
         @Quick({}, { strict: true })
         class User extends QModel<IUser> {
             declare name: string;
             // age is in interface but maybe not decorated?
             // If we use declare, it might imply existence on instance/prototype?
             // Actually, 'declare' is TS only. At runtime, it doesn't exist until assigned.
             // But @Quick captures design:type!
             declare age: number;
         }

         const user = new User({ name: 'John', age: 30 });
         expect(user.age).toBe(30);
    });
});
