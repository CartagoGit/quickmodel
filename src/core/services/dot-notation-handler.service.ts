import 'reflect-metadata';
import {
	ValueTransformerService,
	IRecursiveDeserializer,
} from './value-transformer.service';
import { TransformerLookupService } from './transformer-lookup.service';
import { IQAdvancedOptions } from '../interfaces/quick-options.interface';
import { IQTransformContext } from '../interfaces/transformer.interface';
import { QUICK_OPTIONS_KEY } from '../constants/metadata-keys';

/**
 * Service that resolves and applies **dot-notation** type transformations.
 *
 * When `@Quick` receives a type-map entry whose key contains a dot (e.g.
 * `{ 'address.city': String }`), this service traverses the nested object
 * structure, locates the target leaf property, and applies the specified
 * transformer — exactly as if the property had been declared at the top level.
 *
 * @remarks
 * - Prototype-pollution-safe: keys `__proto__`, `constructor`, and `prototype`
 *   are silently ignored.
 * - Only transforms values that already exist in the instance; it never creates
 *   new properties.
 *
 * @internal Used by `PopulationService`.
 *
 * @see {@link PopulationService} — orchestrates population and triggers dot-notation handling
 * @see {@link ValueTransformerService} — applies the actual type conversion to each resolved leaf
 */
export class DotNotationHandler {
	constructor(
		private readonly transformerLookup: TransformerLookupService,
		private readonly valueTransformer: ValueTransformerService,
		private readonly recursiveDeserializer: IRecursiveDeserializer
	) {}

	/**
	 * Applies type transformation to a dot-notation property path on a model instance.
	 *
	 * Traverses the path (e.g. `'address.city'`) and transforms the leaf value using the
	 * registered transformer for that property on `modelClass`. Security-filtered: silently
	 * returns if any path component is a prototype-pollution key (`__proto__`, `constructor`,
	 * `prototype`).
	 *
	 * @param instance - The model instance being populated
	 * @param applyConfig.path - Dot-notation property path (e.g. `'address.city'`)
	 * @param applyConfig.modelClass - The constructor function providing decorator metadata
	 * @param applyConfig.recursionContext - Optional cycle-detection context
	 * @returns `void` — the instance is mutated in place. Silently no-ops if any segment of the path
	 *   does not exist, is `null`/`undefined`, or is a prototype-pollution key.
	 */
	public apply(
		instance: Record<string, unknown>,
		applyConfig: {
			path: string;
			modelClass: Function;
			recursionContext?: { visited?: WeakSet<object> };
		}
	): void {
		const { path, modelClass, recursionContext } = applyConfig;
		const parts = path.split('.');
		let current: Record<string, unknown> = instance;

		for (let idx = 0; idx < parts.length - 1; idx++) {
			const part = parts[idx];
			// SECURITY: Prevent accessing/creating prototype properties via dot notation
			if (
				part === '__proto__' ||
				part === 'constructor' ||
				part === 'prototype'
			) {
				return;
			}

			if (!part || current[part] === undefined || current[part] === null)
				return;
			current = current[part] as Record<string, unknown>;
		}

		const lastKey = parts[parts.length - 1];
		// SECURITY
		if (
			lastKey === '__proto__' ||
			lastKey === 'constructor' ||
			lastKey === 'prototype'
		) {
			return;
		}
		if (!lastKey) return;
		const value = current[lastKey];
		if (value === undefined || value === null) return;

		const options: IQAdvancedOptions =
			Reflect.getMetadata(QUICK_OPTIONS_KEY, modelClass) || {};

		const context: IQTransformContext = {
			propertyKey: path,
			className: modelClass.name,
			metadata: {
				transformerOptions: options.transformerOptions?.[path],
			},
		};

		const fieldType = Reflect.getMetadata('fieldType', instance, path);
		if (fieldType) {
			const transformer =
				this.transformerLookup.getTransformer(fieldType);
			if (transformer) {
				current[lastKey] = transformer.deserialize(
					value,
					path,
					context.className,
					context
				);
				return;
			}
		}

		const arrayElementClass = Reflect.getMetadata(
			'arrayElementClass',
			instance,
			path
		);
		if (arrayElementClass) {
			if (Array.isArray(value)) {
				const transformableTypes: unknown[] = [
					Date,
					BigInt,
					Number,
					String,
					Boolean,
					RegExp,
					Symbol,
					Error,
					URL,
					URLSearchParams,
					Int8Array,
					Uint8Array,
					Uint8ClampedArray,
					Int16Array,
					Uint16Array,
					Int32Array,
					Uint32Array,
					Float32Array,
					Float64Array,
					BigInt64Array,
					BigUint64Array,
					ArrayBuffer,
					DataView,
				];

				if (transformableTypes.includes(arrayElementClass as unknown)) {
					current[lastKey] =
						this.valueTransformer.transformNestedArray(
							value,
							arrayElementClass,
							{ ...context, recursionContext }
						);
				} else {
					current[lastKey] =
						this.valueTransformer.transformNestedModelArray(
							value,
							[arrayElementClass],
							{ context, recursionContext }
						);
				}
			} else if (typeof value === 'object') {
				current[lastKey] = this.recursiveDeserializer.deserialize(
					value as Record<string, unknown>,
					arrayElementClass,
					recursionContext
				);
			}
		}
	}
}
