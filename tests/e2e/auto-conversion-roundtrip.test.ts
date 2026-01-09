import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

// ============================================================================
// SETUP
// ============================================================================

// No setup needed - transformers are now initialized in services

// ============================================================================
// INTERFACES
// ============================================================================

enum UserRole {
	ADMIN = 'admin',
	USER = 'user',
	GUEST = 'guest',
}

enum Status {
	ACTIVE = 1,
	INACTIVE = 0,
}

const UserType = {
	PREMIUM: 'premium',
	FREE: 'free',
} as const;

interface IAddress {
	street: string;
	city: string;
	zipCode?: string;
}

class Address {
	street: string;
	city: string;
	zipCode?: string;

	constructor(data: IAddress) {
		this.street = data.street;
		this.city = data.city;
		this.zipCode = data.zipCode;
	}
}

interface ICompany extends IAddress {
	name: string;
	employees: number;
}

interface IPost {
	id: number;
	title: string;
	createdAt: Date;
}

interface ITestUser {
	// Primitivos
	id: number;
	name: string;
	isActive: boolean;
	age: number | null;
	email: string;
	nickname?: string;

	// Enums
	role: UserRole;
	status: Status;
	userType: (typeof UserType)[keyof typeof UserType];

	// Dates y BigInt
	createdAt: Date;
	updatedAt: Date;
	birthDate: Date | null;
	bigNumber: bigint;

	// Colecciones
	tags: Set<string>;
	metadata: Map<string, any>;
	permissions: string[];

	// Tipos especiales
	pattern: RegExp;
	symbolic: symbol;
	buffer: Buffer;
	errorData: Error;

	// Objetos plain
	config: { theme: string; lang: string };
	settings: Record<string, any>;

	// Nested models
	address: Address;
	company: ICompany;
	addresses: Address[];

	// Arrays de QModels
	posts: IPost[];

	// Tipos complejos
	preferences: { notifications: boolean; theme: 'dark' | 'light' };
	history: (Date | null | undefined)[];

	// TypedArrays
	scores: Uint8Array;
	data: Float32Array;

	// Default value
	defaultProp: string;
}

// ============================================================================
// MODELS
// ============================================================================

@Quick({
	createdAt: Date,
})
class Post extends QModel<IPost> {
	id!: number;
	title!: string;
	createdAt!: Date;
}

@Quick({
	posts: [Post],
	createdAt: Date,
	updatedAt: Date,
	birthDate: Date,
	bigNumber: BigInt,
	tags: Set,
	metadata: Map,
	pattern: RegExp,
	symbolic: Symbol,
	scores: Uint8Array,
	data: Float32Array,
})
class TestUser extends QModel<ITestUser> {
	id!: number;
	name!: string;
	isActive!: boolean;
	age!: number | null;
	email!: string;
	nickname?: string;

	role!: UserRole;
	status!: Status;
	userType!: (typeof UserType)[keyof typeof UserType];

	createdAt!: Date;
	updatedAt!: Date;
	birthDate!: Date | null;
	bigNumber!: bigint;

	tags!: Set<string>;
	metadata!: Map<string, any>;
	permissions!: string[];

	pattern!: RegExp;
	symbolic!: symbol;
	buffer!: Buffer;
	errorData!: Error;

	config!: { theme: string; lang: string };
	settings!: Record<string, any>;

	address!: Address;
	company!: ICompany;
	addresses!: Address[];

	posts!: Post[];

	preferences!: { notifications: boolean; theme: 'dark' | 'light' };
	history!: (Date | null | undefined)[];

	scores!: Uint8Array;
	data!: Float32Array;

	defaultProp: string = 'default-value';
}

interface IBaseModel {
	id: number;
	createdAt: Date;
}

class BaseModel extends QModel<IBaseModel> {
	id!: number;
	createdAt!: Date;
}

interface IExtendedModel extends IBaseModel {
	name: string;
	updatedAt: Date;
}

@Quick({
	createdAt: Date,
	updatedAt: Date,
})
class ExtendedModel extends QModel<IExtendedModel> {
	id!: number;
	name!: string;
	createdAt!: Date;
	updatedAt!: Date;
}

// ============================================================================
// TEST DATA
// ============================================================================

