/**
 * @QType() Decorator - Ejemplo 5: Control Fino y Casos Especiales
 * 
 * Demuestra cuándo y por qué usar @QType() en lugar de @Quick(),
 * mostrando escenarios donde el control explícito es necesario.
 */

import { QModel, QType, Quick, QInterface } from '../../../quick.model';

// ============================================
// 1. DECORAR SOLO PROPIEDADES ESPECÍFICAS
// ============================================

interface IPartialModel {
  id: string;
  name: string;
  // Estas propiedades NO necesitan transformación
  count: number;
  active: boolean;
  // Pero esta sí necesita transformación
  createdAt: Date;
}

class PartialModel extends QModel<IPartialModel> implements QInterface<IPartialModel> {
  // Sin @QType() - no necesita transformación
  id!: string;
  name!: string;
  count!: number;
  active!: boolean;

  // Solo esta necesita @QType() para manejar Date
  @QType()
  declare createdAt: Date;
}

const partial = new PartialModel({
  id: 'partial-001',
  name: 'Optimized Model',
  count: 42,
  active: true,
  createdAt: new Date('2024-01-15')
});

console.log('\n=== EJEMPLO 1: Decoración Selectiva ===\n');
console.log('Modelo parcial:', partial);
console.log('Solo createdAt usa @QType()');
console.log('createdAt es Date?:', partial.createdAt instanceof Date ? '✅' : '❌');

// Ventaja: Menos overhead de metadata
console.log('\nVentaja:');
console.log('  ✅ Menos metadata en reflexión');
console.log('  ✅ Más eficiente si solo algunas propiedades necesitan transformación');
console.log('  ✅ Control explícito sobre qué se transforma');

// ============================================
// 2. COMPATIBILIDAD CON CONFIGURACIONES LEGACY
// ============================================

console.log('\n=== EJEMPLO 2: Compatibilidad ===\n');
console.log('@QType() funciona en CUALQUIER configuración de TypeScript:');
console.log('  ✅ useDefineForClassFields: true');
console.log('  ✅ useDefineForClassFields: false');
console.log('  ✅ target: ES2020, ES2021, ES2022, ESNext');
console.log('  ✅ No requiere decoradores de clase');
console.log('  ✅ Compatible con Babel, esbuild, swc');

console.log('\n@Quick() requiere:');
console.log('  ⚠️  useDefineForClassFields: true (o runtime compatible)');
console.log('  ⚠️  Sintaxis declare en propiedades');
console.log('  ⚠️  Decoradores de clase habilitados');

// ============================================
// 3. MEZCLANDO @Quick() Y @QType()
// ============================================

interface IHybridModel {
  // Propiedades simples - @Quick() las maneja
  id: string;
  name: string;
  age: number;
  // Arrays de modelos - requieren @QType() explícito
  tags: ITag[];
}

interface ITag {
  id: string;
  name: string;
  color: string;
}

class Tag extends QModel<ITag> implements QInterface<ITag> {
  @QType()
  declare id: string;

  @QType()
  declare name: string;

  @QType()
  declare color: string;
}

@Quick()
class HybridModel extends QModel<IHybridModel> implements QInterface<IHybridModel> {
  // @Quick() maneja estas automáticamente
  declare id: string;
  declare name: string;
  declare age: number;

  // Pero arrays de modelos SIEMPRE necesitan @QType() explícito
  @QType(Tag)
  declare tags: Tag[];
}

const hybrid = new HybridModel({
  id: 'hybrid-001',
  name: 'Mixed Approach',
  age: 25,
  tags: [
    { id: 'tag-001', name: 'typescript', color: '#3178c6' },
    { id: 'tag-002', name: 'decorators', color: '#f7df1e' },
    { id: 'tag-003', name: 'quickmodel', color: '#61dafb' }
  ]
});

console.log('\n=== EJEMPLO 3: Enfoque Híbrido ===\n');
console.log('Modelo híbrido:', hybrid);
console.log('Tags:', hybrid.tags.map(t => t.name).join(', '));
console.log('\nVerificación:');
hybrid.tags.forEach((tag, i) => {
  console.log(`  Tag ${i + 1}: ${tag.name}`);
  console.log(`    Es Tag?: ${tag instanceof Tag ? '✅' : '❌'}`);
  console.log(`    Color: ${tag.color}`);
});

// ============================================
// 4. MODELOS CON PROPIEDADES OPCIONALES
// ============================================

interface IOptionalModel {
  id: string;
  name: string;
  email?: string;  // Opcional
  phone?: string;  // Opcional
  lastLogin?: Date;  // Opcional
  settings?: Map<string, any>;  // Opcional
}

class OptionalModel extends QModel<IOptionalModel> implements QInterface<IOptionalModel> {
  @QType()
  declare id: string;

  @QType()
  declare name: string;

  @QType()
  declare email?: string;

  @QType()
  declare phone?: string;

  @QType()
  declare lastLogin?: Date;

  @QType()
  declare settings?: Map<string, any>;
}

