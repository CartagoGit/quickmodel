import { Quick, QModel } from './src/index';

// Case A: Undecorated, declared only (Standard TS)
@Quick()
class UserDeclared extends QModel<any> {
	declare name: string;
	declare age: number;
	declare active: boolean;
}

// Case B: Undecorated, initialized
@Quick()
class UserInitialized extends QModel<any> {
	name: string = 'default';
	age: number = 0;
	active: boolean = false;
}

// Case C: Explicitly Decorated (Current Doc Recommendation)
@Quick({
	name: 'string',
	age: 'number',
	active: 'boolean',
})
class UserExplicit extends QModel<any> {
	declare name: string;
	declare age: number;
	declare active: boolean;
}

async function run() {
	console.log('--- Testing Mock Generation ---');

	console.log('\n1. UserDeclared (declare name: string)');
	const mockA = UserDeclared.mock().random();
	console.log('Result:', JSON.stringify(mockA, null, 2));
	// Expecting: Empty object or undefined values, because runtime has NO info about 'name' being a string

	console.log('\n2. UserInitialized (name = "default")');
	const mockB = UserInitialized.mock().random();
	console.log('Result:', JSON.stringify(mockB, null, 2));
	// Expecting: Might work if QuickModel scans instance defaults?
	// But .mock() creates an empty instance via prototype usually.

	console.log('\n3. UserExplicit (@Quick mapped)');
	const mockC = UserExplicit.mock().random();
	console.log('Result:', JSON.stringify(mockC, null, 2));
	// Expecting: Full mock data
}

run();