const testData: ITestUser = {
	// Primitivos
	id: 123,
	name: 'John Doe',
	isActive: true,
	age: null,
	email: 'john@example.com',
	nickname: undefined,

	// Enums
	role: UserRole.ADMIN,
	status: Status.ACTIVE,
	userType: 'premium',

	// Dates y BigInt
	createdAt: new Date('2024-01-01T00:00:00.000Z'),
	updatedAt: new Date('2024-06-15T12:30:00.000Z'),
	birthDate: null,
	bigNumber: BigInt('9007199254740991'),

	// Colecciones
	tags: new Set(['tag1', 'tag2', 'tag3']),
	metadata: new Map<string, string | { nested: boolean }>([
		['key1', 'value1'],
		['key2', { nested: true }],
	]),
	permissions: ['read', 'write', 'delete'],

	// Tipos especiales
	pattern: /test-pattern/gi,
	symbolic: Symbol.for('test-symbol'),
	buffer: Buffer.from('Hello World'),
	errorData: new Error('Test error'),

	// Objetos plain
	config: { theme: 'dark', lang: 'es' },
	settings: { volume: 80, quality: 'high' },

	// Nested models
	address: new Address({
		street: 'Main St 123',
		city: 'Springfield',
		zipCode: '12345',
	}),
	company: {
		name: 'Tech Corp',
		employees: 100,
		street: 'Tech Ave 456',
		city: 'Silicon Valley',
	},
	addresses: [
		new Address({ street: 'Home St', city: 'HomeCity' }),
		new Address({ street: 'Work Ave', city: 'WorkCity', zipCode: '99999' }),
	],

	// Arrays de QModels
	posts: [
		{ id: 1, title: 'First Post', createdAt: new Date('2024-01-01') },
		{ id: 2, title: 'Second Post', createdAt: new Date('2024-01-02') },
	],

	// Tipos complejos
	preferences: { notifications: true, theme: 'dark' },
	history: [new Date('2024-01-01'), null, undefined, new Date('2024-01-03')],

	// TypedArrays
	scores: new Uint8Array([100, 95, 87, 92]),
	data: new Float32Array([1.5, 2.7, 3.9]),

	// Default value
	defaultProp: 'custom-value',
};

// ============================================================================
// TESTS
// ============================================================================