// Crear con todas las propiedades
const fullOptional = new OptionalModel({
  id: 'opt-001',
  name: 'Full User',
  email: 'full@example.com',
  phone: '+34 123 456 789',
  lastLogin: new Date(),
  settings: new Map([['theme', 'dark'], ['lang', 'es']])
});

// Crear solo con propiedades requeridas
const minimalOptional = new OptionalModel({
  id: 'opt-002',
  name: 'Minimal User'
});

console.log('\n=== EJEMPLO 4: Propiedades Opcionales ===\n');
console.log('Usuario completo:', fullOptional);
console.log('email:', fullOptional.email);
console.log('lastLogin:', fullOptional.lastLogin?.toISOString());
console.log('settings.get("theme"):', fullOptional.settings?.get('theme'));

console.log('\nUsuario mínimo:', minimalOptional);
console.log('email:', minimalOptional.email || '(no definido)');
console.log('lastLogin:', minimalOptional.lastLogin || '(no definido)');
console.log('settings:', minimalOptional.settings || '(no definido)');

// Serializar ambos
const fullData = fullOptional.toInterface();
const minimalData = minimalOptional.toInterface();

console.log('\nDatos serializados (full):', Object.keys(fullData));
console.log('Datos serializados (minimal):', Object.keys(minimalData));

// ============================================
// 5. CUÁNDO USAR @QType() VS @Quick()
// ============================================

console.log('\n=== EJEMPLO 5: Guía de Decisión ===\n');

console.log('USA @QType() CUANDO:');
console.log('  ✅ Solo algunas propiedades necesitan transformación');
console.log('  ✅ Necesitas compatibilidad máxima con diferentes configuraciones');
console.log('  ✅ Trabajas con código legacy que no puede cambiar');
console.log('  ✅ Quieres control explícito sobre cada propiedad');
console.log('  ✅ El modelo tiene pocas propiedades (< 5)');
console.log('  ✅ Necesitas mezclar propiedades decoradas y no decoradas');

console.log('\nUSA @Quick() CUANDO:');
console.log('  ✅ Todas las propiedades necesitan transformación');
console.log('  ✅ El modelo tiene muchas propiedades (> 10)');
console.log('  ✅ Quieres código más limpio y menos repetitivo');
console.log('  ✅ Puedes usar useDefineForClassFields: true');
console.log('  ✅ No tienes restricciones de configuración');
console.log('  ✅ Prefieres convención sobre configuración');

console.log('\nUSA AMBOS CUANDO:');
console.log('  ✅ @Quick() para propiedades simples');
console.log('  ✅ @QType(ModelClass) para arrays de modelos');
console.log('  ✅ Quieres lo mejor de ambos mundos');

// ============================================
// 6. EJEMPLO COMPARATIVO FINAL
// ============================================

// Con @QType() (verboso pero explícito)
interface IVerboseModel {
  id: string;
  name: string;
  email: string;
  age: number;
  createdAt: Date;
  updatedAt: Date;
}

class VerboseModel extends QModel<IVerboseModel> implements QInterface<IVerboseModel> {
  @QType()
  declare id: string;

  @QType()
  declare name: string;

  @QType()
  declare email: string;

  @QType()
  declare age: number;

  @QType()
  declare createdAt: Date;

  @QType()
  declare updatedAt: Date;
}

// Con @Quick() (limpio y conciso)
interface ICleanModel {
  id: string;
  name: string;
  email: string;
  age: number;
  createdAt: Date;
  updatedAt: Date;
}

@Quick()
class CleanModel extends QModel<ICleanModel> implements QInterface<ICleanModel> {
  declare id: string;
  declare name: string;
  declare email: string;
  declare age: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

const verboseData = {
  id: 'user-001',
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  createdAt: new Date(),
  updatedAt: new Date()
};

const verbose = new VerboseModel(verboseData);
const clean = new CleanModel(verboseData);

console.log('\n=== EJEMPLO 6: Comparación ===\n');
console.log('VerboseModel (con @QType()):', verbose.name);
console.log('  Líneas de decoradores: 6');
console.log('  Caracteres extra: ~60');

console.log('\nCleanModel (con @Quick()):', clean.name);
console.log('  Líneas de decoradores: 1 (en la clase)');
console.log('  Caracteres ahorrados: ~60');
console.log('  Reducción de código: ~90%');

console.log('\nAmbos modelos funcionan igual:');
console.log('  verbose.createdAt es Date?:', verbose.createdAt instanceof Date ? '✅' : '❌');
console.log('  clean.createdAt es Date?:', clean.createdAt instanceof Date ? '✅' : '❌');

console.log('\n✨ Conclusión:');
console.log('  @QType() = Control explícito y máxima compatibilidad');
console.log('  @Quick() = Código limpio y máxima productividad');
console.log('  Ambos = Flexibilidad para cualquier escenario');

export { 
  PartialModel, Tag, HybridModel, OptionalModel, VerboseModel, CleanModel
};
