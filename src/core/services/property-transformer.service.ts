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
	/** Whether the cache entry has been built */
	built: true;
}

const _PROP_TRANSFORM_META = new WeakMap<
	Function,
	Map<string, IQPropTransformMeta>
>();

function _getPropTransformMeta(
	ctor: Function,
	targetKey: string
): IQPropTransformMeta {
	let classMap = _PROP_TRANSFORM_META.get(ctor);
	if (!classMap) {
		classMap = new Map();
		_PROP_TRANSFORM_META.set(ctor, classMap);
	}
	let meta = classMap.get(targetKey);
	if (!meta) {
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
		const rawDesignType = Reflect.getMetadata(
			'design:type',
			proto,
			targetKey
		);

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
						].includes(name) || name.includes('array');
					if (hasPrototype && !isKnownNative) {
						resolvedArrayElementClass = mappedType;
					}
				}
			}
		}

		meta = {
			customTransformer: Reflect.getMetadata(
				'customTransformer',
				proto,
				targetKey
			),
			fieldType: Reflect.getMetadata('fieldType', proto, targetKey),
			arrayElementClass: rawArrayElementClass,
			arrayElementTypes: rawArrayElementTypes,
			designType: rawDesignType,
			arrayNestingDepth: Reflect.getMetadata(
				'arrayNestingDepth',
				proto,
				targetKey
			),
			resolvedArrayElementClass,
			resolvedArrayElementTypes,
			resolvedDesignType,
			built: true,
		};
		classMap.set(targetKey, meta);
	}
	return meta;
}

export class PropertyTransformer {
	constructor(
		private readonly valueTransformer: ValueTransformerService,
		private readonly transformerLookup: TransformerLookupService,
		private readonly recursiveDeserializer: IRecursiveDeserializer
	) {}

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
		// Update context metadata
		transformContext.metadata = {
			transformerOptions: options.transformerOptions?.[targetKey],
			maxArrayLength,
			coercionStrategy,
			normalization: options.normalization, // Pass normalization options to transformers
		};

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
						built: true,
					};

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
