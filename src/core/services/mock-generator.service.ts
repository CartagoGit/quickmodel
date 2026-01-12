/**
 * Service for generating mock data for models.
 * Uses faker to generate realistic random data.
 */

import 'reflect-metadata';
import { faker } from '@faker-js/faker';
import { QTYPES_METADATA_KEY } from '../decorators/qtype.decorator';
import {
	QUICK_OPTIONS_KEY,
	QUICK_TYPE_MAP_KEY,
} from '../constants/metadata-keys';
import { IQAdvancedOptions } from '../interfaces/quick-options.interface';

export type IQMockType = 'empty' | 'random' | 'minimal' | 'full' | 'sample';

export class QMockGenerator {
	/**
	 * Creates a new QMockGenerator instance.
	 */
	constructor() {}

	/**
	 * Generates a mock based on reflect metadata.
	 */
	generate<
		TModel,
		TData extends Record<string, unknown> = Record<string, unknown>,
	>(
		modelClass: new (data: TData) => TModel,
		type: IQMockType = 'random',
		overrides: Partial<TData> = {}
	): TData {
		const instance = Object.create(modelClass.prototype);
		const mock: Record<string, unknown> = {};

        console.log('DEBUG: MockGenerator.generate model:', modelClass.name);
        console.log('DEBUG: MockGenerator instance has initialize?', typeof (instance as any).initialize);

		// Obtener todas las propiedades con metadata
		const properties = this.getDecoratedProperties(instance);
		// Explicit typing for key to satisfy index signature requirements
		const overrideData = overrides as Record<string, unknown>;

		// Get advanced options (for mockers)
		const options: IQAdvancedOptions =
			Reflect.getMetadata(QUICK_OPTIONS_KEY, modelClass) || {};

		for (const key of properties) {
			// If override exists, use it
			if (key in overrideData) {
				mock[key] = overrideData[key];
				continue;
			}

			// 🔥 CHECK 1: Custom mocker from @Quick options (Highest Priority)
			if (
				options.mockers &&
				key in options.mockers &&
				typeof options.mockers[key] === 'function'
			) {
				mock[key] = options.mockers[key]();
				continue;
			}

			// 🔥 CHECK 2: Custom mocker from @QType metadata (High Priority)
			const customMocker = Reflect.getMetadata(
				'customMocker',
				modelClass.prototype,
				key
			);
			if (customMocker && typeof customMocker === 'function') {
				mock[key] = customMocker();
				continue;
			}

			// 🔥 CHECK 3: Validation Warning - Missing Mocker for Custom Transformer
			// If a custom transformer is present but NO mocker is defined, warn the user.
			// The library cannot know how to mock the input expected by the transformer.
			const customTransformer =
				(options.transformers && options.transformers[key]) ||
				Reflect.getMetadata(
					'customTransformer',
					modelClass.prototype,
					key
				);

			if (customTransformer) {
				console.warn(
					`[QuickModel] Warning: Property '${String(
						key
					)}' in model '${
						modelClass.name
					}' has a Custom Transformer but NO Custom Mocker. ` +
						`Generated mock data might not satisfy the transformer's expectations. ` +
						`Please add a 'mocker' in @Quick options or @QType options.`
				);
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

			// FALLBACK: If metadata is missing but property is in Quick TypeMap, try to resolve it from there
			if (!fieldType && !designType && !arrayElementClass) {
				const typeMap = Reflect.getMetadata(
					QUICK_TYPE_MAP_KEY,
					modelClass
				);
				if (typeMap && typeMap[key]) {
					const mappedType = typeMap[key];

					// Case 1: mappedType is Array constructor: @Quick({ tags: Array })
					if (mappedType === Array) {
						arrayElementClass = Array;
						designType = Array;
					}
					// Case 2: mappedType is array syntax: @Quick({ tags: [String] })
					else if (Array.isArray(mappedType)) {
						designType = Array;
						if (mappedType.length > 0) {
							arrayElementClass = mappedType[0];
						}
					}
					// Case 3: mappedType is constructor: @Quick({ date: Date })
					else if (typeof mappedType === 'function') {
						// Check common types
						const name = mappedType.name.toLowerCase();
						if (
							['date', 'regexp', 'set', 'map', 'bigint'].includes(
								name
							)
						) {
							fieldType = name;
						} else {
							// Assume custom model or other class
							fieldType = mappedType;
						}
					}
					// Case 4: mappedType is string: @Quick({ val: 'bigint' })
					else if (typeof mappedType === 'string') {
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
		type: IQMockType = 'random',
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

		// Traverse the prototype chain
		let current = instance;
		while (current && current !== Object.prototype) {
			// Get the list of properties registered by @QType()
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

		// Also check for @Quick() typeMap - if no fields registered, use typeMap keys
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
		type: IQMockType,
		fieldType: unknown,
		designType: Function | undefined,
		arrayElementClass: unknown
	): unknown {
		// Array de modelos
		if (arrayElementClass && designType === Array) {
			// Special case: generic Array class (e.g. @Quick({ tags: Array }))
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

		// Nested model
		if (arrayElementClass && !fieldType) {
			return this.generate(
				arrayElementClass as new (
					data: Record<string, unknown>
				) => unknown,
				type
			);
		}

		// By fieldType (special types)
		if (fieldType) {
			return this.generateByFieldType(
				type,
				fieldType as string | symbol | Function
			);
		}

		// By designType (auto-detection)
		if (designType) {
			return this.generateByDesignType(type, designType);
		}

		return this.getDefaultValue(type, 'string');
	}

	private generateByFieldType(
		type: IQMockType,
		fieldType: symbol | string | Function
	): unknown {
		const typeStr =
			typeof fieldType === 'symbol'
				? fieldType.toString()
				: typeof fieldType === 'string'
					? fieldType
					: fieldType.name;

		// Normalize to lowercase for comparison

		// Primitives (must come first - exact match with QType metadata)
		if (typeStr === 'string' || typeStr === 'String') {
			return this.getDefaultValue(type, 'string');
		}
		if (typeStr === 'number' || typeStr === 'Number') {
			return this.getDefaultValue(type, 'number');
		}
		if (typeStr === 'boolean' || typeStr === 'Boolean') {
			return this.getDefaultValue(type, 'boolean');
		}

		// Object (explicit in Quick config)
		if (typeStr === 'object' || typeStr === 'Object') {
			return this.getDefaultValue(type, 'object');
		}

		// Collections (exact match with QType metadata)
		if (typeStr === 'array' || typeStr === 'Array') {
			return this.getDefaultValue(type, 'array');
		}
		if (typeStr === 'set' || typeStr === 'Set') {
			return this.getDefaultValue(type, 'set');
		}
		if (typeStr === 'map' || typeStr === 'Map') {
			return this.getDefaultValue(type, 'map');
		}

		// Special types (exact match with QType metadata)
		if (typeStr === 'date' || typeStr === 'Date') {
			return this.getDefaultValue(type, 'date');
		}
		if (typeStr === 'bigint' || typeStr === 'BigInt') {
			return this.getDefaultValue(type, 'bigint');
		}
		if (typeStr === 'symbol' || typeStr === 'Symbol') {
			return this.getDefaultValue(type, 'symbol');
		}
		if (typeStr === 'regexp' || typeStr === 'RegExp') {
			return this.getDefaultValue(type, 'regexp');
		}
		if (typeStr === 'error' || typeStr === 'Error') {
			return this.getDefaultValue(type, 'error');
		}

		// Web APIs (exact match with QType metadata)
		if (typeStr === 'url' || typeStr === 'URL') {
			return this.getDefaultValue(type, 'url');
		}
		if (typeStr === 'urlsearchparams' || typeStr === 'URLSearchParams') {
			return this.getDefaultValue(type, 'urlsearchparams');
		}

		// Binary types
		if (typeStr === 'arraybuffer' || typeStr === 'ArrayBuffer') {
			return this.getDefaultValue(type, 'arraybuffer');
		}
		if (typeStr === 'dataview' || typeStr === 'DataView') {
			return this.getDefaultValue(type, 'dataview');
		}

		// TypedArrays (exact match with QType metadata)
		if (typeStr === 'int8array' || typeStr === 'Int8Array') {
			return this.getDefaultValue(type, 'int8array');
		}
		if (typeStr === 'uint8array' || typeStr === 'Uint8Array') {
			return this.getDefaultValue(type, 'uint8array');
		}
		if (typeStr === 'int16array' || typeStr === 'Int16Array') {
			return this.getDefaultValue(type, 'int16array');
		}
		if (typeStr === 'uint16array' || typeStr === 'Uint16Array') {
			return this.getDefaultValue(type, 'uint16array');
		}
		if (typeStr === 'int32array' || typeStr === 'Int32Array') {
			return this.getDefaultValue(type, 'int32array');
		}
		if (typeStr === 'uint32array' || typeStr === 'Uint32Array') {
			return this.getDefaultValue(type, 'uint32array');
		}
		if (typeStr === 'float32array' || typeStr === 'Float32Array') {
			return this.getDefaultValue(type, 'float32array');
		}
		if (typeStr === 'float64array' || typeStr === 'Float64Array') {
			return this.getDefaultValue(type, 'float64array');
		}
		if (typeStr === 'bigint64array' || typeStr === 'BigInt64Array') {
			return this.getDefaultValue(type, 'bigint64array');
		}
		if (typeStr === 'biguint64array' || typeStr === 'BigUint64Array') {
			return this.getDefaultValue(type, 'biguint64array');
		}

		// Fallback: If no match, default to string
		return this.getDefaultValue(type, 'string');
	}

	private generateByDesignType(
		type: IQMockType,
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

	private getDefaultValue(type: IQMockType, jsType: string): unknown {
		if (type === 'empty') {
			return this.getEmptyValue(jsType);
		}

		if (type === 'minimal' || type === 'sample') {
			return this.getSampleValue(jsType);
		}

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
				return '0'; // IQSerialized format for transformers
			case 'symbol':
				return Symbol();
			case 'date':
				return new Date(0).toISOString(); // IQSerialized format
			case 'regexp':
				return /(?:)/.toString(); // IQSerialized format
			case 'error':
				return new Error();
			case 'url':
				return 'http://localhost'; // IQSerialized format
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
				return '123'; // IQSerialized format for transformers
			case 'symbol':
				return Symbol('sample');
			case 'date':
				return new Date('2024-01-01').toISOString(); // IQSerialized format
			case 'regexp':
				return '/test/gi'; // IQSerialized format
			case 'error':
				return new Error('Sample error');
			case 'url':
				return 'https://example.com'; // IQSerialized format
			case 'urlsearchparams':
				return new URLSearchParams('key=value');
			case 'array':
				return ['sample'];
			case 'object':
				return { sample: true };
			case 'map':
				// IQSerialized Map is Array of entries
				return [['key', 'value']];
			case 'set':
				// IQSerialized Set is Array
				return ['sample'];
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
		switch (jsType) {
			case 'string':
				return faker.lorem.word();
			case 'number':
				return faker.number.int({ min: 1, max: 1000 });
			case 'boolean':
				return faker.datatype.boolean();
			case 'bigint':
				return String(faker.number.int({ min: 1, max: 999999 })); // IQSerialized format
			case 'symbol':
				return Symbol(faker.lorem.word());
			case 'date':
				return faker.date.recent().toISOString(); // IQSerialized format
			case 'regexp': {
				const patterns = ['\\w+', '\\d+', '[a-z]+', '.*'];
				const flags = ['', 'i', 'g', 'gi', 'm'];
				const pattern = faker.helpers.arrayElement(patterns);
				const flag = faker.helpers.arrayElement(flags);
				return `/${pattern}/${flag}`; // IQSerialized format
			}
			case 'error':
				return new Error(faker.lorem.sentence());
			case 'url':
				return faker.internet.url(); // Already string
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
				// IQSerialized Map is Array of entries
				return [
					[faker.lorem.word(), faker.lorem.word()],
					[faker.lorem.word(), faker.lorem.word()],
				];
			}
			case 'set':
				// IQSerialized Set is Array
				return [faker.lorem.word(), faker.lorem.word()];
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
