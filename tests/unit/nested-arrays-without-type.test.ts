/**
 * Tests for arrays of nested models WITHOUT @QType(ModelClass)
 * 
 * Testing what happens when we don't specify the model class in @QType()
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

  describe('With @QType() but no Model specified', () => {
    
    test('should NOT create User instances (plain objects)', () => {
      const company = new CompanyNoType(testData);

      expect(company.id).toBe('comp-1');
      expect(company.name).toBe('TechCorp');
      expect(company.employees).toBeInstanceOf(Array);
      expect(company.employees.length).toBe(2);
      
      // ❌ Should be plain objects, NOT User instances
      expect(company.employees[0]).not.toBeInstanceOf(User);
      expect(typeof company.employees[0]).toBe('object');
      expect(company.employees[0]?.name).toBe('Alice');
    });

    test('should serialize correctly (plain objects already)', () => {
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
