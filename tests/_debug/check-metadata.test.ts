import { describe, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import 'reflect-metadata';
import { QUICK_TYPE_MAP_KEY } from '@/core/constants/metadata-keys';

describe('Debug: Metadata checking', () => {
	interface IUser {
		id: string;
		name: string;
		age: number;
		active: boolean;
	}

	@Quick({})
	class User extends QModel<IUser> {
		id!: string;
		name!: string;
		age!: number;
		active!: boolean;
	}

	test('should show available metadata', () => {
		const proto = User.prototype;

		console.log('\n=== Checking metadata for User class ===');
		console.log('Properties with design:type:');
		for (const key of ['id', 'name', 'age', 'active']) {
			const designType = Reflect.getMetadata('design:type', proto, key);
			console.log(`  ${key}: ${designType?.name || 'undefined'}`);
		}

		console.log('\nProperties with fieldType:');
		for (const key of ['id', 'name', 'age', 'active']) {
			const fieldType = Reflect.getMetadata('fieldType', proto, key);
			console.log(`  ${key}: ${fieldType || 'undefined'}`);
		}

		console.log(
			'\nRegistered fields:',
			Reflect.getMetadata('quickmodel:fields', proto)
		);
		console.log('TypeMap:', Reflect.getMetadata(QUICK_TYPE_MAP_KEY, User));
	});
});
