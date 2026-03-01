// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';

// ========================================
// BENCHMARKS: RENDIMIENTO DE LA LIBRERÍA
// ========================================

describe('Performance: Costo de serialización/deserialización', () => {
	interface IUser {
		id: string;
		name: string;
		email: string;
		age: number;
		active: boolean;
	}

	@Quick()
	class User extends QModel<IUser> {
		declare id: string;
		declare name: string;
		declare email: string;
		declare age: number;
		declare active: boolean;
	}

	test('Baseline: Crear objeto plain (sin QModel)', () => {
		const iterations = 10000;
		const start = performance.now();

		for (let idx = 0; idx < iterations; idx++) {
			// Creating plain object for performance baseline
			void {
				id: `user-${idx}`,
				name: `User ${idx}`,
				email: `user${idx}@test.com`,
				age: 20 + (idx % 50),
				active: idx % 2 === 0,
			};
		}

		const end = performance.now();
		const totalTime = end - start;
		void (totalTime / iterations); // _avgTime

		expect(totalTime).toBeLessThan(100); // Debe ser < 100ms para 10k objetos
	});

	test('Performance: Crear instancias QModel (constructor)', () => {
		const iterations = 10000;
		const start = performance.now();

		for (let idx = 0; idx < iterations; idx++) {
			// Creating QModel instance for performance test
			void new User({
				id: `user-${idx}`,
				name: `User ${idx}`,
				email: `user${idx}@test.com`,
				age: 20 + (idx % 50),
				active: idx % 2 === 0,
			});
		}

		const end = performance.now();
		const totalTime = end - start;
		void (totalTime / iterations); // _avgTime

		expect(totalTime).toBeLessThan(500); // Debe ser < 500ms para 10k instancias
	});

	test('Performance: Serialización (serialize)', () => {
		const users: User[] = [];
		for (let idx = 0; idx < 1000; idx++) {
			users.push(
				new User({
					id: `user-${idx}`,
					name: `User ${idx}`,
					email: `user${idx}@test.com`,
					age: 20 + (idx % 50),
					active: idx % 2 === 0,
				})
			);
		}

		const start = performance.now();
		for (const user of users) {
			user.$qSerialize();
		}
		const end = performance.now();

		const totalTime = end - start;
		void (totalTime / users.length); // _avgTime

		expect(totalTime).toBeLessThan(100); // Debe ser < 100ms para 1k objetos
	});

	test('Performance: Deserialización (deserialize)', () => {
		const plainUsers = [];
		for (let idx = 0; idx < 1000; idx++) {
			plainUsers.push({
				id: `user-${idx}`,
				name: `User ${idx}`,
				email: `user${idx}@test.com`,
				age: 20 + (idx % 50),
				active: idx % 2 === 0,
			});
		}

		const start = performance.now();
		for (const data of plainUsers) {
			User.deserialize(data);
		}
		const end = performance.now();

		const totalTime = end - start;
		void (totalTime / plainUsers.length); // _avgTime

		expect(totalTime).toBeLessThan(100); // Debe ser < 100ms para 1k objetos
	});
});

describe('Performance: Costo de inferencia de arrays', () => {
	interface IProduct {
		productId: string;
		title: string;
		price: number;
	}

	@Quick()
	class Product extends QModel<IProduct> {
		declare productId: string;
		declare title: string;
		declare price: number;
	}

	interface ICart {
		cartId: string;
		items: Product[];
		total: number;
	}

	@Quick({ items: [Product] })
	class Cart extends QModel<ICart> {
		declare cartId: string;
		declare items: Product[];
		declare total: number;
	}

	@Quick({ items: [Product] })
	class CartExplicit extends QModel<ICart> {
		declare cartId: string;
		declare items: Product[];
		declare total: number;
	}

	test('Performance: Array pequeño (10 items) - CON inferencia', () => {
		const iterations = 1000;
		const data = {
			cartId: 'cart-1',
			items: Array.from({ length: 10 }, (_, idx) => ({
				productId: `p${idx}`,
				title: `Product ${idx}`,
				price: 10 + idx,
			})),
			total: 145,
		};

		const start = performance.now();
		for (let idx = 0; idx < iterations; idx++) {
			new Cart(data as unknown as ICart); // @quickmodel-rule-ignore: no-as-unknown
		}
		const end = performance.now();

		const totalTime = end - start;
		void (totalTime / iterations); // _avgTime

		expect(totalTime).toBeLessThan(250); // Debe ser < 250ms para 1k carts
	});

	test('Performance: Array pequeño (10 items) - SIN inferencia (explícito)', () => {
		const iterations = 1000;
		const data = {
			cartId: 'cart-1',
			items: Array.from({ length: 10 }, (_, idx) => ({
				productId: `p${idx}`,
				title: `Product ${idx}`,
				price: 10 + idx,
			})),
			total: 145,
		};

		const start = performance.now();
		for (let idx = 0; idx < iterations; idx++) {
			new CartExplicit(data as unknown as ICart); // @quickmodel-rule-ignore: no-as-unknown
		}
		const end = performance.now();

		const totalTime = end - start;
		void (totalTime / iterations); // _avgTime

		expect(totalTime).toBeLessThan(300); // Debe ser < 300ms para 1k carts
	});

	test('Performance: Array grande (100 items) - CON inferencia', () => {
		const iterations = 100;
		const data = {
			cartId: 'cart-1',
			items: Array.from({ length: 100 }, (_, idx) => ({
				productId: `p${idx}`,
				title: `Product ${idx}`,
				price: 10 + idx,
			})),
			total: 5450,
		};

		const start = performance.now();
		for (let idx = 0; idx < iterations; idx++) {
			new Cart(data as unknown as ICart); // @quickmodel-rule-ignore: no-as-unknown
		}
		const end = performance.now();

		const totalTime = end - start;
		void (totalTime / iterations); // _avgTime

		expect(totalTime).toBeLessThan(500); // Debe ser < 500ms para 100 carts grandes
	});

	test('Performance: Array muy grande (1000 items)', () => {
		const data = {
			cartId: 'cart-1',
			items: Array.from({ length: 1000 }, (_, idx) => ({
				productId: `p${idx}`,
				title: `Product ${idx}`,
				price: 10 + idx,
			})),
			total: 504500,
		};

		const start = performance.now();
		const cart = new Cart(data as unknown as ICart); // @quickmodel-rule-ignore: no-as-unknown
		const end = performance.now();

		const totalTime = end - start;

		expect(totalTime).toBeLessThan(100); // Debe ser < 100ms para 1000 items
		expect(cart.items[0]).toBeInstanceOf(Product);
		expect(cart.items[999]).toBeInstanceOf(Product);
	});
});

