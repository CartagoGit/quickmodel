import { QModel, Quick } from './src';

interface IUser {
	id: string;
	name: string;
}

@Quick()
class User extends QModel<IUser> {
	declare id: string;
	declare name: string;
	declare extraProp: string;  // Propiedad extra NO en la interfaz
	
	constructor(data: IUser & { extraProp?: string }) {
		console.log('[User constructor] called with data:', data);
		super(data as any);
		console.log('[User constructor] after super, this.id:', this.id);
		console.log('[User constructor] after super, this.extraProp:', this.extraProp);
	}
}

console.log('\n=== Creating User ===');
const user = new User({ id: '1', name: 'John', extraProp: 'Extra Value' });
console.log('\n=== After creation ===');
console.log('user.id:', user.id);
console.log('user.name:', user.name);
console.log('user.extraProp:', user.extraProp);
console.log('user.serialize():', user.serialize());
