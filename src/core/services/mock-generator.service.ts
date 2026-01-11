/**
 * Service for generating mock data for models.
 * Uses faker to generate realistic random data.
 */

import 'reflect-metadata';
import { QTYPES_METADATA_KEY } from '../decorators/qtype.decorator';
import { QUICK_TYPE_MAP_KEY } from '../constants/metadata-keys';

// Import type only
import type { Faker } from '@faker-js/faker';

export type MockType = 'empty' | 'random' | 'minimal' | 'full' | 'sample';

export class MockGenerator {
	private fakerInstance?: Faker;

	/**
	 * Creates a new MockGenerator instance.
	 */
	constructor() {}

	/**
	 * Lazily loads the faker instance.
	 * Throws an error if @faker-js/faker is not installed.
	 */
	private async ensureFaker(): Promise<Faker> {
		if (this.fakerInstance) {
			return this.fakerInstance;
		}

		try {
			// Dynamic import to avoid hard dependency
			const fakerModule = await import('@faker-js/faker');
			this.fakerInstance = fakerModule.faker;
			return this.fakerInstance;
		} catch {
			// Try synchronous require as fallback (Node/CJS environments)
			try {
				/* eslint-disable @typescript-eslint/no-var-requires */
				// @ts-ignore
				// eslint-disable-next-line
				const fakerLib = require('@faker-js/faker');
				this.fakerInstance = fakerLib.faker;
				return this.fakerInstance as Faker;
			} catch {
				throw new Error(
					'The "@faker-js/faker" package is required for mocking. Please install it as a dev dependency: npm install -D @faker-js/faker'
				);
			}
		}
	}

	/**
	 * Generates a mock based on reflect metadata.
	 *
	 * Note: While this method signature appears synchronous, internally it relies on faker being loaded.
	 * Since dynamic imports are async, this might pose a challenge for synchronous APIs.
	 * However, in most test environments using Node/Bun, `require` is available or the user
	 * can ensuring pre-loading if needed. We assume for now strict dynamic import works or valid CJS fallback.
	 *
	 * UNFORTUNATELY: Changing this to async would break the public API.
	 * We will try to rely on the fact that if this is called, we are likely in a test environment.
	 * If we are in an ESM environment where top-level await isn't available and no `require`,
	 * we might fail. This is a known trade-off for making it optional without breaking API.
	 */
	generate<
		TModel,
		TData extends Record<string, unknown> = Record<string, unknown>,
	>(
		modelClass: new (data: TData) => TModel,
		type: MockType = 'random',
		overrides: Partial<TData> = {}
	): TData {
		// We can't await here. This is a limitation.
		// We must assume that if the user calls generate(), they are in an env where we can get faker.
		// If `this.fakerInstance` is missing, we try to get it synchronously.

		if (!this.fakerInstance) {
			try {
				// Try sync require (Node/Bun/CJS)
				// @ts-ignore
				// eslint-disable-next-line
				const req = typeof require !== 'undefined' ? require : null;
				if (req) {
					// @ts-ignore
					this.fakerInstance = req('@faker-js/faker').faker;
				} else {
					throw new Error('No require');
				}
			} catch {
				throw new Error(
					'QuickModel: Synchronous mock generation requires "@faker-js/faker" to be synchronously loadable (CommonJS/Node). \n' +
						'In pure ESM environments, you might need to ensure it is loaded. \n' +
						'Please install: npm install -D @faker-js/faker'
				);
			}
		}

		if (!this.fakerInstance) {
			throw new Error(
				'Critical: Faker instance could not be loaded. Please install @faker-js/faker.'
			);
		}

		return this.generateSync(modelClass, type, overrides);
	}