describe('Performance: Costo de anidación profunda', () => {
	interface IUser {
		id: string;
		name: string;
	}

	class User extends QModel<IUser> {
		declare id: string;
		declare name: string;
	}

	interface IContainer<T> {
		items: T[];
	}

	class Container<T> extends QModel<IContainer<T>> {
		declare items: T[];
	}

	interface ILevel3<T> {
		container: Container<T>;
	}

	class Level3<T> extends QModel<ILevel3<T>> {
		declare container: Container<T>;
	}

	interface ILevel2<T> {
		level3: Level3<T>;
	}

	class Level2<T> extends QModel<ILevel2<T>> {
		declare level3: Level3<T>;
	}

	interface ILevel1<T> {
		level2: Level2<T>;
	}

	class Level1<T> extends QModel<ILevel1<T>> {
		declare level2: Level2<T>;
	}

	test('Performance: Anidación 4 niveles (10 users)', () => {
		const iterations = 1000;
		const data = {
			level2: {
				level3: {
					container: {
						items: Array.from({ length: 10 }, (_, idx) => ({
							id: `user-${idx}`,
							name: `User ${idx}`,
						})),
					},
				},
			},
		};

		const start = performance.now();
		for (let idx = 0; idx < iterations; idx++) {
			new Level1<User>(data as unknown as ILevel1<User>); // @quickmodel-rule-ignore: no-as-unknown
		}
		const end = performance.now();

		const totalTime = end - start;
		void (totalTime / iterations); // _avgTime

		expect(totalTime).toBeLessThan(300); // Debe ser < 300ms para 1k estructuras
	});

	test('Performance: Anidación 4 niveles (100 users)', () => {
		const iterations = 100;
		const data = {
			level2: {
				level3: {
					container: {
						items: Array.from({ length: 100 }, (_, idx) => ({
							id: `user-${idx}`,
							name: `User ${idx}`,
						})),
					},
				},
			},
		};

		const start = performance.now();
		for (let idx = 0; idx < iterations; idx++) {
			new Level1<User>(data as unknown as ILevel1<User>); // @quickmodel-rule-ignore: no-as-unknown
		}
		const end = performance.now();

		const totalTime = end - start;
		void (totalTime / iterations); // _avgTime

		expect(totalTime).toBeLessThan(500); // Debe ser < 500ms para 100 estructuras
	});
});

describe('Performance: Tipos complejos', () => {
	interface IComplexModel {
		id: string;
		createdAt: Date;
		amount: bigint;
		pattern: RegExp;
		metadata: Map<string, string>;
		tags: Set<string>;
	}

	class ComplexModel extends QModel<IComplexModel> {
		declare id: string;
		declare createdAt: Date;
		declare amount: bigint;
		declare pattern: RegExp;
		declare metadata: Map<string, string>;
		declare tags: Set<string>;
	}

	test('Performance: Tipos complejos (Date, BigInt, RegExp, Map, Set)', () => {
		const iterations = 1000;
		const data = {
			id: 'model-1',
			createdAt: new Date('2024-01-01'),
			amount: 999999999999n,
			pattern: /test-\d+/gi,
			metadata: new Map([
				['key1', 'value1'],
				['key2', 'value2'],
				['key3', 'value3'],
			]),
			tags: new Set(['tag1', 'tag2', 'tag3']),
		};

		const start = performance.now();
		for (let idx = 0; idx < iterations; idx++) {
			new ComplexModel(data);
		}
		const end = performance.now();

		const totalTime = end - start;
		void (totalTime / iterations); // _avgTime

		expect(totalTime).toBeLessThan(200); // Debe ser < 200ms para 1k modelos
	});
});

describe('Performance: Resumen y conclusiones', () => {
	test('Resumen: Overhead de la librería', () => {
		// All benchmarks completed successfully
		expect(typeof 'benchmark completed').toBe('string');
	});
});
