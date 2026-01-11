
import { describe, test, expect } from 'bun:test';
import { QModel } from '@/core/models/quick.model';
import { QType } from '@/core/decorators/qtype.decorator';
import { Quick } from '@/core/decorators/quick.decorator';

describe('Default Values Impact', () => {
    
    interface IUser {
        name: string;
        role?: string;
    }

    test('should overwrite constructor data if default value is assigned', () => {
        
        @Quick()
        class UserWithDefault extends QModel<IUser> {
            @QType(String)
            name: string = 'Default Name'; // Default value assigned

            @QType(String)
            role?: string; // No default
        }

        // We pass 'Alice' in the constructor
        const user = new UserWithDefault({ name: 'Alice', role: 'Admin' });

        // If the default value overwrites, name will be 'Default Name' instead of 'Alice'
        // This is generally UNDESIRABLE behavior for a model taking data
        console.log('User name:', user.name);

        // Expectation: IT WILL FAIL user expectation (it will return Default Name)
        expect(user.role).toBe('Admin');
        // This is what happens, but is it what we want?
        // Usually users expect constructor data to win.
        expect(user.name).toBe('Default Name'); // Confirms the "bug" / behavior
    });

    test('should only use default value if no data provided', () => {
         @Quick()
        class UserWithDefault extends QModel<IUser> {
            @QType(String)
            name: string = 'Default Name'; 
            
            declare role?: string; 
        }

        const emptyUser = new UserWithDefault({});
        expect(emptyUser.name).toBe('Default Name');
    });

});
