
import 'reflect-metadata';
import { QType } from './src/core/decorators/qtype.decorator';
import { QModel } from './src/core/models/quick.model';

class TestModel {
  @QType(RegExp)
  pattern!: RegExp;
}

const fieldType = Reflect.getMetadata('fieldType', TestModel.prototype, 'pattern');
const fieldTransformer = Reflect.getMetadata('fieldTransformer', TestModel.prototype, 'pattern');

console.log('fieldType:', fieldType);
console.log('fieldTransformer:', fieldTransformer);
console.log('Is fieldTransformer RegExp?', fieldTransformer === RegExp);
