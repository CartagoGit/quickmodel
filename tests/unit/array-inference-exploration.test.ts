/**
 * Test: Explorar detección automática de arrays de modelos
 * 
 * Ideas para detectar el tipo sin @QType(ModelClass):
 * 1. Inferencia por propiedades del objeto
 * 2. Registro de modelos por "firma" de propiedades
 * 3. Análisis estático en tiempo de compilación
 */

import { describe, test, expect } from 'bun:test';
import { QModel, QType } from '../../src/quick.model';

// ============================================================================
// Models
// ============================================================================

interface ITag {
  id: string;
  name: string;
}

class Tag extends QModel<ITag> {
  @QType() id!: string;
  @QType() name!: string;
}

interface ICategory {
  id: string;
  title: string;
  description: string;
}

class Category extends QModel<ICategory> {
  @QType() id!: string;
  @QType() title!: string;
  @QType() description!: string;
}

interface IUser {
  name: string;
  email: string;
}

class User extends QModel<IUser> {
  @QType() name!: string;
  @QType() email!: string;
}

// ============================================================================
// Test: ¿Podemos inferir el modelo por sus propiedades?
// ============================================================================

describe('Inferencia de modelos en arrays', () => {
  
  test('Analizar estructura de objetos en arrays', () => {
    const tagData = { id: '1', name: 'test' };
    const categoryData = { id: '1', title: 'test', description: 'desc' };
    const userData = { name: 'John', email: 'john@test.com' };
    
    console.log('\n=== PROPIEDADES DE OBJETOS ===\n');
    
    console.log('Tag keys:', Object.keys(tagData).sort());
    console.log('Category keys:', Object.keys(categoryData).sort());
    console.log('User keys:', Object.keys(userData).sort());
    
    console.log('\n=== PROPIEDADES REGISTRADAS EN MODELOS ===\n');
    
    // ¿Podemos obtener las propiedades decoradas de cada modelo?
    const tagProps = Reflect.getMetadata('fieldKeys', Tag.prototype) || [];
    const categoryProps = Reflect.getMetadata('fieldKeys', Category.prototype) || [];
    const userProps = Reflect.getMetadata('fieldKeys', User.prototype) || [];
    
    console.log('Tag registered props:', tagProps);
    console.log('Category registered props:', categoryProps);
    console.log('User registered props:', userProps);
    
    console.log('\n');
  });

  test('¿Podemos iterar las propiedades decoradas?', () => {
    console.log('\n=== METADATA DISPONIBLE EN Tag ===\n');
    
    // Intentar diferentes formas de obtener las propiedades
    const prototype = Tag.prototype;
    
    // 1. Object.keys no funciona (no enumerable)
    console.log('Object.keys(prototype):', Object.keys(prototype));
    
    // 2. Object.getOwnPropertyNames
    console.log('Object.getOwnPropertyNames(prototype):', Object.getOwnPropertyNames(prototype));
    
    // 3. Iterar todas las metadata keys
    const metadataKeys = Reflect.getMetadataKeys(prototype);
    console.log('All metadata keys:', metadataKeys);
    
    // 4. Verificar si hay metadata 'design:type' para propiedades conocidas
    const knownProps = ['id', 'name'];
    console.log('\nMetadata para propiedades conocidas:');
    knownProps.forEach(prop => {
      const designType = Reflect.getMetadata('design:type', prototype, prop);
      const fieldType = Reflect.getMetadata('fieldType', prototype, prop);
      console.log(`  ${prop}: design:type=${designType?.name}, fieldType=${fieldType}`);
    });
    
    console.log('\n');
  });

  test('IDEA: Registrar modelos con sus propiedades características', () => {
    console.log('\n=== IDEA: REGISTRO DE MODELOS ===\n');
    
    // Podríamos crear un registro que mapee "firmas" a clases:
    // { "id,name" -> Tag }
    // { "id,title,description" -> Category }
    // { "name,email" -> User }
    
    const modelRegistry = new Map<string, typeof QModel>();
    
    // Función helper para registrar un modelo
    function registerModel(modelClass: typeof QModel, sampleKeys: string[]) {
      const signature = sampleKeys.sort().join(',');
      modelRegistry.set(signature, modelClass);
      console.log(`Registered ${modelClass.name} with signature: ${signature}`);
    }
    
    // Registrar modelos
    registerModel(Tag as typeof QModel, ['id', 'name']);
    registerModel(Category as typeof QModel, ['id', 'title', 'description']);
    registerModel(User as typeof QModel, ['name', 'email']);
    
    console.log('\n=== PRUEBA DE INFERENCIA ===\n');
    
    // Ahora intentar inferir el modelo por las keys del objeto
    function inferModel(obj: any): typeof QModel | null {
      const signature = Object.keys(obj).sort().join(',');
      const modelClass = modelRegistry.get(signature);
      console.log(`Object with keys [${signature}] -> ${modelClass?.name || 'NOT FOUND'}`);
      return modelClass || null;
    }
    
    inferModel({ id: '1', name: 'test' }); // -> Tag
    inferModel({ id: '1', title: 'test', description: 'desc' }); // -> Category
    inferModel({ name: 'John', email: 'john@test.com' }); // -> User
    inferModel({ unknown: 'property' }); // -> null
    
    console.log('\n✅ La inferencia por propiedades ES POSIBLE!\n');
  });

  test('PROBLEMA: Objetos con propiedades subset', () => {
    console.log('\n=== PROBLEMA CON SUBSETS ===\n');
    
    // ¿Qué pasa si un objeto tiene solo ALGUNAS propiedades?
    const partial = { id: '1' }; // Tiene 'id' pero no 'name'
    
    console.log('Objeto parcial:', partial);
    console.log('Keys:', Object.keys(partial));
    console.log('¿Es un Tag válido? No, le falta "name"');
    console.log('¿Es una Category válida? No, le falta "title" y "description"');
    
    console.log('\n❌ La inferencia simple NO funciona con objetos parciales\n');
  });

  test('LIMITACIÓN: TypeScript no guarda metadata de propiedades decoradas', () => {
    console.log('\n=== VERIFICACIÓN FINAL ===\n');
    
    // TypeScript NO guarda automáticamente una lista de propiedades decoradas
    // Tendríamos que hacerlo manualmente en el decorator @QType()
    
    const allMetadata = Reflect.getMetadataKeys(Tag.prototype);
    console.log('Metadata keys en Tag.prototype:', allMetadata);
    
    // Verificar metadata específica de propiedades
    const id_metadata = Reflect.getMetadataKeys(Tag.prototype, 'id');
    const name_metadata = Reflect.getMetadataKeys(Tag.prototype, 'name');
    
    console.log('\nMetadata en Tag.prototype.id:', id_metadata);
    console.log('Metadata en Tag.prototype.name:', name_metadata);
    
    console.log('\n');
  });
});