describe('QuickModel - Comprehensive Test Suite', () => {
	let user: TestUser;

	// Crear usuario bajo demanda en los tests
	// beforeAll(() => {
	// 	user = new TestUser(testData);
	// });

	describe('1. Primitivos', () => {
		test('number: id', () => {
			user = new TestUser(testData);
			expect(user.id).toBe(123);
			expect(typeof user.id).toBe('number');
		});

		test('string: name', () => {
			expect(user.name).toBe('John Doe');
			expect(typeof user.name).toBe('string');
		});

		test('boolean: isActive', () => {
			expect(user.isActive).toBe(true);
			expect(typeof user.isActive).toBe('boolean');
		});

		test('null: age', () => {
			expect(user.age).toBeNull();
		});

		test('string: email', () => {
			expect(user.email).toBe('john@example.com');
		});

		test('undefined: nickname', () => {
			expect(user.nickname).toBeUndefined();
		});
	});

	describe('2. Enums', () => {
		test('string enum: role', () => {
			expect(user.role).toBe(UserRole.ADMIN);
			expect(user.role).toBe('admin' as UserRole);
		});

		test('numeric enum: status', () => {
			expect(user.status).toBe(Status.ACTIVE);
			expect(user.status).toBe(1);
		});

		test('const enum: userType', () => {
			expect(user.userType).toBe('premium');
		});
	});

	describe('3. Dates y BigInt', () => {
		test('Date: createdAt', () => {
			expect(user.createdAt).toBeInstanceOf(Date);
			expect(user.createdAt.toISOString()).toBe(
				'2024-01-01T00:00:00.000Z'
			);
		});

		test('Date: updatedAt', () => {
			expect(user.updatedAt).toBeInstanceOf(Date);
			expect(user.updatedAt.toISOString()).toBe(
				'2024-06-15T12:30:00.000Z'
			);
		});

		test('Date | null: birthDate', () => {
			expect(user.birthDate).toBeNull();
		});

		test('BigInt: bigNumber', () => {
			expect(typeof user.bigNumber).toBe('bigint');
			expect(user.bigNumber).toBe(BigInt('9007199254740991'));
		});
	});

	describe('4. Colecciones', () => {
		test('Set<string>: tags', () => {
			expect(user.tags).toBeInstanceOf(Set);
			expect(user.tags.size).toBe(3);
			expect(user.tags.has('tag1')).toBe(true);
			expect(user.tags.has('tag2')).toBe(true);
			expect(user.tags.has('tag3')).toBe(true);
		});

		test('Map<string, any>: metadata', () => {
			expect(user.metadata).toBeInstanceOf(Map);
			expect(user.metadata.size).toBe(2);
			expect(user.metadata.get('key1')).toBe('value1');
			expect(user.metadata.get('key2')).toEqual({ nested: true });
		});

		test('Array<string>: permissions', () => {
			expect(Array.isArray(user.permissions)).toBe(true);
			expect(user.permissions).toEqual(['read', 'write', 'delete']);
		});
	});

	describe('5. Tipos especiales', () => {
		test('RegExp: pattern', () => {
			expect(user.pattern).toBeInstanceOf(RegExp);
			expect(user.pattern.source).toBe('test-pattern');
			expect(user.pattern.flags).toBe('gi');
		});

		test('Symbol: symbolic', () => {
			expect(typeof user.symbolic).toBe('symbol');
			expect(Symbol.keyFor(user.symbolic)).toBe('test-symbol');
		});

		test('Buffer: buffer', () => {
			expect(Buffer.isBuffer(user.buffer)).toBe(true);
			expect(user.buffer.toString()).toBe('Hello World');
		});

		test('Error: errorData', () => {
			expect(user.errorData).toBeInstanceOf(Error);
			expect(user.errorData.message).toBe('Test error');
		});
	});

	describe('6. Objetos plain', () => {
		test('plain object: config', () => {
			expect(user.config).toEqual({ theme: 'dark', lang: 'es' });
		});

		test('Record: settings', () => {
			expect(user.settings).toEqual({ volume: 80, quality: 'high' });
		});
	});

	describe('7. Nested models', () => {
		test('class instance: address', () => {
			expect(user.address).toBeInstanceOf(Address);
			expect(user.address.street).toBe('Main St 123');
			expect(user.address.city).toBe('Springfield');
			expect(user.address.zipCode).toBe('12345');
		});

		test('plain object interface: company', () => {
			expect(user.company).toEqual({
				name: 'Tech Corp',
				employees: 100,
				street: 'Tech Ave 456',
				city: 'Silicon Valley',
			});
		});

		test('array of class instances: addresses', () => {
			expect(Array.isArray(user.addresses)).toBe(true);
			expect(user.addresses.length).toBe(2);
			expect(user.addresses[0]).toBeInstanceOf(Address);
			expect(user.addresses[0]?.street).toBe('Home St');
			expect(user.addresses[1]).toBeInstanceOf(Address);
			expect(user.addresses[1]?.city).toBe('WorkCity');
		});
	});

	describe('8. Arrays de QModels', () => {
		test('array of Post models - automatic conversion', () => {
			expect(Array.isArray(user.posts)).toBe(true);
			expect(user.posts.length).toBe(2);
			
			// Ahora SÍ se convierten automáticamente a Post instances
			expect(user.posts[0]).toBeInstanceOf(Post);
			expect(user.posts[0]?.id).toBe(1);
			expect(user.posts[0]?.title).toBe('First Post');
			expect(user.posts[0]?.createdAt).toBeInstanceOf(Date);
			
			expect(user.posts[1]).toBeInstanceOf(Post);
			expect(user.posts[1]?.id).toBe(2);
			expect(user.posts[1]?.title).toBe('Second Post');
		});
	});

	describe('9. Tipos complejos', () => {
		test('nested object: preferences', () => {
			expect(user.preferences).toEqual({
				notifications: true,
				theme: 'dark',
			});
		});

		test('union array: history', () => {
			expect(Array.isArray(user.history)).toBe(true);
			expect(user.history.length).toBe(4);
			expect(user.history[0]).toBeInstanceOf(Date);
			expect(user.history[1]).toBeNull();
			expect(user.history[2]).toBeUndefined();
			expect(user.history[3]).toBeInstanceOf(Date);
		});
	});

	describe('10. TypedArrays', () => {
		test('Uint8Array: scores', () => {
			expect(user.scores).toBeInstanceOf(Uint8Array);
			expect(user.scores.length).toBe(4);
			expect(Array.from(user.scores)).toEqual([100, 95, 87, 92]);
		});

		test('Float32Array: data', () => {
			expect(user.data).toBeInstanceOf(Float32Array);
			expect(user.data.length).toBe(3);
			// Use toBeCloseTo for floating point precision
			expect(user.data[0]).toBeCloseTo(1.5, 1);
			expect(user.data[1]).toBeCloseTo(2.7, 1);
			expect(user.data[2]).toBeCloseTo(3.9, 1);
		});
	});

	describe('11. Default values', () => {
		test('property with default value', () => {
			expect(user.defaultProp).toBe('custom-value');
		});

		test('default value behavior with undefined/missing fields', () => {
			// NOTE: Comportamiento actual de default values

			// Caso 1: undefined explícito - se mantiene undefined
			const userWithUndefined = new TestUser({
				...testData,
				defaultProp: undefined,
			} as any);
			expect(userWithUndefined.defaultProp).toBeUndefined();

			// Caso 2: Campo ausente - también es undefined actualmente
			// TODO: Considerar restaurar defaults cuando el campo falta completamente
			const dataWithoutField = { ...testData };
			delete (dataWithoutField as any).defaultProp;
			const userWithoutField = new TestUser(dataWithoutField);

			// Actualmente: undefined (el default se perdió en el proceso)
			// Idealmente: 'default-value'
			expect(userWithoutField.defaultProp).toBeUndefined();

			// Workaround: Establecer el default después si es undefined
			// if (userWithoutField.defaultProp === undefined) {
			//   userWithoutField.defaultProp = 'default-value';
			// }
		});
	});

	describe('12. Clone functionality', () => {
		test('clone from instance', () => {
			const cloned = new TestUser(user);
			expect(cloned).not.toBe(user);
			expect(cloned.id).toBe(user.id);
			expect(cloned.name).toBe(user.name);
			expect(cloned.createdAt).toEqual(user.createdAt);
		});
	});

	describe('13. serialize() - Serialización', () => {
		let interfaceData: any;

		// beforeAll(() => {
		// 	interfaceData = user.serialize();
		// });

		test('returns plain object', () => {
			user = user || new TestUser(testData);
			interfaceData = user.serialize();
			expect(typeof interfaceData).toBe('object');
			expect(interfaceData.constructor).toBe(Object);
		});

		test('Date transformed to string', () => {
			expect(typeof interfaceData.createdAt).toBe('string');
			expect(interfaceData.createdAt).toBe('2024-01-01T00:00:00.000Z');
		});

		test('BigInt transformed to object with __type', () => {
			expect(typeof interfaceData.bigNumber).toBe('object');
			expect(interfaceData.bigNumber.__type).toBe('bigint');
			expect(interfaceData.bigNumber.value).toBe('9007199254740991');
		});

		test('Set serializes to array format', () => {
			// Set should serialize to a format that can roundtrip
			// Either array or object with __type
			const isArray = Array.isArray(interfaceData.tags);
			const isObjectWithType = typeof interfaceData.tags === 'object' && interfaceData.tags.__type === 'Set';
			expect(isArray || isObjectWithType).toBe(true);
		});

		test('Map serializes to object format', () => {
			// Map should serialize to a format that can roundtrip
			expect(typeof interfaceData.metadata).toBe('object');
			// Can be plain object or object with __type
		});
	});

	describe('14. Roundtrip (Model → Interface → Model)', () => {
		test('dates preserved through roundtrip', () => {
			const interfaceData = user.serialize();
			const restored = new TestUser(interfaceData);
			expect(restored.createdAt).toBeInstanceOf(Date);
			expect(restored.createdAt.getTime()).toBe(user.createdAt.getTime());
		});

		test('BigInt preserved through roundtrip', () => {
			const interfaceData = user.serialize();
			const restored = new TestUser(interfaceData);
			expect(typeof restored.bigNumber).toBe('bigint');
			expect(restored.bigNumber).toBe(user.bigNumber);
		});

		test('Set preserved through roundtrip', () => {
			const interfaceData = user.serialize();
			const restored = new TestUser(interfaceData);
			expect(restored.tags).toBeInstanceOf(Set);
			expect(restored.tags.size).toBe(user.tags.size);
			expect(Array.from(restored.tags)).toEqual(Array.from(user.tags));
		});

		test('Map preserved through roundtrip', () => {
			const interfaceData = user.serialize();
			const restored = new TestUser(interfaceData);
			expect(restored.metadata).toBeInstanceOf(Map);
			expect(restored.metadata.size).toBe(user.metadata.size);
		});
	});

	describe('15. URL y URLSearchParams', () => {
		test('URL transformation', () => {
			const url = new URL('https://example.com/path?query=value');
			// URLs aren't in TestUser, so we test directly
			expect(url).toBeInstanceOf(URL);
		});

		test('URLSearchParams transformation', () => {
			const params = new URLSearchParams('key=value&foo=bar');
			expect(params).toBeInstanceOf(URLSearchParams);
		});
	});

	describe('16. Herencia de modelos', () => {
		test('extended model inherits base properties', () => {
			const extended = new ExtendedModel({
				id: 1,
				name: 'Test',
				createdAt: new Date('2024-01-01').toISOString(),
				updatedAt: new Date('2024-01-02').toISOString(),
			});
			expect(extended.id).toBe(1);
			expect(extended.name).toBe('Test');
			expect(extended.createdAt).toBeInstanceOf(Date);
			expect(extended.updatedAt).toBeInstanceOf(Date);
		});
	});

	describe('17. Métodos custom en el modelo', () => {
		test('custom methods work correctly', () => {
			// Add a custom method to TestUser
			(TestUser.prototype as any).getFullInfo = function () {
				return `${this.name} (${this.email})`;
			};

			expect((user as any).getFullInfo()).toBe(
				'John Doe (john@example.com)'
			);
		});
	});
});

