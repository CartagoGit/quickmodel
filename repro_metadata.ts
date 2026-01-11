import 'reflect-metadata';
import { Quick, QType, QModel } from './src/index';

@Quick()
class UserUndecorated extends QModel<any> {
	declare name: string;
}

@Quick()
class UserDecorated extends QModel<any> {
	@QType() declare name: string;
}

function checkMetadata(name: string, cls: any) {
	console.log(`\n--- Checking ${name} ---`);
	const proto = cls.prototype;

	// Check if property 'name' exists on prototype
	const descriptor = Object.getOwnPropertyDescriptor(proto, 'name');
	console.log('Property descriptor exists on prototype:', !!descriptor);

	// Check design:type
	const type = Reflect.getMetadata('design:type', proto, 'name');
	console.log('design:type metadata:', type ? type.name : 'undefined');

	// Check generated mock
	const mock = cls.mock().random();
	console.log('Mock result:', JSON.stringify(mock));
}

checkMetadata('UserUndecorated (declare name: string)', UserUndecorated);
checkMetadata('UserDecorated (@QType() declare name: string)', UserDecorated);
