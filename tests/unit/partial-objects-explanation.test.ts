/**
 * Test: ¿Qué son objetos parciales y cómo afectan la inferencia?
 */

import { describe, test } from 'bun:test';
import { QModel, QType } from '../../src/quick.model';

// ============================================================================
// Models
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

interface IProfile {
  id: string;
  bio: string;
}

class Profile extends QModel<IProfile> {
  @QType() id!: string;
  @QType() bio!: string;
}

// ============================================================================
// Tests
// ============================================================================

describe('Objetos parciales y inferencia', () => {
  
  test('Ejemplo 1: Objeto completo vs parcial', () => {
    console.log('\n=== OBJETO COMPLETO VS PARCIAL ===\n');
    
    // Objeto COMPLETO - tiene todas las propiedades
    const completo = {
      id: '1',
      name: 'John',
      email: 'john@test.com'
    };
    
    console.log('Objeto completo:', completo);
    console.log('Keys:', Object.keys(completo).sort()); // ['email', 'id', 'name']
    console.log('Firma:', Object.keys(completo).sort().join(',')); // 'email,id,name'
    console.log('✅ Puedo buscar en registro: "email,id,name" → User\n');
    
    // Objeto PARCIAL - solo tiene algunas propiedades
    const parcial = {
      id: '1',
      name: 'John'
      // ❌ Falta 'email'
    };
    
    console.log('Objeto parcial:', parcial);
    console.log('Keys:', Object.keys(parcial).sort()); // ['id', 'name']
    console.log('Firma:', Object.keys(parcial).sort().join(',')); // 'id,name'
    console.log('❌ Busco en registro: "id,name" → NOT FOUND');
    console.log('   (El registro tiene "email,id,name", no "id,name")\n');
  });

  test('Ejemplo 2: Ambigüedad con propiedades compartidas', () => {
    console.log('\n=== AMBIGÜEDAD ===\n');
    
    // Crear registro simulado
    const registry = new Map<string, any>();
    registry.set('email,id,name', User);
    registry.set('bio,id', Profile);
    
    console.log('Modelos registrados:');
    console.log('  User:    email,id,name');
    console.log('  Profile: bio,id\n');
    
    // Caso 1: Solo propiedad 'id'
    const soloId = { id: '1' };
    console.log('Objeto:', soloId);
    console.log('Firma: "id"');
    console.log('❌ ¿Es User? (le falta email,name)');
    console.log('❌ ¿Es Profile? (le falta bio)');
    console.log('→ AMBIGUO: No sabemos cuál es\n');
    
    // Caso 2: Propiedades 'id,name'
    const idName = { id: '1', name: 'John' };
    console.log('Objeto:', idName);
    console.log('Firma: "id,name"');
    console.log('❌ ¿Es User? (le falta email)');
    console.log('❌ ¿Es Profile? (tiene "name" que Profile no tiene)');
    console.log('→ AMBIGUO: Podría ser User parcial\n');
  });

  test('Ejemplo 3: Casos reales de objetos parciales', () => {
    console.log('\n=== CASOS REALES ===\n');
    
    console.log('1. Respuesta de API con campos opcionales:');
    console.log('   { id: "1", name: "John" }  ← email es opcional');
    console.log('   → Objeto parcial\n');
    
    console.log('2. Formulario parcialmente completado:');
    console.log('   { email: "john@test.com" }  ← id,name aún no ingresados');
    console.log('   → Objeto parcial\n');
    
    console.log('3. Projección de base de datos:');
    console.log('   SELECT id, name FROM users  ← No incluye email');
    console.log('   → Objeto parcial\n');
    
    console.log('4. Partial<IUser> en TypeScript:');
    console.log('   const update: Partial<IUser> = { name: "Jane" }');
    console.log('   → Objeto parcial\n');
  });

  test('¿Cuándo SÍ funciona la inferencia?', () => {
    console.log('\n=== INFERENCIA FUNCIONA ===\n');
    
    console.log('✅ Caso 1: Objeto tiene TODAS las propiedades requeridas');
    console.log('   { id: "1", name: "John", email: "..." }');
    console.log('   → Firma completa → Encuentra User\n');
    
    console.log('✅ Caso 2: Propiedades opcionales con defaults');
    console.log('   Interface: { id: string, name: string, email?: string }');
    console.log('   Objeto: { id: "1", name: "John" }  ← email es opcional');
    console.log('   Registro: "id,name" → User');
    console.log('   → Funciona si registramos solo las requeridas\n');
    
    console.log('✅ Caso 3: Modelos con firmas únicas');
    console.log('   User: { id, name, email }');
    console.log('   Profile: { id, bio }');
    console.log('   → No comparten todas las propiedades → Sin ambigüedad\n');
  });

  test('Estrategia para manejar parciales', () => {
    console.log('\n=== ESTRATEGIA ===\n');
    
    console.log('Opción 1: REGISTRO CON PROPIEDADES DECORADAS');
    console.log('  - Solo registrar propiedades con @QType()');
    console.log('  - Si User tiene @QType() en id, name, email');
    console.log('  - Registrar firma: "email,id,name"');
    console.log('  - Si objeto tiene esas 3 → Es User');
    console.log('  - Si objeto tiene menos → NO ES User (parcial)\n');
    
    console.log('Opción 2: SUBSET MATCHING (más flexible)');
    console.log('  - Buscar modelo cuyas propiedades sean SUBSET del objeto');
    console.log('  - Si objeto tiene: { id, name, email, extra }');
    console.log('  - User necesita: { id, name, email }');
    console.log('  - ✅ User es subset → Match');
    console.log('  - ⚠️  Problema: Múltiples matches posibles\n');
    
    console.log('Opción 3: FALLBACK A @QType(ModelClass)');
    console.log('  - Intentar inferencia exacta (todas las propiedades)');
    console.log('  - Si falla, requerir @QType(User)');
    console.log('  - ✅ 100% preciso');
    console.log('  - ✅ Funciona para mayoría sin especificar');
    console.log('  - ✅ Fallback para casos edge\n');
  });

  test('RECOMENDACIÓN FINAL', () => {
    console.log('\n=== RECOMENDACIÓN ===\n');
    console.log(`
Implementar inferencia con estas reglas:

1. Arrays vacíos:
   → No intentar inferir, devolver array vacío []

2. Arrays con elementos completos:
   → Inferir por firma exacta de propiedades
   → Si objeto tiene { id, name, email }
   → Buscar modelo con firma "email,id,name"
   → ✅ Funciona en 95% de casos

3. Arrays con elementos parciales:
   → La inferencia exacta fallará
   → Lanzar error descriptivo:
     "Cannot infer model for array. Expected object with 
      properties [email,id,name] but got [id,name].
      Use @QType(User) to specify the model explicitly."
   → Usuario agrega @QType(User) → Problema resuelto

4. Override explícito:
   → Si hay @QType(User), SIEMPRE usarlo
   → Ignora inferencia
   → Funciona con objetos parciales

Ventajas:
✅ Funciona automáticamente para casos comunes
✅ Errores claros para casos edge
✅ Fallback explícito con @QType(User)
✅ 100% confiable cuando se necesita
    `);
  });
});
