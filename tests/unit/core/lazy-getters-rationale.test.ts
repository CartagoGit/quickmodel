/**
 * Test: ¿Qué pasa si NO instalamos lazy getters?
 */

import { describe, test, expect } from 'bun:test';

describe('Sin lazy getters', () => {
	test('Comparación: Con lazy getters vs Sin lazy getters', () => {
		// Versión 1: CON lazy getters (como funciona QModel actualmente)
		class ModelConGetters {
			__quickValues__: any = {};
			declare id: number;
			declare name: string;

			constructor(data: any) {
				this.__quickValues__ = data;

				// Instalamos lazy getters
				for (const key of Object.keys(data)) {
					Object.defineProperty(this, key, {
						get() {
							return this.__quickValues__[key];
						},
						set(val) {
							this.__quickValues__[key] = val;
						},
						enumerable: true,
						configurable: true,
					});
				}
			}
		}

		// Versión 2: SIN lazy getters
		class ModelSinGetters {
			__quickValues__: any = {};

			constructor(data: any) {
				this.__quickValues__ = data;
				// NO instalamos getters
			}
		}

		const conGetters = new ModelConGetters({ id: 1, name: 'Test' });
		const sinGetters = new ModelSinGetters({ id: 1, name: 'Test' });

		// Verificaciones
		expect(conGetters.id).toBe(1);
		expect((sinGetters as any).id).toBeUndefined(); // ❌ No hay getter
		expect(sinGetters.__quickValues__.id).toBe(1); // ✅ Pero los datos están aquí
	});

	test('Problemas sin lazy getters', () => {
		class ModelSinGetters {
			__quickValues__: any = {};
			constructor(data: any) {
				this.__quickValues__ = data;
			}
		}

		const model = new ModelSinGetters({ id: 1, name: 'Test', age: 25 });

		// Sin lazy getters, las propiedades no son accesibles directamente
		expect((model as any).id).toBeUndefined();
		expect((model as any).name).toBeUndefined();
		// Los datos sí están en __quickValues__
		expect(model.__quickValues__.id).toBe(1);

		// JSON.stringify solo serializa __quickValues__, no las propiedades directas
		const json = JSON.stringify(model);
		const parsed = JSON.parse(json) as Record<string, unknown>;
		expect(Object.keys(parsed)).toContain('__quickValues__');
		// Las propiedades NO son claves de nivel raíz (solo están dentro de __quickValues__)
		expect(Object.keys(parsed)).not.toContain('id');
		expect(Object.keys(parsed)).not.toContain('name');

		// Object.keys solo devuelve __quickValues__
		expect(Object.keys(model)).toEqual(['__quickValues__']);

		// Spread solo copia __quickValues__
		const spread = { ...model };
		expect(spread).not.toHaveProperty('id');
		expect(spread).toHaveProperty('__quickValues__');

		interface IUser {
			id: number;
			name: string;
		}
		class UserSinGetters extends ModelSinGetters implements IUser {
			declare id: number;
			declare name: string;
		}
		const user = new UserSinGetters({ id: 1, name: 'John' });
		// TypeScript permite acceder a user.id pero en runtime es undefined
		expect((user as any).id).toBeUndefined();
	});

	test('Ventajas de los lazy getters', () => {
		class ModelConGetters {
			__quickValues__: any = {};
			constructor(data: any) {
				this.__quickValues__ = data;
				for (const key of Object.keys(data)) {
					Object.defineProperty(this, key, {
						get() {
							return this.__quickValues__[key];
						},
						set(val) {
							this.__quickValues__[key] = val;
						},
						enumerable: true,
						configurable: true,
					});
				}
			}
		}

		const model = new ModelConGetters({ id: 1, name: 'Test', age: 25 });

		// Con lazy getters, las propiedades son accesibles directamente
		expect((model as any).id).toBe(1);
		expect((model as any).name).toBe('Test');

		// JSON.stringify incluye todas las propiedades
		const json = JSON.stringify(model);
		expect(json).toContain('"id":1');
		expect(json).toContain('"name":"Test"');

		// Object.keys incluye las propiedades (además de __quickValues__)
		const keys = Object.keys(model).filter((key) => !key.startsWith('__'));
		expect(keys).toContain('id');
		expect(keys).toContain('name');
		expect(keys).toContain('age');

		// Spreads incluyen las propiedades
		const spread = { ...model };
		delete (spread as any).__quickValues__;
		expect(spread).toMatchObject({ id: 1, name: 'Test', age: 25 });
	});

	test('Alternativa sin getters: Copiar propiedades directamente', () => {
		class ModelCopiado {
			__quickValues__: any = {};

			constructor(data: any) {
				this.__quickValues__ = data;

				// En vez de getters, copiar valores directamente
				for (const key of Object.keys(data)) {
					(this as any)[key] = data[key];
				}
			}
		}

		const model = new ModelCopiado({ id: 1, name: 'Test' });

		// Las propiedades son accesibles (copiadas directamente)
		expect((model as any).id).toBe(1);
		expect((model as any).name).toBe('Test');

		// Pero al mutar la propiedad directa, __quickValues__ queda desincronizado
		(model as any).id = 999;
		expect((model as any).id).toBe(999);
		expect(model.__quickValues__.id).toBe(1); // __quickValues__ NO se actualizó
	});
});
