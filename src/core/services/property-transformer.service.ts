import 'reflect-metadata';
import {
	ValueTransformerService,
	IRecursiveDeserializer,
} from './value-transformer.service';
import { TransformerLookupService } from './transformer-lookup.service';
import { IQTransformContext } from '../interfaces/transformer.interface';
import { IQAdvancedOptions } from '../interfaces/quick-options.interface';
import { QTransformerRegistry } from '../registry/transformer.registry';
import { QUICK_TYPE_MAP_KEY } from '../constants/metadata-keys';
import {
	isQMSpecialToken,
	decodeQMSpecialToken,
} from '@/transformers/special-float.transformer';

// ---------------------------------------------------------------------------
// Module-level per-(constructor, key) cache for transformProperty() hot path
// Safe because decorator metadata is immutable after class definition
// ---------------------------------------------------------------------------
/** @internal Cached transform metadata per (constructor, property key). Populated once; safe because decorator metadata is immutable after class definition. */
interface IQPropTransformMeta {
	customTransformer: any;

	fieldType: any;

	arrayElementClass: any;

	arrayElementTypes: any;

	designType: any;

	arrayNestingDepth: any;
	/**
	 * Resolved arrayElementClass: includes QUICK_TYPE_MAP_KEY fallback, computed once at cache build.
	 * Avoids Reflect.getMetadata(QUICK_TYPE_MAP_KEY) in the hot path.
	 */
	resolvedArrayElementClass: any;
	/** Resolved arrayElementTypes from typeMap, if applicable. */
	resolvedArrayElementTypes: any;
	/**
	 * Resolved designType: may be set to Array when typeMap contains an array mapping
	 * and design:type was not set by the decorator. Avoids a second QUICK_TYPE_MAP_KEY
	 * lookup inside the arrayElementClass branch.
	 */
	resolvedDesignType: any;
	/**
	 * OPT: Pre-computed fast-path type string for plain primitive fields.
	 * When non-null, if `typeof value === primitivePassthroughType` the field can be
	 * returned immediately without going through the full transform pipeline.
	 * Conditions: no customTransformer, no fieldType, no arrayElementClass, no customTransformerFn in options,
	 * and resolvedDesignType is String | Number | Boolean.
	 */
	primitivePassthroughType: 'string' | 'number' | 'boolean' | null;
	/** Whether the cache entry has been built */
	built: true;
}

const _PROP_TRANSFORM_META = new WeakMap<
	Function,
	Map<string, IQPropTransformMeta>
>();

/**
 * Fetches or builds the cached property transform metadata for a given constructor and property key.
 * @internal
 * @param ctor - The model constructor (used as WeakMap key)
 * @param targetKey - The decorated property name
 * @returns The resolved `IQPropTransformMeta` entry for this field
 */