	// Internal sync generation logic
	private generateSync<
		TModel,
		TData extends Record<string, unknown> = Record<string, unknown>,
	>(
		modelClass: new (data: TData) => TModel,
		type: MockType,
		overrides: Partial<TData>
	): TData {
		const instance = Object.create(modelClass.prototype);
		const mock: Record<string, unknown> = {};

		const properties = this.getDecoratedProperties(instance);
		const overrideData = overrides as Record<string, unknown>;

		for (const key of properties) {
			if (key in overrideData) {
				mock[key] = overrideData[key];
				continue;
			}

			let fieldType = Reflect.getMetadata(
				'fieldType',
				modelClass.prototype,
				key
			);
			let designType = Reflect.getMetadata(
				'design:type',
				modelClass.prototype,
				key
			);
			let arrayElementClass = Reflect.getMetadata(
				'arrayElementClass',
				modelClass.prototype,
				key
			);

			if (!fieldType && !designType && !arrayElementClass) {
				const typeMap = Reflect.getMetadata(
					QUICK_TYPE_MAP_KEY,
					modelClass
				);
				if (typeMap && typeMap[key]) {
					const mappedType = typeMap[key];
					if (mappedType === Array) {
						arrayElementClass = Array;
						designType = Array;
					} else if (Array.isArray(mappedType)) {
						designType = Array;
						if (mappedType.length > 0) {
							arrayElementClass = mappedType[0];
						}
					} else if (typeof mappedType === 'function') {
						const name = mappedType.name.toLowerCase();
						if (
							['date', 'regexp', 'set', 'map', 'bigint'].includes(
								name
							)
						) {
							fieldType = name;
						} else {
							fieldType = mappedType;
						}
					} else if (typeof mappedType === 'string') {
						fieldType = mappedType;
					}
				}
			}

			mock[key] = this.generateValue(
				type,
				fieldType,
				designType,
				arrayElementClass
			);
		}

		return { ...mock, ...overrideData } as unknown as TData;
	}

	/**
	 * Generates an array of mocks.
	 */
	generateArray<
		TModel,
		TData extends Record<string, unknown> = Record<string, unknown>,
	>(
		modelClass: new (data: TData) => TModel,
		count: number,
		type: MockType = 'random',
		overrides?: (index: number) => Partial<TData>
	): TData[] {
		return Array.from({ length: count }, (_, index) => {
			const itemOverrides = overrides ? overrides(index) : {};
			return this.generate(modelClass, type, itemOverrides);
		});
	}

	private getDecoratedProperties(
		instance: Record<string, unknown>
	): string[] {
		const properties: Set<string> = new Set();
		let current = instance;
		while (current && current !== Object.prototype) {
			const registeredFields = Reflect.getMetadata(
				QTYPES_METADATA_KEY,
				current
			) as string[] | undefined;

			if (registeredFields) {
				for (const field of registeredFields) {
					properties.add(field);
				}
			}
			current = Object.getPrototypeOf(current);
		}

		if (properties.size === 0) {
			const typeMap = Reflect.getMetadata(
				QUICK_TYPE_MAP_KEY,
				instance.constructor
			) as Record<string, unknown> | undefined;
			if (typeMap) {
				for (const key of Object.keys(typeMap)) {
					properties.add(key);
				}
			}
		}
		return Array.from(properties);
	}

	private generateValue(
		type: MockType,
		fieldType: unknown,
		designType: Function | undefined,
		arrayElementClass: unknown
	): unknown {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const faker = this.fakerInstance!;

		if (arrayElementClass && designType === Array) {
			if (arrayElementClass === Array) {
				return this.getDefaultValue(type, 'array');
			}
			const length =
				type === 'minimal'
					? 1
					: type === 'empty'
						? 0
						: faker.number.int({ min: 1, max: 3 });
			return this.generateArray(
				arrayElementClass as new (
					data: Record<string, unknown>
				) => unknown,
				length,
				type
			);
		}

		if (arrayElementClass && !fieldType) {
			return this.generate(
				arrayElementClass as new (
					data: Record<string, unknown>
				) => unknown,
				type
			);
		}

		if (fieldType) {
			return this.generateByFieldType(
				type,
				fieldType as string | symbol | Function
			);
		}

		if (designType) {
			return this.generateByDesignType(type, designType);
		}

		return this.getDefaultValue(type, 'string');
	}

