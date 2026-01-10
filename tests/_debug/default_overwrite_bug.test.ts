
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

interface IUser {
    name?: string;
}

@Quick()
class User extends QModel<IUser> {
    constructor(data: any) {
        console.log('User constructor start');
        super(data);
        console.log('User constructor end');
    }
    // Default value
    private _name: string = (() => { console.log('Initializing name default'); return 'Anonymous'; })();
    get name() { return this._name; }
    set name(v) { this._name = v; }
}

describe('CRITICAL: Debug Execution Order', () => {
   // ...
    test('should NOT overwrite provided value with default value', () => {
        const user = new User({ name: 'John' });
        console.log('User(John):', user);
        expect(user.name).toBe('John'); 
        // Failing expectation: It will probably be 'Anonymous'
    });
});