function _getPropTransformMeta(
	ctor: Function,
	targetKey: string
): IQPropTransformMeta {
	let classMap = _PROP_TRANSFORM_META.get(ctor);
	if (!classMap) {
		classMap = new Map();
		_PROP_TRANSFORM_META.set(ctor, classMap);
	}
	const cached = classMap.get(targetKey);
	if (cached) return cached;

	// Use the prototype to read decorator metadata (same as reading from any instance)
	const proto = (ctor as { prototype: object }).prototype;
	const rawArrayElementClass = Reflect.getMetadata(
		'arrayElementClass',
		proto,
		targetKey
	);
	const rawArrayElementTypes = Reflect.getMetadata(
		'arrayElementTypes',
		proto,
		targetKey
	);
	const rawDesignType = Reflect.getMetadata('design:type', proto, targetKey);

	// Resolve QUICK_TYPE_MAP_KEY fallback once — avoids per-call Reflect.getMetadata in hot path
	let resolvedArrayElementClass = rawArrayElementClass;
	let resolvedArrayElementTypes = rawArrayElementTypes;
	let resolvedDesignType = rawDesignType;

	if (!resolvedArrayElementClass) {
		const typeMap = Reflect.getMetadata(QUICK_TYPE_MAP_KEY, ctor);
		if (typeMap && typeMap[targetKey]) {
			const mappedType = typeMap[targetKey];
			if (Array.isArray(mappedType) && mappedType.length > 0) {
				resolvedArrayElementClass = mappedType[0];
				if (mappedType.length > 1) {
					resolvedArrayElementTypes = mappedType;
				}
				// If no designType set, Array type is implied by the typeMap array notation
				if (!resolvedDesignType) {
					resolvedDesignType = Array;
				}
			} else if (typeof mappedType === 'function') {
				const hasPrototype =
					mappedType.prototype &&
					mappedType.prototype.constructor === mappedType;
				const name = mappedType.name.toLowerCase();
				const isKnownNative =
					[
						'date',
						'regexp',
						'set',
						'map',
						'bigint',
						'url',
						'error',
						'symbol',
						'arraybuffer',
						'dataview',
						'blob',
						'file',
					].includes(name) || name.includes('array');
				if (hasPrototype && !isKnownNative) {
					resolvedArrayElementClass = mappedType;
				}
			}
		}
	}

	const _rawCustomTransformer = Reflect.getMetadata(
		'customTransformer',
		proto,
		targetKey
	);
	const _rawFieldType = Reflect.getMetadata('fieldType', proto, targetKey);
	const _rawArrayNestingDepth = Reflect.getMetadata(
		'arrayNestingDepth',
		proto,
		targetKey
	);

	// OPT: compute primitive pass-through flag once at cache build time
	let _primPassthrough: 'string' | 'number' | 'boolean' | null = null;
	if (
		!_rawCustomTransformer &&
		!_rawFieldType &&
		!resolvedArrayElementClass
	) {
		if (resolvedDesignType === String) _primPassthrough = 'string';
		else if (resolvedDesignType === Number) _primPassthrough = 'number';
		else if (resolvedDesignType === Boolean) _primPassthrough = 'boolean';
	}

	const meta: IQPropTransformMeta = {
		customTransformer: _rawCustomTransformer,
		fieldType: _rawFieldType,
		arrayElementClass: rawArrayElementClass,
		arrayElementTypes: rawArrayElementTypes,
		designType: rawDesignType,
		arrayNestingDepth: _rawArrayNestingDepth,
		resolvedArrayElementClass,
		resolvedArrayElementTypes,
		resolvedDesignType,
		primitivePassthroughType: _primPassthrough,
		built: true,
	};
	classMap.set(targetKey, meta);
	return meta;
}

/**
 * Service that performs the **per-property type transformation** during deserialization.
 *
 * Given a raw scalar or array value, a property key, and the current model class,
 * `PropertyTransformer` resolves the correct transformer (via metadata caches and
 * `TransformerLookupService`) and delegates the actual conversion.
 *
 * Performance-sensitive: all metadata reads are cached in a per-(class, key)
 * `WeakMap` so that subsequent constructions of the same model class hit no
 * `Reflect.getMetadata` calls after the first instance.
 *
 * @remarks
 * SOLID principles applied:
 * - **Single Responsibility**: only handles the transformation of a single property value.
 * - **Open/Closed**: extensible via `QTransformerRegistry` without modifying this class.
 * - **Dependency Inversion**: depends on `TransformerLookupService` and
 *   `ValueTransformerService` abstractions.
 *
 * @internal Used by `PopulationService`.
 */
export class PropertyTransformer {
	/**
	 * Creates a new PropertyTransformer.
	 * @param valueTransformer - Service that coerces individual field values
	 * @param transformerLookup - Service for resolving transformers by key
	 * @param recursiveDeserializer - Deserializer used for nested model instantiation
	 */
	constructor(
		private readonly valueTransformer: ValueTransformerService,
		private readonly transformerLookup: TransformerLookupService,
		private readonly recursiveDeserializer: IRecursiveDeserializer
	) {}