	private generateByFieldType(
		type: MockType,
		fieldType: symbol | string | Function
	): unknown {
		const typeStr =
			typeof fieldType === 'symbol'
				? fieldType.toString()
				: typeof fieldType === 'string'
					? fieldType
					: fieldType.name;

		if (typeStr === 'string' || typeStr === 'String')
			return this.getDefaultValue(type, 'string');
		if (typeStr === 'number' || typeStr === 'Number')
			return this.getDefaultValue(type, 'number');
		if (typeStr === 'boolean' || typeStr === 'Boolean')
			return this.getDefaultValue(type, 'boolean');
		if (typeStr === 'object' || typeStr === 'Object')
			return this.getDefaultValue(type, 'object');

		if (typeStr === 'array' || typeStr === 'Array')
			return this.getDefaultValue(type, 'array');
		if (typeStr === 'set' || typeStr === 'Set')
			return this.getDefaultValue(type, 'set');
		if (typeStr === 'map' || typeStr === 'Map')
			return this.getDefaultValue(type, 'map');

		if (typeStr === 'date' || typeStr === 'Date')
			return this.getDefaultValue(type, 'date');
		if (typeStr === 'bigint' || typeStr === 'BigInt')
			return this.getDefaultValue(type, 'bigint');
		if (typeStr === 'symbol' || typeStr === 'Symbol')
			return this.getDefaultValue(type, 'symbol');
		if (typeStr === 'regexp' || typeStr === 'RegExp')
			return this.getDefaultValue(type, 'regexp');
		if (typeStr === 'error' || typeStr === 'Error')
			return this.getDefaultValue(type, 'error');

		if (typeStr === 'url' || typeStr === 'URL')
			return this.getDefaultValue(type, 'url');
		if (typeStr === 'urlsearchparams' || typeStr === 'URLSearchParams')
			return this.getDefaultValue(type, 'urlsearchparams');

		if (typeStr === 'arraybuffer' || typeStr === 'ArrayBuffer')
			return this.getDefaultValue(type, 'arraybuffer');
		if (typeStr === 'dataview' || typeStr === 'DataView')
			return this.getDefaultValue(type, 'dataview');

		// TypedArrays
		const typedArrays = [
			'int8array',
			'uint8array',
			'int16array',
			'uint16array',
			'int32array',
			'uint32array',
			'float32array',
			'float64array',
			'bigint64array',
			'biguint64array',
		];
		if (
			typedArrays.includes(typeStr.toLowerCase()) ||
			typedArrays.some(
				(t) => t.toLowerCase() === typeStr.toLowerCase() + 'array' // handle generic cases if needed
			)
		) {
			// exact match logic continues below
		}

		// Simplify typed array check
		if (
			typeStr.toLowerCase().endsWith('array') &&
			typeStr.toLowerCase() !== 'array'
		) {
			// Fall through to exact string matching in generateValue which used exact strings
		}

		// Just use original logic for simplicity
		if (typeStr === 'int8array' || typeStr === 'Int8Array')
			return this.getDefaultValue(type, 'int8array');
		if (typeStr === 'uint8array' || typeStr === 'Uint8Array')
			return this.getDefaultValue(type, 'uint8array');
		if (typeStr === 'int16array' || typeStr === 'Int16Array')
			return this.getDefaultValue(type, 'int16array');
		if (typeStr === 'uint16array' || typeStr === 'Uint16Array')
			return this.getDefaultValue(type, 'uint16array');
		if (typeStr === 'int32array' || typeStr === 'Int32Array')
			return this.getDefaultValue(type, 'int32array');
		if (typeStr === 'uint32array' || typeStr === 'Uint32Array')
			return this.getDefaultValue(type, 'uint32array');
		if (typeStr === 'float32array' || typeStr === 'Float32Array')
			return this.getDefaultValue(type, 'float32array');
		if (typeStr === 'float64array' || typeStr === 'Float64Array')
			return this.getDefaultValue(type, 'float64array');
		if (typeStr === 'bigint64array' || typeStr === 'BigInt64Array')
			return this.getDefaultValue(type, 'bigint64array');
		if (typeStr === 'biguint64array' || typeStr === 'BigUint64Array')
			return this.getDefaultValue(type, 'biguint64array');

		return this.getDefaultValue(type, 'string');
	}

