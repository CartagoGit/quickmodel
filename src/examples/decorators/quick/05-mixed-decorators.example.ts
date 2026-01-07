/**
 * @Quick() Decorator - Ejemplo 5: Mezclando @Quick() con @QType()
 * 
 * Demuestra cuándo y cómo combinar @Quick() con @QType() explícito
 * para casos especiales como arrays de modelos.
 */

import { QModel, Quick, QType, QInterface } from '../../../quick.model';

// ============================================
// 6. COMBINANDO @Quick() CON @QType()
// ============================================

interface IComment {
  id: string;
  text: string;
  author: string;
  createdAt: Date;
}

@Quick()
class Comment extends QModel<IComment> implements QInterface<IComment> {
  declare id: string;
  declare text: string;
  declare author: string;
  declare createdAt: Date;
}

interface IPost {
  id: string;
  title: string;
  content: string;
  tags: string[];
  comments: IComment[];  // Array de modelos requiere @QType() explícito
  createdAt: Date;
}

@Quick()
class Post extends QModel<IPost> implements QInterface<IPost> {
  declare id: string;
  declare title: string;
  declare content: string;
  declare tags: string[];
  
  // ⚠️ Arrays de modelos requieren @QType() explícito incluso con @Quick()
  @QType(Comment)
  declare comments: Comment[];
  
  declare createdAt: Date;
}

// Crear post con comentarios
const post = new Post({
  id: 'post-001',
  title: '¿Por qué usar @Quick()?',
  content: 'El decorador @Quick() simplifica el código eliminando la necesidad de decorar cada propiedad...',
  tags: ['typescript', 'decorators', 'quickmodel'],
  comments: [
    {
      id: 'comm-001',
      text: '¡Excelente explicación!',
      author: 'user1',
      createdAt: new Date('2024-01-01T10:00:00Z')
    },
    {
      id: 'comm-002',
      text: 'Muy útil, gracias por compartir',
      author: 'user2',
      createdAt: new Date('2024-01-01T11:30:00Z')
    }
  ],
  createdAt: new Date('2024-01-01T09:00:00Z')
});

console.log('\n=== EJEMPLO 6: @Quick() + @QType() ===\n');
console.log('Post:', post);
console.log('Título:', post.title);
console.log('Tags:', post.tags);
console.log('Número de comentarios:', post.comments.length);

// Los comentarios son instancias de Comment
console.log('\nComentarios son instancias de Comment?');
post.comments.forEach((comment, i) => {
  console.log(`  Comentario ${i + 1}:`, comment instanceof Comment ? '✅' : '❌');
  console.log(`    Autor: ${comment.author}`);
  console.log(`    Texto: ${comment.text}`);
  console.log(`    Fecha es Date?: ${comment.createdAt instanceof Date ? '✅' : '❌'}`);
});

// Serializar a JSON
const json = post.toJSON();
console.log('\nJSON serializado:');
console.log(JSON.stringify(json, null, 2));

// Serializar a interface
const interfaceData = post.toInterface();
console.log('\nInterface serializada:', interfaceData);
console.log('comments[0].createdAt es string?:', typeof interfaceData.comments?.[0]?.createdAt === 'string' ? '✅' : '❌');

// Deserializar
const restored = new Post(interfaceData);
console.log('\nPost restaurado:', restored);
console.log('comments[0] es Comment?:', restored.comments?.[0] instanceof Comment ? '✅' : '❌');
console.log('comments[0].createdAt es Date?:', restored.comments?.[0]?.createdAt instanceof Date ? '✅' : '❌');

// ============================================
// 7. CASO COMPLEJO: MODELO CON TIPOS ESPECIALES
// ============================================

interface IConfiguration {
  id: string;
  name: string;
  metadata: Map<string, any>;
  bufferData: Buffer;
  pattern: RegExp;
  uniqueId: Symbol;
  largeNumber: bigint;
  updatedAt: Date;
}

@Quick()
class Configuration extends QModel<IConfiguration> implements QInterface<IConfiguration> {
  declare id: string;
  declare name: string;
  declare metadata: Map<string, any>;
  declare bufferData: Buffer;
  declare pattern: RegExp;
  declare uniqueId: Symbol;
  declare largeNumber: bigint;
  declare updatedAt: Date;
}

const config = new Configuration({
  id: 'config-001',
  name: 'Production Config',
  metadata: new Map<string, any>([
    ['version', '1.0.0'],
    ['environment', 'production'],
    ['maxConnections', 100]
  ]),
  bufferData: Buffer.from('Hello QuickModel!', 'utf-8'),
  pattern: /^[a-zA-Z0-9]+$/,
  uniqueId: Symbol('production'),
  largeNumber: 9007199254740991n,
  updatedAt: new Date()
});

console.log('\n=== EJEMPLO 7: Tipos Especiales ===\n');
console.log('Configuración:', config);
console.log('Metadata es Map?:', config.metadata instanceof Map ? '✅' : '❌');
console.log('Metadata.get("version"):', config.metadata.get('version'));
console.log('Buffer es Buffer?:', Buffer.isBuffer(config.bufferData) ? '✅' : '❌');
console.log('Buffer contenido:', config.bufferData.toString('utf-8'));
console.log('Pattern es RegExp?:', config.pattern instanceof RegExp ? '✅' : '❌');
console.log('Pattern.test("abc123"):', config.pattern.test('abc123') ? '✅' : '❌');
console.log('Pattern.test("abc-123"):', config.pattern.test('abc-123') ? '❌' : '✅');
console.log('UniqueId es Symbol?:', typeof config.uniqueId === 'symbol' ? '✅' : '❌');
console.log('LargeNumber es bigint?:', typeof config.largeNumber === 'bigint' ? '✅' : '❌');

// Clonar preserva todos los tipos
const clonedConfig = config.clone();
console.log('\nConfig clonada:');
console.log('Metadata es Map?:', clonedConfig.metadata instanceof Map ? '✅' : '❌');
console.log('Buffer es Buffer?:', Buffer.isBuffer(clonedConfig.bufferData) ? '✅' : '❌');
console.log('Pattern es RegExp?:', clonedConfig.pattern instanceof RegExp ? '✅' : '❌');
console.log('UniqueId es Symbol?:', typeof clonedConfig.uniqueId === 'symbol' ? '✅' : '❌');
console.log('LargeNumber es bigint?:', typeof clonedConfig.largeNumber === 'bigint' ? '✅' : '❌');

export { Comment, Post, Configuration };