// ============================================================================
// Posibles soluciones
// ============================================================================

describe('Posibles soluciones', () => {
  
  test('Solución 1: Modificar @QType() para registrar propiedades', () => {
    console.log('\n=== SOLUCIÓN 1: REGISTRO EN DECORATOR ===\n');
    console.log(`
El decorator @QType() podría:
1. Obtener la lista actual de propiedades: Reflect.getMetadata('fieldKeys', target) || []
2. Agregar la propiedad actual a la lista: [...list, propertyKey]
3. Guardar la lista actualizada: Reflect.defineMetadata('fieldKeys', newList, target)

Luego al deserializar:
1. Obtener keys del objeto: Object.keys(data)
2. Buscar en un registro global qué modelo tiene esas keys
3. Deserializar usando ese modelo

✅ FACTIBLE pero requiere un registro global de modelos
    `);
  });

  test('Solución 2: Usar TypeScript transformer plugin', () => {
    console.log('\n=== SOLUCIÓN 2: TRANSFORMER PLUGIN ===\n');
    console.log(`
Un transformer plugin de TypeScript podría:
1. Analizar el código en tiempo de compilación
2. Detectar arrays tipados: tags: Tag[]
3. Agregar metadata adicional: Reflect.defineMetadata('arrayElementType', Tag, ...)

✅ MÁS POTENTE pero requiere configuración de build
⚠️  Complejidad adicional en setup
    `);
  });

  test('Solución 3: Aceptar limitación y requerir symbol', () => {
    console.log('\n=== SOLUCIÓN 3: STATUS QUO ===\n');
    console.log(`
Mantener el enfoque actual:

Arrays de primitivos:
  @QType() tags!: string[];  ✅ Funciona automáticamente

Arrays de modelos:
  @QType(Tag) tags!: Tag[];  ⚠️  Requiere especificar Tag

✅ SIMPLE y explícito
✅ No requiere configuración adicional
✅ El desarrollador sabe exactamente qué está pasando
    `);
  });
});
