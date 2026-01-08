import { QModel, QType } from './src/quick.model';
import { ModelDeserializer } from './src/core/services/model-deserializer.service';
import { qTransformerRegistry } from './src/core/registry';

interface IUser {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  balance: string;
  tags: string[];
}

class User extends QModel<IUser> {
  id!: number;
  name!: string;
  email!: string;
  
  @QType(Date) createdAt!: Date;
  @QType(BigInt) balance!: bigint;
  @QType(Set) tags!: Set<string>;
}

const userData: IUser = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: '2024-01-01T00:00:00.000Z',
  balance: '9007199254740991',
  tags: ['admin', 'user']
};

const deserializer = new ModelDeserializer(qTransformerRegistry);
const user = deserializer.deserialize(userData, User);

console.log('Resultado del deserializer:');
console.log('user.id:', user.id);
console.log('user.name:', user.name);
console.log('user.email:', user.email);
console.log('user.createdAt:', user.createdAt);
console.log('user.balance:', user.balance);
console.log('user.tags:', user.tags);
