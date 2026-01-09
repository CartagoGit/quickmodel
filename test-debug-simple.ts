import { QModel, Quick } from './src/index';

interface IUser {
	id: string;
	name: string;
}

@Quick({ id: String, name: String })
class User extends QModel<IUser> {
	declare id: string;
	declare name: string;
}

const user = new User({ id: '123', name: 'John' });

console.log('user.id:', user.id);
console.log('user.name:', user.name);
console.log('user:', user);
console.log('keys:', Object.keys(user));
console.log('own properties:', Object.getOwnPropertyNames(user));
