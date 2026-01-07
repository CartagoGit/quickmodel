/**
 * @Quick() Decorator - Ejemplo 2: Tipos Complejos
 * 
 * Demuestra cómo @Quick() auto-detecta tipos complejos como
 * Date, BigInt, RegExp, Symbol, Map y Set.
 */

import { QModel, Quick, QInterface } from '../../../quick.model';

// ============================================
// 2. TIPOS COMPLEJOS AUTO-DETECTADOS
// ============================================

interface IPost {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  views: bigint;
  slug: RegExp;
  uid: symbol;
}

/**
 * @Quick() detecta automáticamente:
 * - Date: createdAt, updatedAt
 * - BigInt: views
 * - RegExp: slug
 * - Symbol: uid
 */
@Quick()
class Post extends QModel<IPost> implements QInterface<IPost> {
  declare id: string;
  declare title: string;
  declare content: string;
  declare createdAt: Date;      // ✅ Auto-detectado como Date
  declare updatedAt: Date;      // ✅ Auto-detectado como Date
  declare views: bigint;        // ✅ Auto-detectado como BigInt
  declare slug: RegExp;         // ✅ Auto-detectado como RegExp
  declare uid: symbol;          // ✅ Auto-detectado como Symbol
}

// Uso
const now = new Date('2024-01-15T10:30:00Z');
const sym = Symbol('post-uid');

const post = new Post({
  id: 'post-1',
  title: 'Introducción a @Quick()',
  content: 'El decorador @Quick() simplifica el código...',
  createdAt: now,
  updatedAt: now,
  views: 1000000n,
  slug: /^intro-quick$/i,
  uid: sym
});

console.log('\n=== EJEMPLO 2: Tipos Complejos con @Quick() ===\n');
console.log('Post creado:', post);
console.log('Fecha de creación:', post.createdAt instanceof Date ? '✅ Date' : '❌ No es Date');
console.log('Views (BigInt):', post.views, typeof post.views);
console.log('Slug (RegExp):', post.slug, post.slug instanceof RegExp ? '✅ RegExp' : '❌');
console.log('UID (Symbol):', post.uid, typeof post.uid);

// Serialización preserva tipos
const serialized = post.toInterface();
console.log('\nSerializado:', serialized);
console.log('createdAt serializado:', serialized.createdAt, '(string ISO)');
console.log('views serializado:', serialized.views, '(string)');

// Deserialización restaura tipos
const deserialized = new Post(serialized);
console.log('\nDeserializado:', deserialized);
console.log('createdAt restaurado:', deserialized.createdAt instanceof Date ? '✅ Date' : '❌');
console.log('views restaurado:', typeof deserialized.views === 'bigint' ? '✅ BigInt' : '❌');

// ============================================
// 3. COLECCIONES: Map y Set
// ============================================

interface IAnalytics {
  id: string;
  tags: Set<string>;
  metadata: Map<string, any>;
}

@Quick()
class Analytics extends QModel<IAnalytics> implements QInterface<IAnalytics> {
  declare id: string;
  declare tags: Set<string>;        // ✅ Auto-detectado como Set
  declare metadata: Map<string, any>; // ✅ Auto-detectado como Map
}

const analytics = new Analytics({
  id: 'analytics-1',
  tags: new Set(['typescript', 'decorators', 'quickmodel']),
  metadata: new Map<string, any>([
    ['author', 'Alice'],
    ['version', '1.0.0'],
    ['license', 'MIT'],
    ['contributors', ['Bob', 'Charlie']]
  ])
});

console.log('\n=== EJEMPLO 3: Colecciones (Map y Set) ===\n');
console.log('Analytics:', analytics);
console.log('Tags:', analytics.tags);
console.log('Es Set?:', analytics.tags instanceof Set ? '✅ Set' : '❌');
console.log('Metadata:', analytics.metadata);
console.log('Es Map?:', analytics.metadata instanceof Map ? '✅ Map' : '❌');

// Las colecciones se pueden usar normalmente
analytics.tags.add('bun');
analytics.metadata.set('updated', new Date());

console.log('\nDespués de modificar:');
console.log('Tags:', Array.from(analytics.tags));
console.log('Metadata:', Object.fromEntries(analytics.metadata));

export { Post, Analytics };
