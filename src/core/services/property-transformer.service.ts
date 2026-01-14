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

export class PropertyTransformer {
	constructor(
		private readonly valueTransformer: ValueTransformerService,
		private readonly transformerLookup: TransformerLookupService,
		private readonly recursiveDeserializer: IRecursiveDeserializer
	) {}

	public transformProperty(
		key: string,
		value: any,
		instance: any,
		modelClass: Function,
		context: {
			decoratedFields: string[];
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
			decoratedFields,
			designTypes,
			options,
			discriminators,
			transformContext, // Includes propertyKey (targetKey)
			recursionContext,
			maxArrayLength,
			coercionStrategy,
		} = context;

		const targetKey = transformContext.propertyKey;

		// 1. If property is NOT decorated with @QType()
		if (!decoratedFields.includes(key)) {
			const expectedType = designTypes[key];
			if (expectedType) {
				value = this.valueTransformer.validateOrCoercePrimitive(
					key,
					value,
					expectedType,
					modelClass.name,
					coercionStrategy
				);
			}

			// Transform directly by design type
			return this.valueTransformer.transformByDesignType(
				value,
				expectedType,
				transformContext,
				recursionContext
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

		// 0. 🔥 CHECK: Custom transformer from options (High Priority)
		const customTransformerFn = options.transformers?.[targetKey];
		if (typeof customTransformerFn === 'function') {
			return customTransformerFn(value);
		}

		// 1. Check for custom transformer function from @Quick()
		const customTransformer = Reflect.getMetadata(
			'customTransformer',
			instance,
			targetKey
		);
		if (customTransformer && typeof customTransformer === 'function') {
			return customTransformer(value);
		}

		// 2. Check for custom transformer via fieldType metadata
		const fieldType = Reflect.getMetadata('fieldType', instance, targetKey);
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
		let arrayElementClass = Reflect.getMetadata(
			'arrayElementClass',
			instance,
			targetKey
		);

		// FALLBACK: Implicit Primitive Handling for @QType() (no args)
		if (!fieldType && !arrayElementClass) {
			const expectedType = designTypes[targetKey];
			if (
				expectedType &&
				(expectedType === String ||
					expectedType === Number ||
					expectedType === Boolean)
			) {
				return this.valueTransformer.validateOrCoercePrimitive(
					targetKey,
					value,
					expectedType,
					modelClass.name,
					coercionStrategy
				);
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

		let arrayElementTypes = Reflect.getMetadata(
			'arrayElementTypes',
			instance,
			targetKey
		);

		// FALLBACK: Resolve from Quick TypeMap
		if (!arrayElementClass) {
			const typeMap = Reflect.getMetadata(QUICK_TYPE_MAP_KEY, modelClass);
			if (typeMap && typeMap[targetKey]) {
				const mappedType = typeMap[targetKey];
				if (Array.isArray(mappedType) && mappedType.length > 0) {
					arrayElementClass = mappedType[0];
					if (mappedType.length > 1) {
						arrayElementTypes = mappedType;
					}
				} else if (typeof mappedType === 'function') {
					// Prototype check logic
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
						arrayElementClass = mappedType;
					}
				}
			}
		}

		if (arrayElementClass) {
			let designType = Reflect.getMetadata('design:type', instance, key);
			if (!designType) {
				const typeMap = Reflect.getMetadata(
					QUICK_TYPE_MAP_KEY,
					modelClass
				);
				if (typeMap && Array.isArray(typeMap[key])) {
					designType = Array;
				}
			}

			const arrayNestingDepth = Reflect.getMetadata(
				'arrayNestingDepth',
				instance,
				key
			);
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
						transformContext,
						recursionContext
					);
				} else {
					const possibleTypes = arrayElementTypes || [
						arrayElementClass,
					];
					const IQDiscriminatorConfig = discriminators?.[targetKey];
					return this.valueTransformer.transformNestedModelArray(
						value,
						possibleTypes,
						IQDiscriminatorConfig,
						transformContext,
						recursionContext
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
							transformContext,
							recursionContext
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
						IQDiscriminatorConfig,
						transformContext,
						recursionContext
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
		const designType = Reflect.getMetadata(
			'design:type',
			instance,
			targetKey
		);

		if (designType && designType !== Array && designType !== Object) {
			return this.valueTransformer.transformByDesignType(
				value,
				designType,
				transformContext,
				recursionContext
			);
		}

		return value; // Default return
	}
}
