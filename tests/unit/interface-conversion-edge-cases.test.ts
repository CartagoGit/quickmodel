import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '../../src';

describe('Interface Conversion - Edge Cases', () => {
	describe('toInterface() with circular references', () => {
		interface INode {
			id: string;
			name: string;
			parent?: INode;
			children?: INode[];
		}

		@Quick()
		class Node extends QModel<INode> {
			declare id: string;
			declare name: string;
			declare parent?: Node;
			declare children?: Node[];
		}

		test('should handle self-referencing objects without infinite loop', () => {
			const node = new Node({
				id: '1',
				name: 'Root'
			});

			// Create circular reference
			(node as any).parent = node;

			// This should not throw or hang
			expect(() => {
				const iface = node.toInterface();
				// Should complete without hanging
				expect(iface).toBeDefined();
			}).not.toThrow();
		});

		test('should handle parent-child circular references', () => {
			const parent = new Node({
				id: '1',
				name: 'Parent'
			});

			const child = new Node({
				id: '2',
				name: 'Child'
			});

			// Create circular reference
			(child as any).parent = parent;
			(parent as any).children = [child];

			// Should not hang
			expect(() => {
				const parentIface = parent.toInterface();
				const childIface = child.toInterface();
				expect(parentIface).toBeDefined();
				expect(childIface).toBeDefined();
			}).not.toThrow();
		});
	});

	describe('toInterface() with null/undefined edge cases', () => {
		interface IData {
			id: string;
			value?: string | null;
			nested?: {
				prop?: string | null;
			} | null;
		}

		@Quick()
		class DataModel extends QModel<IData> {
			declare id: string;
			declare value?: string | null;
			declare nested?: {
				prop?: string | null;
			} | null;
		}

		test('should handle null values correctly', () => {
			const model = new DataModel({
				id: '1',
				value: null,
				nested: null
			});

			const iface = model.toInterface();
			
			expect(iface.value).toBeNull();
			expect(iface.nested).toBeNull();
		});

		test('should handle undefined values correctly', () => {
			const model = new DataModel({
				id: '1',
				value: undefined,
				nested: undefined
			});

			const iface = model.toInterface();
			
			// undefined might be omitted or preserved depending on implementation
			expect(iface.value === undefined || !('value' in iface)).toBe(true);
		});

		test('should handle nested null/undefined', () => {
			const model = new DataModel({
				id: '1',
				nested: {
					prop: null
				}
			});

			const iface = model.toInterface();
			
			expect(iface.nested).toBeDefined();
			expect(iface.nested?.prop).toBeNull();
		});
	});

	describe('toInterface() with Date edge cases', () => {
		interface ITimestamps {
			id: string;
			createdAt: string;
			updatedAt?: string | null;
		}

		interface ITimestampsTransforms {
			createdAt: Date;
			updatedAt?: Date | null;
		}

		@Quick({ createdAt: Date, updatedAt: Date })
		class Timestamped extends QModel<ITimestamps> implements ITimestampsTransforms {
			declare id: string;
			declare createdAt: Date;
			declare updatedAt?: Date | null;
		}

		test('should convert Date to ISO string', () => {
			const model = new Timestamped({
				id: '1',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			const iface = model.toInterface();
			
			expect(typeof iface.createdAt).toBe('string');
			expect(iface.createdAt).toBe('2024-01-01T00:00:00.000Z');
		});

		test('should handle invalid Date gracefully', () => {
			const model = new Timestamped({
				id: '1',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			// Set invalid date
			(model as any).createdAt = new Date('invalid');

			const iface = model.toInterface();
			
			// Should return 'Invalid Date' string or handle gracefully
			expect(typeof iface.createdAt).toBe('string');
		});

		test('should handle null Date fields', () => {
			const model = new Timestamped({
				id: '1',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: null
			});

			const iface = model.toInterface();
			
			expect(iface.updatedAt).toBeNull();
		});
	});

	describe('toInterface() with arrays and nested structures', () => {
		interface IComplex {
			id: string;
			tags: string[];
			metadata: {
				key: string;
				values: number[];
			};
		}

		@Quick()
		class Complex extends QModel<IComplex> {
			declare id: string;
			declare tags: string[];
			declare metadata: {
				key: string;
				values: number[];
			};
		}

		test('should handle empty arrays', () => {
			const model = new Complex({
				id: '1',
				tags: [],
				metadata: {
					key: 'test',
					values: []
				}
			});

			const iface = model.toInterface();
			
			expect(Array.isArray(iface.tags)).toBe(true);
			expect(iface.tags.length).toBe(0);
			expect(Array.isArray(iface.metadata.values)).toBe(true);
			expect(iface.metadata.values.length).toBe(0);
		});

		test('should handle deeply nested structures', () => {
			const model = new Complex({
				id: '1',
				tags: ['a', 'b', 'c'],
				metadata: {
					key: 'test',
					values: [1, 2, 3, 4, 5]
				}
			});

			model.tags.push('d');
			model.metadata.values.push(6);

			const iface = model.toInterface();
			
			expect(iface.tags).toEqual(['a', 'b', 'c', 'd']);
			expect(iface.metadata.values).toEqual([1, 2, 3, 4, 5, 6]);
		});

		test('should handle arrays with null/undefined elements', () => {
			const model = new Complex({
				id: '1',
				tags: ['a', null as any, 'b', undefined as any, 'c'],
				metadata: {
					key: 'test',
					values: [1, null as any, 3]
				}
			});

			const iface = model.toInterface();
			
			expect(iface.tags).toBeDefined();
			expect(iface.metadata.values).toBeDefined();
		});
	});

	describe('getInitInterface() immutability and consistency', () => {
		interface IUser {
			id: string;
			name: string;
			age: number;
		}

		@Quick()
		class User extends QModel<IUser> {
			declare id: string;
			declare name: string;
			declare age: number;
		}

		test('should return a copy, not reference to internal data', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30
			});

			const init1 = user.getInitInterface();
			const init2 = user.getInitInterface();

			// Should be different objects
			expect(init1).not.toBe(init2);
			// But with same values
			expect(init1).toEqual(init2);
		});

		test('should not be affected by mutations to returned object', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30
			});

			const init = user.getInitInterface();
			init.name = 'Mutated';
			init.age = 999;

			// Get again, should still have original values
			const init2 = user.getInitInterface();
			expect(init2.name).toBe('John');
			expect(init2.age).toBe(30);
		});

		test('should always return same initial state regardless of modifications', () => {
			const user = new User({
				id: '1',
				name: 'John',
				age: 30
			});

			const init1 = user.getInitInterface();

			// Modify instance
			user.name = 'Jane';
			user.age = 31;

			const init2 = user.getInitInterface();

			// Both should have original values
			expect(init1.name).toBe('John');
			expect(init2.name).toBe('John');
			expect(init1.age).toBe(30);
			expect(init2.age).toBe(30);
		});
	});

	describe('toInterface() vs getInitInterface() with complex transformations', () => {
		interface IAccount {
			id: string;
			balance: string;
			createdAt: string;
			pattern?: string;
		}

		interface IAccountTransforms {
			balance: bigint;
			createdAt: Date;
			pattern?: RegExp;
		}

		@Quick({ 
			balance: BigInt,
			createdAt: Date,
			pattern: RegExp
		})
		class Account extends QModel<IAccount> implements IAccountTransforms {
			declare id: string;
			declare balance: bigint;
			declare createdAt: Date;
			declare pattern?: RegExp;
		}

		test('should correctly serialize BigInt back to string', () => {
			const account = new Account({
				id: '1',
				balance: '999999999999999999',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			const iface = account.toInterface();
			
			expect(typeof iface.balance).toBe('string');
			expect(iface.balance).toBe('999999999999999999');
		});

		test('should handle BigInt modifications', () => {
			const account = new Account({
				id: '1',
				balance: '1000',
				createdAt: '2024-01-01T00:00:00.000Z'
			});

			account.balance = BigInt('2000');

			const iface = account.toInterface();
			const init = account.getInitInterface();
			
			expect(iface.balance).toBe('2000');
			expect(init.balance).toBe('1000');
		});

		test('should correctly serialize RegExp back to string', () => {
			const account = new Account({
				id: '1',
				balance: '1000',
				createdAt: '2024-01-01T00:00:00.000Z',
				pattern: '^test\\d+$'
			});

			const iface = account.toInterface();
			
			expect(typeof iface.pattern).toBe('string');
			expect(iface.pattern).toBe('^test\\d+$');
		});
	});

	describe('Error handling during serialization', () => {
		interface IData {
			id: string;
			data: any;
		}

		@Quick()
		class DataModel extends QModel<IData> {
			declare id: string;
			declare data: any;
		}

		test('should handle objects with functions gracefully', () => {
			const model = new DataModel({
				id: '1',
				data: {
					value: 'test',
					fn: () => 'function'
				}
			});

			// Should not throw
			expect(() => {
				const iface = model.toInterface();
				expect(iface).toBeDefined();
			}).not.toThrow();
		});

		test('should handle symbols gracefully', () => {
			const sym = Symbol('test');
			const model = new DataModel({
				id: '1',
				data: {
					[sym]: 'value',
					normal: 'prop'
				}
			});

			// Should not throw
			expect(() => {
				const iface = model.toInterface();
				expect(iface).toBeDefined();
			}).not.toThrow();
		});
	});
});