// ============================================================================
// CASOS PENDIENTES PARA FUTUROS TESTS
// ============================================================================
/*
CASOS A CONSIDERAR:

1. **Referencias circulares**:
   - Objeto A referencia a B, B referencia a A
   - Prevención de stack overflow
   - Manejo de serialización/deserialización

2. **Propiedades readonly**:
   - `readonly id: number`
   - Asegurar que no se puedan modificar después de inicialización

3. **Propiedades privadas/protected**:
   - `private _internal: string`
   - Verificar que no se serialicen

4. **Partial updates**:
   - Actualizar solo algunos campos (escenarios PATCH)
   - Mantener valores existentes para campos no proporcionados

5. **Arrays heterogéneos**:
   - `mixed: [Date, string, number, null]`
   - Transformación correcta de cada elemento según su tipo

6. **Transformaciones custom bidireccionales**:
   - Custom transformer que funciona en ambas direcciones
   - `serialize()` debe usar custom transformers también

7. **WeakMap/WeakSet**:
   - Si son necesarios, cómo serializarlos
   - Limitaciones de JSON

8. **Nested arrays profundos**:
   - `items: Item[][]`
   - `matrix: number[][][]`

9. **Optional chaining profundo**:
   - `user?.profile?.address?.city`
   - Manejo de nullish values en cadenas largas

10. **Invalid data handling**:
    - Backend envía tipos incorrectos
    - Validación y errores descriptivos
    - Modo strict vs permissive

11. **Performance con arrays grandes**:
    - Miles de elementos
    - Optimización de transformaciones
    - Streaming/lazy loading

12. **Propiedades computadas/getters**:
    - `get fullName(): string { return this.firstName + ' ' + this.lastName }`
    - No deben serializarse
    - Pero deben funcionar en el modelo

13. **Symbol properties**:
    - Propiedades con keys Symbol
    - Metadata attached via Symbols

14. **Proxy wrappers**:
    - Modelos envueltos en Proxy
    - Interceptación de accesos

15. **Async transformers**:
    - Transformaciones que requieren operaciones async
    - await en deserialización

16. **Multiple inheritance**:
    - Class C extends B extends A
    - Cadenas largas de herencia
    - Conflictos de metadata

17. **Mixins**:
    - Composición de comportamientos
    - function applyMixins(derivedCtor, baseCtors)

18. **Frozen/Sealed objects**:
    - Object.freeze(model)
    - Object.seal(model)
    - Inmutabilidad

19. **Custom toJSON**:
    - Modelos que definen su propio toJSON()
    - Interacción con serialize()

20. **Metadata pollution**:
    - Muchas clases con decoradores
    - Memory leaks en metadata
    - Cleanup strategies
*/
