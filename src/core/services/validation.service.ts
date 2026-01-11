/**
 * Service for validating model instances.
 *
 * @remarks
 * This class follows SOLID principles:
 * - **Single Responsibility**: Only handles model validation
 *
 * @example
 * ```typescript
 * const service = new ValidationService();
 *
 * class User extends QuickModel<IUser> {
 *   @QType('date') birthDate!: Date;
 * }
 *
 * const user = new User({ birthDate: "invalid" });
 * const results = service.validate(user, User);
 *
 * if (results.length > 0) {
 *   console.error('Validation errors:', results);
 * }
 *
 * // Or use convenience method
 * if (!service.isValid(user, User)) {
 *   console.error('User is invalid');
 * }
 * ```
 */

import 'reflect-metadata';
import {
	IQValidationResult,
	IQValidator,
	IQTransformer,
} from '../interfaces/transformer.interface';
import {
	TransformerRegistry,
	type TransformerKey,
} from '../registry/transformer.registry';
import { BigIntTransformer } from '@/transformers/bigint.transformer';
import { DateTransformer } from '@/transformers/date.transformer';
import { ErrorTransformer } from '@/transformers/error.transformer';
import {
	MapTransformer,
	SetTransformer,
} from '@/transformers/map-set.transformer';
import { RegExpTransformer } from '@/transformers/regexp.transformer';
import { SymbolTransformer } from '@/transformers/symbol.transformer';
import {
	ArrayBufferTransformer,
	DataViewTransformer,
} from '@/transformers/buffer.transformer';
import { TypedArrayTransformer } from '@/transformers/typed-array.transformer';
import {
	URLTransformer,
	URLSearchParamsTransformer,
} from '@/transformers/web-apis.transformer';
import { PrimitiveTransformer } from '@/transformers/primitive.transformer';
import { QTYPES_METADATA_KEY } from '../decorators/qtype.decorator';

export class ValidationService {
	private transformers = new Map<string, IQTransformer<unknown, unknown>>();

	/**
	 * Creates a validation service.
	 */
	constructor() {
		// Initialize transformers (Standard defaults)
		const dateTransformer = new DateTransformer();
		const bigintTransformer = new BigIntTransformer();
		const symbolTransformer = new SymbolTransformer();
		const regexpTransformer = new RegExpTransformer();
		const errorTransformer = new ErrorTransformer();
		const mapTransformer = new MapTransformer();
		const setTransformer = new SetTransformer();
		const bufferTransformer = new ArrayBufferTransformer();
		const dataviewTransformer = new DataViewTransformer();

		const stringTransformer = new PrimitiveTransformer('string');
		const numberTransformer = new PrimitiveTransformer('number');
		const booleanTransformer = new PrimitiveTransformer('boolean');

		// Register by name
		this.transformers.set('date', dateTransformer);
		this.transformers.set('bigint', bigintTransformer);
		this.transformers.set('symbol', symbolTransformer);
		this.transformers.set('regexp', regexpTransformer);
		this.transformers.set('error', errorTransformer);
		this.transformers.set('map', mapTransformer);
		this.transformers.set('set', setTransformer);
		this.transformers.set('buffer', bufferTransformer);
		this.transformers.set('arraybuffer', bufferTransformer);
		this.transformers.set('dataview', dataviewTransformer);

		this.transformers.set('string', stringTransformer);
		this.transformers.set('number', numberTransformer);
		this.transformers.set('boolean', booleanTransformer);

		// Register typed arrays
		const int8Transformer = new TypedArrayTransformer<Int8Array>(Int8Array);
		const uint8Transformer = new TypedArrayTransformer<Uint8Array>(
			Uint8Array
		);
		const uint8ClampedTransformer =
			new TypedArrayTransformer<Uint8ClampedArray>(Uint8ClampedArray);
		const int16Transformer = new TypedArrayTransformer<Int16Array>(
			Int16Array
		);
		const uint16Transformer = new TypedArrayTransformer<Uint16Array>(
			Uint16Array
		);
		const int32Transformer = new TypedArrayTransformer<Int32Array>(
			Int32Array
		);
		const uint32Transformer = new TypedArrayTransformer<Uint32Array>(
			Uint32Array
		);
		const float32Transformer = new TypedArrayTransformer<Float32Array>(
			Float32Array
		);
		const float64Transformer = new TypedArrayTransformer<Float64Array>(
			Float64Array
		);
		const bigint64Transformer = new TypedArrayTransformer<BigInt64Array>(
			BigInt64Array
		);
		const biguint64Transformer = new TypedArrayTransformer<BigUint64Array>(
			BigUint64Array
		);

		this.transformers.set('int8array', int8Transformer);
		this.transformers.set('uint8array', uint8Transformer);
		this.transformers.set('uint8clampedarray', uint8ClampedTransformer);
		this.transformers.set('int16array', int16Transformer);
		this.transformers.set('uint16array', uint16Transformer);
		this.transformers.set('int32array', int32Transformer);
		this.transformers.set('uint32array', uint32Transformer);
		this.transformers.set('float32array', float32Transformer);
		this.transformers.set('float64array', float64Transformer);
		this.transformers.set('bigint64array', bigint64Transformer);
		this.transformers.set('biguint64array', biguint64Transformer);

		// Web APIs
		if (typeof URL !== 'undefined') {
			this.transformers.set('url', new URLTransformer());
			this.transformers.set(
				'urlsearchparams',
				new URLSearchParamsTransformer()
			);
		}
	}