	private generateByDesignType(
		type: MockType,
		designType: Function
	): unknown {
		const typeName = designType.name;
		if (typeName === 'String') return this.getDefaultValue(type, 'string');
		if (typeName === 'Number') return this.getDefaultValue(type, 'number');
		if (typeName === 'Boolean')
			return this.getDefaultValue(type, 'boolean');
		if (typeName === 'Date') return this.getDefaultValue(type, 'date');
		if (typeName === 'Array') return this.getDefaultValue(type, 'array');
		if (typeName === 'Object') return this.getDefaultValue(type, 'object');
		if (typeName === 'Map') return this.getDefaultValue(type, 'map');
		if (typeName === 'Set') return this.getDefaultValue(type, 'set');

		return this.getDefaultValue(type, 'string');
	}

	private getDefaultValue(type: MockType, jsType: string): unknown {
		if (type === 'empty') return this.getEmptyValue(jsType);
		if (type === 'minimal' || type === 'sample')
			return this.getSampleValue(jsType);
		return this.getRandomValue(jsType);
	}

	private getEmptyValue(jsType: string): unknown {
		switch (jsType) {
			case 'string':
				return '';
			case 'number':
				return 0;
			case 'boolean':
				return false;
			case 'bigint':
				return '0';
			case 'symbol':
				return Symbol();
			case 'date':
				return new Date(0).toISOString();
			case 'regexp':
				return /(?:)/.toString();
			case 'error':
				return new Error();
			case 'url':
				return 'http://localhost';
			case 'urlsearchparams':
				return new URLSearchParams();
			case 'array':
				return [];
			case 'object':
				return {};
			case 'map':
				return new Map();
			case 'set':
				return new Set();
			case 'int8array':
				return new Int8Array(0);
			case 'uint8array':
				return new Uint8Array(0);
			case 'int16array':
				return new Int16Array(0);
			case 'uint16array':
				return new Uint16Array(0);
			case 'int32array':
				return new Int32Array(0);
			case 'uint32array':
				return new Uint32Array(0);
			case 'float32array':
				return new Float32Array(0);
			case 'float64array':
				return new Float64Array(0);
			case 'bigint64array':
				return new BigInt64Array(0);
			case 'biguint64array':
				return new BigUint64Array(0);
			case 'arraybuffer':
				return new ArrayBuffer(0);
			case 'dataview':
				return new DataView(new ArrayBuffer(0));
			default:
				return null;
		}
	}

	private getSampleValue(jsType: string): unknown {
		switch (jsType) {
			case 'string':
				return 'sample';
			case 'number':
				return 42;
			case 'boolean':
				return true;
			case 'bigint':
				return '123';
			case 'symbol':
				return Symbol('sample');
			case 'date':
				return new Date('2024-01-01').toISOString();
			case 'regexp':
				return '/test/gi';
			case 'error':
				return new Error('Sample error');
			case 'url':
				return 'https://example.com';
			case 'urlsearchparams':
				return new URLSearchParams('key=value');
			case 'array':
				return ['sample'];
			case 'object':
				return { sample: true };
			case 'map':
				return new Map([['key', 'value']]);
			case 'set':
				return new Set(['sample']);
			case 'int8array':
				return new Int8Array([1, 2, 3]);
			case 'uint8array':
				return new Uint8Array([1, 2, 3]);
			case 'int16array':
				return new Int16Array([1, 2, 3]);
			case 'uint16array':
				return new Uint16Array([1, 2, 3]);
			case 'int32array':
				return new Int32Array([1, 2, 3]);
			case 'uint32array':
				return new Uint32Array([1, 2, 3]);
			case 'float32array':
				return new Float32Array([1.0, 2.0, 3.0]);
			case 'float64array':
				return new Float64Array([1.0, 2.0, 3.0]);
			case 'bigint64array':
				return new BigInt64Array([1n, 2n, 3n]);
			case 'biguint64array':
				return new BigUint64Array([1n, 2n, 3n]);
			case 'arraybuffer':
				return new Uint8Array([1, 2, 3]).buffer;
			case 'dataview':
				return new DataView(new Uint8Array([1, 2, 3]).buffer);
			default:
				return null;
		}
	}

