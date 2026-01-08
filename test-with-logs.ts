import { QModel, QType } from './src/quick.model';

interface IUser {
  id: number;
  name: string;
  createdAt: string;
}

class User extends QModel<IUser> {
  id!: number;
  name!: string;
  @QType(Date) createdAt!: Date;
}

const user = new User({ id: 1, name: 'John', createdAt: '2024-01-01T00:00:00.000Z' });

console.log('=== ANTES de TypeScript sobreescribir ===');
console.log('Directamente después del constructor:');
console.log('user:', user);
console.log('Object.keys(user):', Object.keys(user));
console.log('user.id:', user.id);
console.log('user.name:', user.name);
console.log('user.createdAt:', user.createdAt);
