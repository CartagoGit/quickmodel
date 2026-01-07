/**
 * @QType() Decorator - Ejemplo 1: Uso Básico con Primitivos
 * 
 * Demuestra el uso explícito de @QType() para cada propiedad,
 * útil cuando necesitas control fino o tu configuración no 
 * soporta decoradores de clase.
 */

import { QModel, QType, QInterface } from '../../../quick.model';

// ============================================
// 1. MODELO BÁSICO CON @QType() EXPLÍCITO
// ============================================

interface IUser {
  id: string;
  username: string;
  email: string;
  age: number;
  isActive: boolean;
  createdAt: Date;
}

class User extends QModel<IUser> implements QInterface<IUser> {
  @QType()
  declare id: string;

  @QType()
  declare username: string;

  @QType()
  declare email: string;

  @QType()
  declare age: number;

  @QType()
  declare isActive: boolean;

  // Para tipos complejos como Date, especifica el tipo explícitamente
  @QType(Date)
  declare createdAt: Date;
}

// Crear usuario
const user = new User({
  id: 'user-001',
  username: 'johndoe',
  email: 'john@example.com',
  age: 30,
  isActive: true,
  createdAt: new Date('2024-01-15')
});

console.log('\n=== EJEMPLO 1: @QType() Básico ===\n');
console.log('Usuario:', user);
console.log('ID:', user.id);
console.log('Username:', user.username);
console.log('Email:', user.email);
console.log('Edad:', user.age);
console.log('Activo?:', user.isActive ? '✅' : '❌');
console.log('Creado:', user.createdAt.toLocaleDateString());

// Verificar tipos
console.log('\n¿Tipos correctos?');
console.log('  id es string?:', typeof user.id === 'string' ? '✅' : '❌');
console.log('  age es number?:', typeof user.age === 'number' ? '✅' : '❌');
console.log('  isActive es boolean?:', typeof user.isActive === 'boolean' ? '✅' : '❌');
console.log('  createdAt es Date?:', user.createdAt instanceof Date ? '✅' : '❌');

// ============================================
// 2. SERIALIZACIÓN Y DESERIALIZACIÓN
// ============================================

// Serializar a JSON
const json = user.toJSON();
console.log('\n=== Serialización ===\n');
console.log('JSON:', JSON.stringify(json, null, 2));

// Serializar a interface
const interfaceData = user.toInterface();
console.log('\nInterface:', interfaceData);
console.log('createdAt es string?:', typeof interfaceData.createdAt === 'string' ? '✅' : '❌');

// Deserializar desde interface
const restored = new User(interfaceData);
console.log('\n=== Deserialización ===\n');
console.log('Usuario restaurado:', restored);
console.log('createdAt es Date?:', restored.createdAt instanceof Date ? '✅' : '❌');

// Verificar si se necesita transformar manualmente
const isDateCorrect = restored.createdAt instanceof Date;
const areDatesEqual = isDateCorrect 
  ? restored.createdAt.getTime() === user.createdAt.getTime()
  : new Date(restored.createdAt as any).getTime() === user.createdAt.getTime();

console.log('Datos iguales?:', 
  restored.id === user.id &&
  restored.username === user.username &&
  restored.email === user.email &&
  restored.age === user.age &&
  restored.isActive === user.isActive &&
  areDatesEqual
    ? '✅' : '❌'
);

// ============================================
// 3. COMPARACIÓN CON @Quick()
// ============================================

console.log('\n=== @QType() vs @Quick() ===\n');
console.log('Ambos usan declare para consistencia:');
console.log('  @Quick(): declare property (automático)');
console.log('  @QType(): declare property (explícito)');
console.log('');
console.log('Ventajas de @QType():');
console.log('  ✅ Control explícito sobre cada propiedad');
console.log('  ✅ Especifica el tipo cuando es necesario: @QType(Date)');
console.log('  ✅ Ideal para modelos pequeños o propiedades selectivas');
console.log('  ✅ Más verboso pero más claro');
console.log('');
console.log('Cuándo usar @QType():');
console.log('  • Cuando quieres control fino sobre cada propiedad');
console.log('  • Cuando el modelo tiene pocas propiedades');
console.log('  • Cuando necesitas decorar solo algunas propiedades');

export { User };
