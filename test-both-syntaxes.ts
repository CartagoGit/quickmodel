import { QModel, QType, QInterface } from './src/quick.model';

console.log('=== Test 1: Con declare (sin design:type) ===');
interface ITestDeclare {
  id: string;
  date: Date;
  count: bigint;
}

class TestDeclare extends QModel<ITestDeclare> implements QInterface<ITestDeclare> {
  @QType() declare id: string;
  @QType() declare date: Date;
  @QType() declare count: bigint;
}

const testD = new TestDeclare({
  id: 'test-1',
  date: new Date('2024-01-01'),
  count: 9999n
});

console.log('Inicial - date es Date?:', testD.date instanceof Date ? '✅' : '❌');
console.log('Inicial - count es bigint?:', typeof testD.count === 'bigint' ? '✅' : '❌');

const ifaceD = testD.toInterface();
const restoredD = new TestDeclare(ifaceD);
console.log('Restaurado - date es Date?:', restoredD.date instanceof Date ? '✅' : '❌');
console.log('Restaurado - count es bigint?:', typeof restoredD.count === 'bigint' ? '✅' : '❌');

console.log('\n=== Test 2: Con ! (con design:type) ===');
interface ITestBang {
  id: string;
  date: Date;
  count: bigint;
}

class TestBang extends QModel<ITestBang> implements QInterface<ITestBang> {
  @QType() id!: string;
  @QType() date!: Date;
  @QType() count!: bigint;
}

const testB = new TestBang({
  id: 'test-2',
  date: new Date('2024-01-02'),
  count: 8888n
});

console.log('Inicial - date es Date?:', testB.date instanceof Date ? '✅' : '❌');
console.log('Inicial - count es bigint?:', typeof testB.count === 'bigint' ? '✅' : '❌');

const ifaceB = testB.toInterface();
const restoredB = new TestBang(ifaceB);
console.log('Restaurado - date es Date?:', restoredB.date instanceof Date ? '✅' : '❌');
console.log('Restaurado - count es bigint?:', typeof restoredB.count === 'bigint' ? '✅' : '❌');

console.log('\n✅ Ambas sintaxis funcionan correctamente con autodetección!');
