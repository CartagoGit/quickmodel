/**
 * Explicación: Por qué id! no funciona sin @Quick()
 */

import { describe, test } from 'bun:test';

describe('Por qué id! no funciona sin @Quick()', () => {
	
	test('Explicación paso a paso', () => {
		console.log('\n=== EXPLICACIÓN DEL PROBLEMA ===\n');

		// Simulamos QModel simplificado
		class SimpleQModel {
			__quickValues__: any = {};

			constructor(data: any) {
				console.log('1. Constructor QModel ejecutándose...');
				this.__quickValues__ = data;
				
				// QModel intenta instalar lazy getters
				const keys = Object.keys(data);
				for (const key of keys) {
					console.log(`2. Instalando lazy getter para "${key}"`);
					Object.defineProperty(this, key, {
						get() { 
							console.log(`   → Getter llamado para "${key}"`);
							return this.__quickValues__[key]; 
						},
						set(val) { 
							console.log(`   → Setter llamado para "${key}" = ${val}`);
							this.__quickValues__[key] = val; 
						},
						enumerable: true,
						configurable: true
					});
				}
				console.log('3. Lazy getters instalados ✓');
			}
		}

		// Caso 1: Con id! (definite assignment)
		console.log('\n--- Caso 1: Con id! ---');
		class PostWithExclamation extends SimpleQModel {
			id!: number;
			title!: string;
			
			// TypeScript compila esto aproximadamente así:
			constructor(data: any) {
				super(data);
				console.log('4. Constructor hijo ejecutándose...');
				// ⚠️ TypeScript emite estas líneas:
				this.id = this.id;      // Esto SOBRESCRIBE el getter
				this.title = this.title; // Esto SOBRESCRIBE el getter
				console.log('5. Propiedades inicializadas (sobrescritas) ✗');
			}
		}

		const post1 = new PostWithExclamation({ id: 1, title: 'Test' });
		console.log('\n6. Intentando acceder a post1.id:');
		console.log('   Valor:', post1.id);
		console.log('   Descriptor:', Object.getOwnPropertyDescriptor(post1, 'id'));

		// Caso 2: Con declare
		console.log('\n\n--- Caso 2: Con declare ---');
		class PostWithDeclare extends SimpleQModel {
			declare id: number;
			declare title: string;
			
			// TypeScript NO emite código para declare
			constructor(data: any) {
				super(data);
				console.log('4. Constructor hijo ejecutándose...');
				// ✅ NO hay código de inicialización
				console.log('5. Los lazy getters permanecen intactos ✓');
			}
		}

		const post2 = new PostWithDeclare({ id: 2, title: 'Test' });
		console.log('\n6. Intentando acceder a post2.id:');
		console.log('   Valor:', post2.id);
		console.log('   Descriptor:', Object.getOwnPropertyDescriptor(post2, 'id'));
	});

	test('Qué hace @Quick() para solucionar esto', () => {
		console.log('\n\n=== SOLUCIÓN CON @Quick() ===\n');

		// Simulamos cómo @Quick() funciona
		function Quick() {
			return function(target: any) {
				console.log('1. Decorador @Quick() ejecutándose ANTES del constructor');
				
				const original = target;
				const newConstructor: any = function(...args: any[]) {
					console.log('2. Constructor wrapeado ejecutándose...');
					const instance = new original(...args);
					
					// @Quick() reinstala los getters DESPUÉS de la construcción
					console.log('3. @Quick() reinstalando lazy getters...');
					const data = instance.__quickValues__;
					for (const key of Object.keys(data)) {
						Object.defineProperty(instance, key, {
							get() { return this.__quickValues__[key]; },
							set(val) { this.__quickValues__[key] = val; },
							enumerable: true,
							configurable: true
						});
					}
					console.log('4. Lazy getters reinstalados ✓');
					return instance;
				};
				
				newConstructor.prototype = original.prototype;
				return newConstructor;
			};
		}

		class SimpleQModel {
			__quickValues__: any = {};
			constructor(data: any) {
				this.__quickValues__ = data;
			}
		}

		@Quick()
		class PostWithQuick extends SimpleQModel {
			id!: number;
			title!: string;
		}

		console.log('\n--- Creando instancia con @Quick() ---');
		const post = new PostWithQuick({ id: 1, title: 'Test' });
		
		console.log('\n5. Accediendo a post.id:');
		console.log('   Valor:', post.id);
		console.log('   Descriptor:', Object.getOwnPropertyDescriptor(post, 'id'));
	});
});