	/**
	 * Gets the transformer (custom or default) for a given key.
	 */
	public getTransformer(
		key: TransformerKey
	): IQTransformer<unknown, unknown> | undefined {
		// 1. Check global registry first (allows overriding defaults)
		const customTransformer = TransformerRegistry.get(key);
		if (customTransformer) {
			return customTransformer;
		}

		// 2. Check local defaults
		let lookupKey: string | undefined;

		if (typeof key === 'string') {
			lookupKey = key.toLowerCase();
		} else if (typeof key === 'function' && 'name' in key) {
			lookupKey = (key as { name: string }).name.toLowerCase();
		} else if (typeof key === 'object' && key !== null && 'name' in key) {
			lookupKey = (key as { name: string }).name.toLowerCase();
		}

		if (lookupKey && this.transformers.has(lookupKey)) {
			return this.transformers.get(lookupKey);
		}

		return undefined;
	}

	/**
	 * Validates all fields in a model instance.
	 *
	 * @param instance - The model instance to validate
	 * @param modelClass - The model class constructor (reserved for future use/metadata)
	 * @returns Array of validation results for failed validations (empty if all valid)
	 *
	 * @remarks
	 * Only validates fields that have:
	 * 1. A `fieldType` metadata entry
	 * 2. A corresponding validator in the registry
	 */
	validate(
		instance: Record<string, unknown>,

		modelClass?: Function
	): IQValidationResult[] {
		const results: IQValidationResult[] = [];
		const className = modelClass
			? modelClass.name
			: instance.constructor.name;

		// Get list of properties decorated with @QType() (or implicit via @Quick)
		// These are the fields we know how to validate
		const decoratedFields: string[] =
			Reflect.getMetadata(QTYPES_METADATA_KEY, instance) ||
			Reflect.getMetadata(
				QTYPES_METADATA_KEY,
				Object.getPrototypeOf(instance)
			) ||
			[];

		for (const key of decoratedFields) {
			// Ignore internal props just in case
			if (key.startsWith('__')) continue;

			// Get current value (accessing via getter if applicable)
			const value = instance[key];

			// Get metadata from the instance
			const fieldType = Reflect.getMetadata('fieldType', instance, key);

			if (fieldType) {
				const transformer = this.getTransformer(fieldType);

				// Check if transformer implements IQValidator (has validate method)
				if (
					transformer &&
					'validate' in transformer &&
					typeof (transformer as unknown as IQValidator).validate ===
						'function'
				) {
					const validator = transformer as unknown as IQValidator;
					const context = {
						propertyKey: key,
						className: className,
					};

					try {
						const result = validator.validate(value, context);
						if (!result.isValid) {
							results.push(result);
						}
					} catch (error) {
						// Catch errors during validation to prevent crash
						results.push({
							isValid: false,
							error: `Validation error for ${className}.${key}: ${error instanceof Error ? error.message : String(error)}`,
						});
					}
				}
			}
		}

		return results;
	}

	/**
	 * Checks if a model instance is valid.
	 *
	 * @param instance - The model instance to check
	 * @param modelClass - The model class constructor
	 * @returns True if all validations pass, false if any fail
	 */
	isValid(instance: Record<string, unknown>, modelClass?: Function): boolean {
		return this.validate(instance, modelClass).length === 0;
	}
}
