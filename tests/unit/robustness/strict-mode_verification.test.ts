
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QType } from '@/core/decorators/qtype.decorator'; // Import from source as it's not exported in index

describe('Strict Mode Verification', () => {

    test('Strict Mode (Default): requires explicit decorators', () => {
        interface IUser {
            name: string;
        }

        @Quick() // Strict is now default!
        class User extends QModel<IUser> {
            @QType() // REQUIRED check in Strict Mode
            declare name: string; 
        }

        const user = User.create({ name: 'Test' });
        expect(user.name).toBe('Test');
    });

    test('Strict Mode (Default): throws on unknown properties', () => {
        interface IUser {
            name: string;
        }

        @Quick()
        class User extends QModel<IUser> {
            @QType()
            declare name: string;
        }

        // Extra property 'admin' should throw
        expect(() => {
             User.create({ name: 'Test', admin: true } as any);
        }).toThrow(/not defined in model/);
    });
});
