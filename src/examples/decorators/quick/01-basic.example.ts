/**
 * @Quick() Decorator - Ejemplo 1: Básico
 * 
 * Demuestra el uso más simple de @Quick() para eliminar la necesidad
 * de decorar cada propiedad con @QType().
 */

import { QModel, Quick, QInterface } from '../../../quick.model';

// ============================================
// 1. EJEMPLO BÁSICO
// ============================================

interface IUser {
  id: string;
  name: string;
  email: string;
  age: number;
  active: boolean;
}

/**
 * ✅ CON @Quick() - Limpio y conciso
 * 
 * Las propiedades usan 'declare' porque son inicializadas
 * externamente por QModel (en el método initialize()).
 */
@Quick()
class User extends QModel<IUser> implements QInterface<IUser> {
  declare id: string;
  declare name: string;
  declare email: string;
  declare age: number;
  declare active: boolean;
}

// Uso
const user = new User({
  id: '123',
  name: 'Alice Johnson',
  email: 'alice@example.com',
  age: 30,
  active: true
});

console.log('\n=== EJEMPLO 1: Uso Básico de @Quick() ===\n');
console.log('Usuario creado:', user);
console.log('ID:', user.id);
console.log('Nombre:', user.name);
console.log('Email:', user.email);
console.log('Edad:', user.age);
console.log('Activo:', user.active);

// Serialización
const serialized = user.toInterface();
console.log('\nSerializado:', serialized);

// Clonación
const cloned = user.clone();
console.log('\nClonado:', cloned);
console.log('¿Es instancia de User?:', cloned instanceof User);

/**
 * COMPARACIÓN: Sin @Quick() vs Con @Quick()
 */

// ❌ SIN @Quick() - Repetitivo y verboso
/*
class UserManual extends QModel<IUser> implements QInterface<IUser> {
  @QType() declare id: string;
  @QType() declare name: string;
  @QType() declare email: string;
  @QType() declare age: number;
  @QType() declare active: boolean;
}
*/

// ✅ CON @Quick() - Una sola línea de decorador
// ¡5 propiedades registradas automáticamente!

export { User };
