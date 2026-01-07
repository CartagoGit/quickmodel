import { QModel, Quick, QInterface } from './src/quick.model';

interface IUser {
  id: string;
  name: string;
}

console.log('\n============================================');
console.log('  @Quick() DECORATOR - FIELD SYNTAX TEST');
console.log('============================================\n');

// Test 1: Con declare (RECOMENDADO para Bun)
@Quick()
class UserDeclare extends QModel<IUser> implements QInterface<IUser> {
  declare id: string;
  declare name: string;
}

// Test 2: Con ! (SOLO funciona con tsc, NO con Bun directo)
@Quick()
class UserBang extends QModel<IUser> implements QInterface<IUser> {
  id!: string;
  name!: string;
}

console.log('=== TEST 1: declare id: string ===');
const userDeclare = new UserDeclare({ id: '1', name: 'Alice' });
console.log('userDeclare.id:', userDeclare.id);
console.log('userDeclare.name:', userDeclare.name);
const test1Pass = userDeclare.id === '1' && userDeclare.name === 'Alice';
console.log(test1Pass ? '✅ PASS' : '❌ FAIL');

console.log('\n=== TEST 2: id!: string ===');
const userBang = new UserBang({ id: '2', name: 'Bob' });
console.log('userBang.id:', userBang.id);
console.log('userBang.name:', userBang.name);
const test2Pass = userBang.id === '2' && userBang.name === 'Bob';
console.log(test2Pass ? '✅ PASS' : '❌ FAIL');

console.log('=== RESUMEN ===');
console.log('TypeScript Config: useDefineForClassFields: true (Estándar ES2022+)');
console.log('Runtime:', 'Bun 1.3.2');
console.log('declare:', test1Pass ? '✅ FUNCIONA' : '❌ FALLA');
console.log('!:', test2Pass ? '✅ FUNCIONA' : '❌ FALLA');

console.log('\n=== EXPLICACIÓN ===');
if (!test2Pass) {
  console.log('⚠️  El campo con "!" NO funciona porque:');
  console.log('   - Con useDefineForClassFields: true (ES2022+)');
  console.log('   - TypeScript genera: this.id = undefined; DESPUÉS del constructor');
  console.log('   - Esto sobrescribe el valor asignado en initialize()');
  console.log('\n💡 SOLUCIÓN CORRECTA:');
  console.log('   Usar "declare" - es la forma semánticamente correcta');
  console.log('   para propiedades inicializadas externamente (por QModel).');
  console.log('   No es un workaround, es el patrón correcto de TypeScript.');
}

console.log('\n============================================\n');