	/**
	 * Transforms a single property value using the registered type metadata for this
	 * (class, key) pair.
	 *
	 * Resolves the transformer via cached metadata (decorator config, design types,
	 * discriminators) and delegates the actual conversion to `ValueTransformerService`.
	 * The result is written back onto `context.instance[key]`.
	 *
	 * @param key - Property name on the model instance
	 * @param value - The raw input value to transform
	 * @param context - Full population context (model class, metadata caches,
	 *   recursion guard, coercion strategy, etc.)
	 * @returns The transformed value: a native runtime type (e.g. `Date`, `bigint`, `Set`),
	 *   a nested model instance, a mapped array, or the original `value` if no transformer
	 *   applies. `undefined` if the input was `undefined`.
	 */
	public transformProperty(
		key: string,
		value: any,
		context: {
			instance: any;
			modelClass: Function;
			decoratedFields: string[];
			decoratedFieldsSet?: Set<string>;
			designTypes: Record<string, any>;
			options: IQAdvancedOptions;
			discriminators: any; // IQDiscriminatorConfig
			transformContext: IQTransformContext;
			recursionContext: { visited: WeakSet<object>; depth: number };
			maxArrayLength: number;
			coercionStrategy: 'strict' | 'loose';
			/**
			 * OPT: pre-built metadata object for decorated fields with no per-field
			 * transformerOptions override. Avoids one object allocation per field.
			 * When provided and no per-field override exists, this object is reused
			 * in-place instead of allocating a new one.
			 */
			cachedBaseMeta?: Record<string, unknown>;
		}
	): any {
		const {
			instance,
			modelClass,
			decoratedFields,
			decoratedFieldsSet,
			designTypes,
			options,
			discriminators,
			transformContext, // Includes propertyKey (targetKey)
			recursionContext,
			maxArrayLength,
			coercionStrategy,
		} = context;

		const targetKey = transformContext.propertyKey;

		// Auto-decode QM special float tokens produced by Serializer
		// (handles NaN, Infinity, -Infinity encoded as { __qm: 'nan' | 'inf' | '-inf' })
		if (isQMSpecialToken(value)) {
			return decodeQMSpecialToken(value);
		}

		// 1. If property is NOT decorated with @QType()
		if (
			decoratedFieldsSet
				? !decoratedFieldsSet.has(key)
				: !decoratedFields.includes(key)
		) {
			const expectedType = designTypes[key];
			if (expectedType) {
				value = this.valueTransformer.validateOrCoercePrimitive({
					key,
					value,
					expectedType,
					className: modelClass.name,
					strategy: coercionStrategy,
				});
			}

			// Transform directly by design type
			return this.valueTransformer.transformByDesignType(
				value,
				expectedType,
				transformContext
			);
		}

		// 2. Property IS decorated
		// OPT: Reuse pre-built base metadata when no per-field transformerOptions override exists.
		// For the common case (no per-field override), `context.cachedBaseMeta` is the same object
		// across all fields in a construction call — eliminating one object allocation per field.
		const _fieldTransOpt = options.transformerOptions?.[targetKey];
		transformContext.metadata =
			_fieldTransOpt !== undefined
				? {
						transformerOptions: _fieldTransOpt,
						maxArrayLength,
						coercionStrategy,
						normalization: options.normalization,
					}
				: (context.cachedBaseMeta ?? {
						transformerOptions: undefined,
						maxArrayLength,
						coercionStrategy,
						normalization: options.normalization,
					});

		// Per-(constructor, key) cache: eliminates Reflect.getMetadata calls per decorated field
		// Falls back to direct instance lookup for plain objects (unit tests / dynamic metadata)
		const _ctor = instance.constructor as Function;
		const _propMeta: IQPropTransformMeta =
			_ctor !== Object
				? _getPropTransformMeta(_ctor, targetKey)
				: {
						customTransformer: Reflect.getMetadata(
							'customTransformer',
							instance,
							targetKey
						),
						fieldType: Reflect.getMetadata(
							'fieldType',
							instance,
							targetKey
						),
						arrayElementClass: Reflect.getMetadata(
							'arrayElementClass',
							instance,
							targetKey
						),
						arrayElementTypes: Reflect.getMetadata(
							'arrayElementTypes',
							instance,
							targetKey
						),
						designType: Reflect.getMetadata(
							'design:type',
							instance,
							targetKey
						),
						arrayNestingDepth: Reflect.getMetadata(
							'arrayNestingDepth',
							instance,
							targetKey
						),
						// Plain-object fallback: no class-level QUICK_TYPE_MAP_KEY, resolved = raw
						resolvedArrayElementClass: Reflect.getMetadata(
							'arrayElementClass',
							instance,
							targetKey
						),
						resolvedArrayElementTypes: Reflect.getMetadata(
							'arrayElementTypes',
							instance,
							targetKey
						),
						resolvedDesignType: Reflect.getMetadata(
							'design:type',
							instance,
							targetKey
						),
						// Plain-object fallback: disable primitive passthrough (unknown options)
						primitivePassthroughType: null,
						built: true,
					};

		// OPT: fast-path — most common case: @Quick() on string/number/boolean field
		// already at correct JS type. Eliminates ~15 conditional checks per field.
		// Guards:
		//   - primitivePassthroughType pre-computed at cache build (no customTransformer/fieldType/arrayClass)
		//   - no options-level transformer override
		//   - string normalization is already applied upstream in population.service before this call
		//   - for strings: skip on >5MB (PrimitiveTransformer security check)
		const _ppt = _propMeta.primitivePassthroughType;
		if (
			_ppt !== null &&
			typeof value === _ppt &&
			!options.transformers?.[targetKey]
		) {
			if (
				_ppt !== 'string' ||
				(value as string).length < 5242880 /* 5MB */
			) {
				return value;
			}
		}

		// 0. 🔥 CHECK: Custom transformer from options (High Priority)
		const customTransformerFn = options.transformers?.[targetKey];
		if (typeof customTransformerFn === 'function') {
			return customTransformerFn(value);
		}

		// 1. Check for custom transformer function from @Quick()
		const customTransformer = _propMeta.customTransformer;
		if (customTransformer && typeof customTransformer === 'function') {
			return customTransformer(value);
		}

		// 2. Check for custom transformer via fieldType metadata
		const fieldType = _propMeta.fieldType;
		if (fieldType) {
			const transformer =
				this.transformerLookup.getTransformer(fieldType);
			if (transformer) {
				return transformer.deserialize(
					value,
					transformContext.propertyKey,
					transformContext.className,
					transformContext
				);
			}

			// Fallback: It might be a Model Class not registered as a transformer
			if (typeof fieldType === 'function') {
				if (Array.isArray(value)) {
					throw new Error(
						`${modelClass.name}.${targetKey}: Expected object, got array. Use @QType([${fieldType.name}]) for arrays.`
					);
				}

				if (typeof value === 'object' && value !== null) {
					return this.recursiveDeserializer.deserialize(
						value as Record<string, unknown>,
						fieldType,
						recursionContext
					);
				}
			}
		}

		// 3. Check for array of models or nested model
		// Use pre-resolved values from cache (includes QUICK_TYPE_MAP_KEY fallback computed once)
		const arrayElementClass = _propMeta.resolvedArrayElementClass;

		// FALLBACK: Implicit Primitive Handling for @QType() (no args)
		if (!fieldType && !arrayElementClass) {
			const expectedType = designTypes[targetKey];
			if (
				expectedType &&
				(expectedType === String ||
					expectedType === Number ||
					expectedType === Boolean)
			) {
				return this.valueTransformer.validateOrCoercePrimitive({
					key: targetKey,
					value,
					expectedType,
					className: modelClass.name,
					strategy: coercionStrategy,
				});
			}
		}

		// Check nested model class transformer
		if (
			arrayElementClass &&
			!Array.isArray(value) &&
			QTransformerRegistry.has(arrayElementClass)
		) {
			const transformer =
				this.transformerLookup.getTransformer(arrayElementClass);
			if (transformer) {
				return transformer.deserialize(
					value,
					transformContext.propertyKey,
					transformContext.className,
					transformContext
				);
			}
		}

		const arrayElementTypes = _propMeta.resolvedArrayElementTypes;

		// FALLBACK already resolved at cache build time — removed per-call Reflect.getMetadata

		if (arrayElementClass) {
			// Use cached metadata from _propMeta — includes designType inferred from typeMap
			const designType = _propMeta.resolvedDesignType;

			const arrayNestingDepth = _propMeta.arrayNestingDepth;
			const isArrayType = designType === Array;

			// Validation: If it's a singular model/type (not array syntax), value must NOT be an array
			if (!isArrayType && Array.isArray(value)) {
				throw new Error(
					`${modelClass.name}.${transformContext.propertyKey}: Expected object, got array. Did you mean to use @QType([${arrayElementClass.name}])?`
				);
			}

			// 🔥 NEW: Explicit nesting depth
			if (
				isArrayType &&
				arrayNestingDepth &&
				arrayNestingDepth >= 2 &&
				Array.isArray(value)
			) {
				const transformableTypes = [
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

				const isPrimitiveOrTransformable =
					transformableTypes.includes(arrayElementClass);

				if (
					isPrimitiveOrTransformable &&
					!discriminators?.[targetKey]
				) {
					return this.valueTransformer.transformNestedArray(
						value,
						arrayElementClass,
						{ ...transformContext, recursionContext }
					);
				} else {
					const possibleTypes = arrayElementTypes || [
						arrayElementClass,
					];
					const IQDiscriminatorConfig = discriminators?.[targetKey];
					return this.valueTransformer.transformNestedModelArray(
						value,
						possibleTypes,
						{
							discriminatorConfig: IQDiscriminatorConfig,
							context: transformContext,
							recursionContext,
						}
					);
				}
			}

			// Set/Map without nesting depth
			if (
				(arrayElementClass === Set || arrayElementClass === Map) &&
				!arrayNestingDepth
			) {
				const IQTransformerKey =
					arrayElementClass === Set ? 'set' : 'map';
				const transformer =
					this.transformerLookup.getTransformer(IQTransformerKey);
				if (transformer) {
					return transformer.deserialize(
						value,
						transformContext.propertyKey,
						transformContext.className,
						transformContext
					);
				}
			}

			// Array of Set/Map
			if (
				isArrayType &&
				Array.isArray(value) &&
				(arrayElementClass === Set || arrayElementClass === Map) &&
				arrayNestingDepth &&
				arrayNestingDepth >= 1
			) {
				const IQTransformerKey =
					arrayElementClass === Set ? 'set' : 'map';
				const transformer =
					this.transformerLookup.getTransformer(IQTransformerKey);
				if (transformer) {
					return value.map((item) => {
						if (item === null || item === undefined) return item;
						return transformer.deserialize(
							item,
							transformContext.propertyKey,
							transformContext.className,
							transformContext
						);
					});
				}
			}

			// Logic to handle TypedArrays vs Element mapping
			if (isArrayType) {
				if (!Array.isArray(value)) {
					throw new Error(
						`${modelClass.name}.${targetKey}: Expected array, got ${typeof value}`
					);
				}

				const transformableTypes = [
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

				const isPrimitiveOrTransformable =
					transformableTypes.includes(arrayElementClass);
				const hasDiscriminator = !!discriminators?.[targetKey];

				if (isPrimitiveOrTransformable && !hasDiscriminator) {
					const typedArrayConstructors = [
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
					];
					const isTypedArrayElement =
						typedArrayConstructors.includes(arrayElementClass);

					return value.map((item) => {
						if (item === null || item === undefined) return item;
						if (isTypedArrayElement && Array.isArray(item)) {
							return this.valueTransformer.transformByDesignType(
								item,
								arrayElementClass,
								transformContext
							);
						}
						return this.valueTransformer.transformByDesignType(
							item,
							arrayElementClass,
							transformContext
						);
					});
				} else {
					const possibleTypes = arrayElementTypes || [
						arrayElementClass,
					];
					const IQDiscriminatorConfig = discriminators?.[targetKey];
					return this.valueTransformer.transformNestedModelArray(
						value,
						possibleTypes,
						{
							discriminatorConfig: IQDiscriminatorConfig,
							context: transformContext,
							recursionContext,
						}
					);
				}
			}

			// Individual nested model
			if (
				typeof value === 'object' &&
				value !== null &&
				!Array.isArray(value)
			) {
				return this.recursiveDeserializer.deserialize(
					value as Record<string, unknown>,
					arrayElementClass,
					recursionContext
				);
			}
		}

		// 4. Auto-detection via design:type
		const designType = _propMeta.designType;

		if (designType && designType !== Array && designType !== Object) {
			return this.valueTransformer.transformByDesignType(
				value,
				designType,
				transformContext
			);
		}

		return value; // Default return
	}
}
