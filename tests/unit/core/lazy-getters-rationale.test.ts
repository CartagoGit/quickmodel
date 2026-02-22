/**
 * Test: ¿Qué pasa si NO instalamos lazy getters?
 */

import { describe, test, expect } from 'bun:test';

describe('Sin lazy getters', () => {
	test('Comparación: Con lazy getters vs Sin lazy getters', () => {
		console.log('\n=== COMPARACIÓN ===\n');

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

		console.log('--- CON Lazy Getters ---');
		console.log('conGetters.id:', conGetters.id);
		console.log('conGetters.name:', conGetters.name);
		console.log('conGetters.__quickValues__:', conGetters.__quickValues__);
		console.log('Object.keys(conGetters):', Object.keys(conGetters));

		console.log('\n--- SIN Lazy Getters ---');
		console.log('sinGetters.id:', (sinGetters as any).id);
		console.log('sinGetters.name:', (sinGetters as any).name);
		console.log('sinGetters.__quickValues__:', sinGetters.__quickValues__);
		console.log('Object.keys(sinGetters):', Object.keys(sinGetters));

		// Verificaciones
		expect(conGetters.id).toBe(1);
		expect((sinGetters as any).id).toBeUndefined(); // ❌ No hay getter
		expect(sinGetters.__quickValues__.id).toBe(1); // ✅ Pero los datos están aquí
	});

	test('Problemas sin lazy getters', () => {
		console.log('\n\n=== PROBLEMAS SIN LAZY GETTERS ===\n');

		class ModelSinGetters {
			__quickValues__: any = {};
			constructor(data: any) {
				this.__quickValues__ = data;
			}
		}

		const model = new ModelSinGetters({ id: 1, name: 'Test', age: 25 });

		console.log(
			'❌ Problema 1: No puedes acceder a las propiedades directamente'
		);
		console.log('   model.id:', (model as any).id);
		console.log(
			'   Deberías usar: model.__quickValues__.id:',
			model.__quickValues__.id
		);

		console.log('\n❌ Problema 2: Serialización JSON incompleta');
		const json = JSON.stringify(model);
		console.log('   JSON.stringify(model):', json);
		console.log('   (Solo incluye __quickValues__, no las propiedades)');

		console.log('\n❌ Problema 3: Iteración con for..in no funciona');
		console.log('   for (let key in model):');
		for (const key in model) {
			console.log(`     ${key}: ${(model as any)[key]}`);
		}
		console.log('   (Solo muestra __quickValues__)');

		console.log(
			'\n❌ Problema 4: Object.keys() no devuelve las propiedades'
		);
		console.log('   Object.keys(model):', Object.keys(model));
		console.log(
			'   Deberías usar: Object.keys(model.__quickValues__):',
			Object.keys(model.__quickValues__)
		);

		console.log('\n❌ Problema 5: Spreads no funcionan');
		const spread = { ...model };
		console.log('   { ...model }:', spread);
		console.log('   (Solo copia __quickValues__)');

		console.log(
			'\n❌ Problema 6: TypeScript piensa que las propiedades existen'
		);
		interface IUser {
			id: number;
			name: string;
		}
		class UserSinGetters extends ModelSinGetters implements IUser {
			declare id: number; // TypeScript: "Esta propiedad existe"
			declare name: string; // TypeScript: "Esta propiedad existe"
		}
		const user = new UserSinGetters({ id: 1, name: 'John' });
		// TypeScript permite esto sin errores:
		console.log(
			'   user.id (TypeScript dice que existe):',
			(user as any).id
		);
		console.log('   Pero en runtime es:', typeof (user as any).id);
	});

	test('Ventajas de los lazy getters', () => {
		console.log('\n\n=== VENTAJAS DE LOS LAZY GETTERS ===\n');

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

		console.log('✅ Ventaja 1: Acceso directo natural');
		console.log('   model.id:', (model as any).id);

		console.log('\n✅ Ventaja 2: Serialización JSON completa');
		const json = JSON.stringify(model);
		console.log('   JSON.stringify(model):', json);

		console.log('\n✅ Ventaja 3: Iteración funciona');
		console.log('   for (let key in model):');
		for (const key in model) {
			if (!key.startsWith('__')) {
				console.log(`     ${key}: ${(model as any)[key]}`);
			}
		}

		console.log('\n✅ Ventaja 4: Object.keys() correcto');
		console.log(
			'   Object.keys(model).filter(k => !k.startsWith("__")):',
			Object.keys(model).filter((key) => !key.startsWith('__'))
		);

		console.log('\n✅ Ventaja 5: Spreads funcionan');
		const spread = { ...model };
		delete (spread as any).__quickValues__;
		console.log('   { ...model }:', spread);

		console.log('\n✅ Ventaja 6: TypeScript y runtime coinciden');
		console.log('   model.name existe en TypeScript: ✓');
		console.log(
			'   model.name existe en runtime:',
			typeof (model as any).name
		);
	});

	test('Alternativa sin getters: Copiar propiedades directamente', () => {
		console.log(
			'\n\n=== ALTERNATIVA: COPIAR PROPIEDADES DIRECTAMENTE ===\n'
		);

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

		console.log('Propiedades copiadas:');
		console.log('  model.id:', (model as any).id);
		console.log('  model.name:', (model as any).name);

		console.log('\n❌ Problema: Los datos están duplicados');
		console.log('  model.__quickValues__:', model.__quickValues__);
		console.log('  model.id también almacenado directamente');
		console.log('  Memoria duplicada: ✗');

		console.log('\n❌ Problema: Cambios no se sincronizan');
		(model as any).id = 999;
		console.log('  Después de model.id = 999:');
		console.log('    model.id:', (model as any).id);
		console.log('    model.__quickValues__.id:', model.__quickValues__.id);
		console.log('  (Están desincronizados!)');
	});
});