	private getRandomValue(jsType: string): unknown {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const faker = this.fakerInstance!;
		switch (jsType) {
			case 'string':
				return faker.lorem.word();
			case 'number':
				return faker.number.int({ min: 1, max: 1000 });
			case 'boolean':
				return faker.datatype.boolean();
			case 'bigint':
				return String(faker.number.int({ min: 1, max: 999999 }));
			case 'symbol':
				return Symbol(faker.lorem.word());
			case 'date':
				return faker.date.recent().toISOString();
			case 'regexp': {
				const patterns = ['\\w+', '\\d+', '[a-z]+', '.*'];
				const flags = ['', 'i', 'g', 'gi', 'm'];
				const pattern = faker.helpers.arrayElement(patterns);
				const flag = faker.helpers.arrayElement(flags);
				return `/${pattern}/${flag}`;
			}
			case 'error':
				return new Error(faker.lorem.sentence());
			case 'url':
				return faker.internet.url();
			case 'urlsearchparams': {
				const params = new URLSearchParams();
				params.set(faker.lorem.word(), faker.lorem.word());
				return params;
			}
			case 'array':
				return Array.from(
					{ length: faker.number.int({ min: 1, max: 3 }) },
					() => faker.lorem.word()
				);
			case 'object':
				return { [faker.lorem.word()]: faker.lorem.word() };
			case 'map': {
				const map = new Map();
				map.set(faker.lorem.word(), faker.lorem.word());
				return map;
			}
			case 'set':
				return new Set([faker.lorem.word(), faker.lorem.word()]);
			case 'int8array':
				return new Int8Array(
					Array.from({ length: 3 }, () =>
						faker.number.int({ min: -128, max: 127 })
					)
				);
			case 'uint8array':
				return new Uint8Array(
					Array.from({ length: 3 }, () =>
						faker.number.int({ min: 0, max: 255 })
					)
				);
			case 'int16array':
				return new Int16Array(
					Array.from({ length: 3 }, () =>
						faker.number.int({ min: -32768, max: 32767 })
					)
				);
			case 'uint16array':
				return new Uint16Array(
					Array.from({ length: 3 }, () =>
						faker.number.int({ min: 0, max: 65535 })
					)
				);
			case 'int32array':
				return new Int32Array(
					Array.from({ length: 3 }, () =>
						faker.number.int({ min: -2147483648, max: 2147483647 })
					)
				);
			case 'uint32array':
				return new Uint32Array(
					Array.from({ length: 3 }, () =>
						faker.number.int({ min: 0, max: 4294967295 })
					)
				);
			case 'float32array':
				return new Float32Array(
					Array.from({ length: 3 }, () => faker.number.float())
				);
			case 'float64array':
				return new Float64Array(
					Array.from({ length: 3 }, () => faker.number.float())
				);
			case 'bigint64array':
				return new BigInt64Array(
					Array.from({ length: 3 }, () => BigInt(faker.number.int()))
				);
			case 'biguint64array':
				return new BigUint64Array(
					Array.from({ length: 3 }, () =>
						BigInt(faker.number.int({ min: 0 }))
					)
				);
			case 'arraybuffer': {
				const arr = new Uint8Array(
					Array.from({ length: 8 }, () =>
						faker.number.int({ min: 0, max: 255 })
					)
				);
				return arr.buffer;
			}
			case 'dataview': {
				const arr = new Uint8Array(
					Array.from({ length: 8 }, () =>
						faker.number.int({ min: 0, max: 255 })
					)
				);
				return new DataView(arr.buffer);
			}
			default:
				return null;
		}
	}
}
