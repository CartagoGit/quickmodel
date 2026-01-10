
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

interface IUser {
    name?: string;
    role?: string;
}

@Quick()
class User extends QModel<IUser> {
    
    // Default value assigned at property declaration
    name: string = 'Anonymous';
    
    // Default value via explicit assignment
    role: string = 'User';
}

describe('Reproduction: Default Values behavior', () => {
    test('should preserve default values when initialized with empty object', () => {
        const user = new User({});
        console.log('User(empty):', user);
        expect(user.name).toBe('Anonymous');
        expect(user.role).toBe('User');
    });

    test('should preserve default values when initialized with undefined property', () => {
        const user = new User({ name: undefined, role: undefined });
        console.log('User(undefined):', user);
        expect(user.name).toBe('Anonymous');
        expect(user.role).toBe('User');
    });
});
