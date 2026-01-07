import 'reflect-metadata';
import { QType, QModel } from './src';

interface ITest {
  tags: Set<string>;
}

class TestDeclare extends QModel<ITest> {
  @QType() declare tags: Set<string>;
}

class TestBang extends QModel<ITest> {
  @QType() tags!: Set<string>;
}

const instanceDeclare = new TestDeclare({});
const instanceBang = new TestBang({});

console.log('=== TestDeclare (declare) ===');
console.log('design:type:', Reflect.getMetadata('design:type', instanceDeclare, 'tags'));
console.log('fieldType:', Reflect.getMetadata('fieldType', instanceDeclare, 'tags'));

console.log('\n=== TestBang (!) ===');
console.log('design:type:', Reflect.getMetadata('design:type', instanceBang, 'tags'));
console.log('fieldType:', Reflect.getMetadata('fieldType', instanceBang, 'tags'));
