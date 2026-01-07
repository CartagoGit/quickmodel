/**
 * Test: ¿Por qué User funciona pero User[] no?
 * 
 * Demostrar que SI podemos inferir el tipo inspeccionando el array en runtime
 */

import { describe, test, expect } from 'bun:test';
import { QModel, QType } from '../../src/quick.model';

// ============================================================================
// Models
// ============================================================================

interface IUser {
  id: string;
  name: string;
}

class User extends QModel<IUser> {
  @QType() id!: string;
  @QType() name!: string;
}

interface ITag {
  code: string;
  label: string;
}

class Tag extends QModel<ITag> {
  @QType() code!: string;
  @QType() label!: string;
}

// ============================================================================
// Test Model
// ============================================================================

interface IContainer {
  singleUser: IUser;    // Funciona automáticamente
  multiUsers: IUser[];  // ¿Por qué no funciona?
}

class Container extends QModel<IContainer> {
  @QType() singleUser!: User;   // ✅ Funciona
  @QType() multiUsers!: User[];  // ❌ No funciona sin @QType(User)
}

// ============================================================================
// Tests
// ============================================================================

describe('¿Por qué User funciona pero User[] no?', () => {
  
  test('Verificar metadata emitida', () => {
    console.log('\n=== METADATA ===\n');
    
    const singleMeta = Reflect.getMetadata('design:type', Container.prototype, 'singleUser');
    const multiMeta = Reflect.getMetadata('design:type', Container.prototype, 'multiUsers');
    
    console.log('singleUser design:type:', singleMeta?.name);  // User
    console.log('multiUsers design:type:', multiMeta?.name);   // Array
    
    console.log('\n❌ TypeScript NO emite el tipo del elemento del array');
    console.log('   Solo dice "Array" pero no "Array de qué"');
    console.log('\n');
  });

  test('PERO... podríamos inferir analizando el contenido en runtime', () => {
    console.log('\n=== INFERENCIA EN RUNTIME ===\n');
    
    // Datos de ejemplo
    const data = {
      singleUser: { id: '1', name: 'John' },
      multiUsers: [
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ],
    };
    
    // Para singleUser, vemos design:type = User y lo usamos
    const singleType = Reflect.getMetadata('design:type', Container.prototype, 'singleUser');
    console.log('singleUser: design:type =', singleType.name);
    console.log('  → Sabemos que es User, lo deserializamos como User ✅\n');
    
    // Para multiUsers, vemos design:type = Array
    const multiType = Reflect.getMetadata('design:type', Container.prototype, 'multiUsers');
    console.log('multiUsers: design:type =', multiType.name);
    console.log('  → Solo sabemos que es Array... ❌');
    console.log('  → PERO miramos el contenido:', data.multiUsers[0]);
    console.log('  → Tiene propiedades:', Object.keys(data.multiUsers[0]!));
    console.log('  → ¿Qué modelo tiene { id, name }?');
    
    // Simular búsqueda en registro
    const foundModel = findModelByProperties(['id', 'name']);
    console.log('  → Encontrado:', foundModel?.name || 'N/A');
    console.log('  → ¡Podríamos deserializar como User! ✅\n');
  });

  test('El problema: TypeScript borra el tipo del array', () => {
    console.log('\n=== EL PROBLEMA ===\n');
    console.log(`
TypeScript en compile-time:
  multiUsers: User[]  ← El compilador SABE que es User[]

Pero al emitir metadata:
  Reflect.defineMetadata('design:type', Array, ...)  ← Solo "Array"

¿Por qué?
  Porque JavaScript no tiene tipos genéricos en runtime.
  Array<User> se convierte simplemente en Array.

Solución compile-time:
  TypeScript transformer que capture el tipo del elemento

Solución runtime:
  Inferir el tipo analizando el contenido del array
    `);
  });

  test('DEMO: Inferencia runtime funcionaría así', () => {
    console.log('\n=== DEMO DE INFERENCIA ===\n');
    
    // Crear un registro simulado
    const modelRegistry = new Map<string, new (data: any) => any>();
    modelRegistry.set('id,name', User);
    modelRegistry.set('code,label', Tag);
    
    function inferModelFromArray(arr: any[]): (new (data: any) => any) | null {
      if (!arr.length) return null;
      
      const firstElement = arr[0];
      if (typeof firstElement !== 'object' || firstElement === null) return null;
      
      const signature = Object.keys(firstElement).sort().join(',');
      const model = modelRegistry.get(signature);
      
      console.log('Array con', arr.length, 'elementos');
      console.log('Primer elemento keys:', signature);
      console.log('Modelo inferido:', model?.name || 'NOT FOUND');
      
      return model || null;
    }
    
    // Test con datos de User
    const userData = [
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' },
    ];
    const userModel = inferModelFromArray(userData);
    console.log('✅ Inferido:', userModel?.name, '\n');
    
    // Test con datos de Tag
    const tagData = [
      { code: 'A', label: 'Alpha' },
      { code: 'B', label: 'Beta' },
    ];
    const tagModel = inferModelFromArray(tagData);
    console.log('✅ Inferido:', tagModel?.name, '\n');
    
    expect(userModel).toBe(User);
    expect(tagModel).toBe(Tag);
  });

  test('¡LA INFERENCIA FUNCIONA! Solo necesitamos implementarla', () => {
    console.log('\n=== CONCLUSIÓN ===\n');
    console.log(`
¿Por qué User funciona?
  → TypeScript emite: design:type = User
  → Deserializador usa User para deserializar

¿Por qué User[] no funciona?
  → TypeScript emite: design:type = Array (sin tipo de elemento)
  → Deserializador no sabe qué tipo usar

¿SOLUCIÓN?
  1. Detectar que es Array (design:type = Array)
  2. Mirar el primer elemento del array
  3. Analizar sus propiedades (keys)
  4. Buscar en registro qué modelo tiene esas keys
  5. Deserializar todos los elementos con ese modelo

✅ NO necesita transformer
✅ NO necesita @QType(User)
✅ Funciona en runtime
⚠️  Requiere que el array tenga al menos 1 elemento
⚠️  Requiere que todos los elementos tengan las mismas keys

Para hacer esto 100% robusto:
  - Permitir @QType(User) como override
  - Si hay @QType(User), usarlo
  - Si no, intentar inferir
  - Si falla, lanzar error descriptivo
    `);
  });
});

// Helper simulado
function findModelByProperties(keys: string[]): typeof QModel | null {
  const signature = keys.sort().join(',');
  const registry = new Map<string, typeof QModel>();
  registry.set('id,name', User as typeof QModel);
  registry.set('code,label', Tag as typeof QModel);
  return registry.get(signature) || null;
}
