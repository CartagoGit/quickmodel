import 'reflect-metadata';
import { Field, QuickModel, BigIntField, RegExpField } from './src';

interface ITestModel {
  name: string;
  age: number;
  active: boolean;
  amount: bigint;
  pattern: RegExp;
  createdAt: Date;
}

class TestModel extends QuickModel<ITestModel> {
  @Field() name!: string;
  @Field() age!: number;
  @Field() active!: boolean;
  @Field(BigIntField) amount!: bigint;
  @Field(RegExpField) pattern!: RegExp;
  @Field() createdAt!: Date;
}

console.log('=== Testing MockGenerator ===');

const instance = Object.create(TestModel.prototype);
console.log('Instance:', instance);
console.log('Metadatas on instance:');
const keys = ['name', 'age', 'active', 'amount', 'pattern', 'createdAt'];
for (const key of keys) {
  const fieldType = Reflect.getMetadata('fieldType', instance, key);
  const designType = Reflect.getMetadata('design:type', instance, key);
  console.log(`  ${key}: fieldType=${fieldType}, designType=${designType?.name}`);
}

console.log('\n=== Calling mock.empty() ===');
const result = TestModel.mock.empty();
console.log('Result:', result);
console.log('Result constructor:', result.constructor.name);
console.log('Result properties:', Object.keys(result));
console.log('Result.name:', result.name);
