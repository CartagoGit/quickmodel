// Test con Node.js usando el código compilado
const { QModel } = require('./dist/index.cjs');

console.log('\n=== TEST CON NODE.JS ===\n');

// Test 1: Con id! (definite assignment)
class PostExclamation extends QModel {
  // En JavaScript compilado, esto no existe, pero TypeScript lo emite
  id;
  title;
}

// Test 2: Con declare
class PostDeclare extends QModel {
  // declare no emite código en JavaScript
}

console.log('1. Clase con propiedades inicializadas (equivalente a id!):');
const post1 = new PostExclamation({ id: 1, title: 'Test1' });
console.log('  post1.id:', post1.id);
console.log('  post1.title:', post1.title);

console.log('\n2. Clase sin propiedades inicializadas (equivalente a declare):');
const post2 = new PostDeclare({ id: 2, title: 'Test2' });
console.log('  post2.id:', post2.id);
console.log('  post2.title:', post2.title);

console.log('\n3. Verificar own properties:');
console.log('  post1:', Object.getOwnPropertyNames(post1).filter(p => !p.startsWith('__')));
console.log('  post2:', Object.getOwnPropertyNames(post2).filter(p => !p.startsWith('__')));

console.log('\n4. Verificar descriptors:');
const desc1 = Object.getOwnPropertyDescriptor(post1, 'id');
const desc2 = Object.getOwnPropertyDescriptor(post2, 'id');
console.log('  post1.id descriptor:', desc1);
console.log('  post2.id descriptor:', desc2);
