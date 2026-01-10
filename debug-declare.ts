
import 'reflect-metadata';
import { QModel, QType } from './src/index';

interface ITestDeclare {
  id: string;
  name: string;
  createdAt: Date | string;
  count: bigint | string;
  key: symbol | { __type: 'symbol'; description: string };
  pattern: RegExp | { __type: 'regexp'; source: string; flags: string };
  tags: Set<string> | { __type: 'Set'; values: string[] };
  metadata: Map<string, string> | { __type: 'Map'; entries: [string, string][] };
}

class TestDeclare extends QModel<ITestDeclare> {
  @QType() id!: string;
  @QType() name!: string;
  @QType() createdAt!: Date;
  @QType() count!: bigint;
  @QType() key!: symbol;
  @QType() pattern!: RegExp;
  @QType() tags!: Set<string>;
  @QType() metadata!: Map<string, string>;
}

console.log('--- Metadata Check ---');
const instance = new TestDeclare({} as any);
const countType = Reflect.getMetadata('design:type', instance, 'count');
console.log('count metadata:', countType);
console.log('count is BigInt?', countType === BigInt);
console.log('count is Object?', countType === Object);
console.log('count name:', countType?.name);

const tagsType = Reflect.getMetadata('design:type', instance, 'tags');
console.log('tags metadata:', tagsType);
console.log('tags is Set?', tagsType === Set);

const createdAtType = Reflect.getMetadata('design:type', instance, 'createdAt');
console.log('createdAt metadata:', createdAtType);
console.log('createdAt is Date?', createdAtType === Date);
