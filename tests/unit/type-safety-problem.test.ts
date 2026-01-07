/**
 * Test: Problema de type safety en QModel
 */

import { QModel, QType } from '../../src/quick.model';

interface IUser {
  id: string;
  name: string;
  age: number;
}

class User extends QModel<IUser> {
  @QType() id!: string;
  @QType() name!: string;
  @QType() age!: number;
}

// ❌ PROBLEMA: Esto NO da error de TypeScript
const user = new User({
  id: '1',
  name: 'John',
  age: 'WRONG TYPE' as any,  // Debería dar error!
  extraField: 'not in interface',  // Debería dar error!
});

// ❌ PROBLEMA: Puedo asignar cualquier cosa
(user as any).id = 123;  // Debería ser string
(user as any).age = 'string';  // Debería ser number

console.log('user:', user);
