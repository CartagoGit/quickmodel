/**
 * Tests for arrays of nested models WITH auto-inference
 * 
 * Testing automatic type inference when we don't explicitly specify @QType(ModelClass)
 * 
 * NEW BEHAVIOR (with auto-inference):
 * - @QType() employees!: User[] → Automatically infers User from object properties
 * - No need to specify @QType(User) unless inference fails
 */

import { describe, test, expect } from 'bun:test';
import { QModel, QType, QInterface } from '../../src/quick.model';

// ============================================================================
// Test Models
// ============================================================================

interface IUser {
  id: string;
  name: string;
  email: string;
}

class User extends QModel<IUser> {
  @QType() id!: string;
  @QType() name!: string;
  @QType() email!: string;
}

interface ICompanyNoType {
  id: string;
  name: string;
  employees: IUser[];
}

type CompanyNoTypeTransforms = {
  employees: User[];
};

// ❌ WITHOUT @QType(User) - using just @QType()
class CompanyNoType extends QModel<ICompanyNoType> implements QInterface<ICompanyNoType, CompanyNoTypeTransforms> {
  @QType() id!: string;
  @QType() name!: string;
  @QType() employees!: User[];  // 👈 No especificamos User en @QType()
}

// ❌ WITHOUT any @QType() on array
class CompanyNoDecorator extends QModel<ICompanyNoType> implements QInterface<ICompanyNoType, CompanyNoTypeTransforms> {
  @QType() id!: string;
  @QType() name!: string;
  employees!: User[];  // 👈 Sin @QType() en absoluto
}

// ============================================================================
// Tests
// ============================================================================

describe('Arrays WITHOUT @QType(ModelClass)', () => {
  
  const testData: ICompanyNoType = {
    id: 'comp-1',
    name: 'TechCorp',
    employees: [
      { id: '1', name: 'Alice', email: 'alice@tech.com' },
      { id: '2', name: 'Bob', email: 'bob@tech.com' },
    ],
  };

  describe('With @QType() but no Model specified (AUTO-INFERENCE)', () => {
    
    test('should automatically infer User instances from object properties', () => {
      const company = new CompanyNoType(testData);

      expect(company.id).toBe('comp-1');
      expect(company.name).toBe('TechCorp');
      expect(company.employees).toBeInstanceOf(Array);
      expect(company.employees.length).toBe(2);
      
      // ✅ Now automatically creates User instances via inference
      expect(company.employees[0]).toBeInstanceOf(User);
      expect(company.employees[0]!.id).toBe('1');
      expect(company.employees[0]!.name).toBe('Alice');
      expect(company.employees[0]!.email).toBe('alice@tech.com');
    });

    test('should serialize correctly', () => {
      const company = new CompanyNoType(testData);
      const serialized = company.toInterface();

      expect(serialized).toEqual(testData);
    });
  });

  describe('Without @QType() at all', () => {
    
    test('should NOT initialize the property', () => {
      const company = new CompanyNoDecorator(testData);

      expect(company.id).toBe('comp-1');
      expect(company.name).toBe('TechCorp');
      
      // ❌ Sin @QType(), la propiedad no se deserializa
      expect(company.employees).toBeUndefined();
    });
  });

  describe('TypeScript metadata check', () => {
    
    test('verify metadata emitted for array property', () => {
      const metadata = Reflect.getMetadata('design:type', CompanyNoType.prototype, 'employees');
      
      console.log('Metadata for employees array:', metadata);
      console.log('Metadata name:', metadata?.name);
      console.log('Is Array?', metadata === Array);
      
      // TypeScript emite Array, pero NO User
      expect(metadata).toBe(Array);
    });
  });
});
