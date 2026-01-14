import 'reflect-metadata';
import {
	ValueTransformerService,
	IRecursiveDeserializer,
} from './value-transformer.service';
import { QTYPES_METADATA_KEY } from '../decorators/qtype.decorator';
import {
	QUICK_DISCRIMINATORS_KEY,
	QUICK_DESIGN_TYPES_KEY,
	QUICK_OPTIONS_KEY,
	QUICK_TYPE_MAP_KEY,
} from '../constants/metadata-keys';
import { QConfig } from '../config/quick.config';
import { IQAdvancedOptions } from '../interfaces/quick-options.interface';
import { QModelError } from '../errors/quickmodel.error';
import { TransformerLookupService } from './transformer-lookup.service';
import { IQTransformContext } from '../interfaces/transformer.interface';
import { QTransformerRegistry } from '../registry/transformer.registry';
import { SecurityInspector } from './security-inspector.service';
import { ObjectSizeValidator } from './object-size-validator.service';
import { RecursionGuard } from './recursion-guard.service';
import { CaseHelper } from '../helpers/case.helper';

/**
 * Service responsible for populating an instance with data.
 */
export class PopulationService {
	private readonly securityInspector = new SecurityInspector();
	private readonly sizeValidator = new ObjectSizeValidator();
	private readonly recursionGuard = new RecursionGuard();

	constructor(
		private readonly valueTransformer: ValueTransformerService,
		private readonly transformerLookup: TransformerLookupService,
		private readonly recursiveDeserializer: IRecursiveDeserializer
	) {}

	/**
	 * Gets a template instance of the model to inspect default values/methods.
	 * Used for intrinsic security checks.
	 * @deprecated Use securityInspector.getTemplateInstance() directly
	 */
	private getTemplateInstance(
		modelClass: Function
	): Record<string, unknown> | null {
		return this.securityInspector.getTemplateInstance(modelClass);
	}

	/**
	 * Populates a model instance with data from a plain object.
	 */
	public populateInstance<T extends Record<string, unknown>>(
		instance: Record<string, unknown>,
		data: T,
		modelClass: Function,
		context?: { visited?: WeakSet<object>; depth?: number }
	): void {
		const visited = context?.visited || new WeakSet();

		// Recursion Limits check
		const currentDepth = context?.depth || 0;
		this.recursionGuard.validateDepth(currentDepth);

		// Circular reference detection
		if (this.recursionGuard.hasCircularReference(data, visited)) {
			// Prevent infinite recursion on circular structures
			return;
		}

		const recursionContext = this.recursionGuard.createContext(context);

		// Get list of properties decorated with @QType()
		const decoratedFields =
			Reflect.getMetadata(QTYPES_METADATA_KEY, instance) ||
			Reflect.getMetadata(
				QTYPES_METADATA_KEY,
				Object.getPrototypeOf(instance)
			) ||
			[];

		// Get discriminator configuration if exists
		const discriminators = Reflect.getMetadata(
			QUICK_DISCRIMINATORS_KEY,
			modelClass
		);

		// Get design:type metadata (captured by @Quick) for validation of non-decorated fields
		const designTypes =
			Reflect.getMetadata(QUICK_DESIGN_TYPES_KEY, modelClass) || {};

		// Get strict mode configuration
		const options: IQAdvancedOptions =
			Reflect.getMetadata(QUICK_OPTIONS_KEY, modelClass) || {};

		const globalDefaults = QConfig.get().defaults || {};

		// Keep strict for backwards compatibility logic
		const strictOption = options.strict ?? globalDefaults.strict;

		// Determine Unknown Property Policy
		// Priority: Model Config > Global Config > Strict Mode Fallback > Default ('keep')
		let unknownPolicy =
			options.unknownPropertyPolicy ||
			globalDefaults.unknownPropertyPolicy;

		if (!unknownPolicy) {
			// Backward compatibility: map strict boolean to policy
			if (strictOption === true) unknownPolicy = 'error';
			else unknownPolicy = 'keep';
		}

		// DoS Protection config
		const maxArrayLength =
			options.maxArrayLength ?? globalDefaults.maxArrayLength ?? 5000000;

		// Internal Identifiers Policy
		const stripInternal =
			options.stripInternalIdentifiers ??
			globalDefaults.stripInternalIdentifiers;

		// Normalization Config
		const normalization = {
			...globalDefaults.normalization,
			...options.normalization,
		};

		// Coercion Strategy
		const coercionStrategy =
			options.coercionStrategy ||
			globalDefaults.coercionStrategy ||
			'strict';

		// Null to Undefined
		const nullToUndefined =
			options.nullToUndefined ?? globalDefaults.nullToUndefined ?? false;

		// Case Transformation Config
		const transformCase =
			options.transformCase || globalDefaults.transformCase;

		// SECURITY: Prevent Stack Overflow via Deep Recursion
		this.recursionGuard.validateDepth(recursionContext.depth);

		// SECURITY: Prevent Memory Exhaustion via Massive Objects
		const PROPS_LIMIT = 50000;
		const keys = Object.keys(data);
		this.sizeValidator.validateObjectSize(
			keys,
			PROPS_LIMIT,
			modelClass.name
		);

		for (const key of keys) {
			let value = data[key];

			// Case Transformation (Input Key -> Model Property)
			let targetKey = key;
			if (transformCase?.in) {
				// If input case is specified, we assume we need to convert it to camelCase
				// to match standard property naming conventions.
				const normalizedKey = CaseHelper.toCase('camelCase', key);

				// Check if normalized key is a known property on the model
				const isNormalizedKnown =
					decoratedFields.includes(normalizedKey) ||
					Object.prototype.hasOwnProperty.call(
						designTypes,
						normalizedKey
					) ||
					Object.prototype.hasOwnProperty.call(
						instance,
						normalizedKey
					);

				// Check if original key is a known property on the model
				const isOriginalKnown =
					decoratedFields.includes(key) ||
					Object.prototype.hasOwnProperty.call(designTypes, key) ||
					Object.prototype.hasOwnProperty.call(instance, key);

				if (isNormalizedKnown) {
					targetKey = normalizedKey;
				} else if (!isOriginalKnown) {
					// Neither is explicitly known.
					// If transformCase is explicit, we assume the intention IS to normalize keys
					// to maintain standard JS conventions (camelCase), even for loose schemas.
					targetKey = normalizedKey;
				}
				// If isOriginalKnown is true and isNormalizedKnown is false, we keep original key.
			}

			// Normalization logic (String trimming, etc) applied to VALUE
			if (key === 'save')
				console.log('[POPULATE_DEBUG] Found save key in data');

			// DEBUG
			if (key === 'save') {
				console.log(
					`[DEBUG] decoratedFields: ${JSON.stringify(decoratedFields)}`
				);
			}

			// SECURITY: Prevent Prototype Pollution (Check raw input key)
			if (this.securityInspector.isDangerousKey(key)) {
				continue;
			}

			// SECURITY: Prevent Method Shadowing (Logic Bomb / DoS)
			// Check TARGET key because that's what will be assigned
			if (
				this.securityInspector.isMethodOnPrototype(
					Object.getPrototypeOf(instance),
					targetKey,
					decoratedFields
				)
			) {
				console.log(
					`[SECURITY] Skipped shadowing attempt for: ${targetKey} (mapped from ${key})`
				);
				continue;
			}

			// SECURITY: Strip Internal Identifiers
			if (stripInternal) {
				const prefixes = Array.isArray(stripInternal)
					? stripInternal
					: ['_', '$'];
				if (prefixes.some((prefix) => key.startsWith(prefix))) {
					continue;
				}
			}

			// Normalization
			if (
				typeof value === 'string' &&
				(normalization.trimStrings || normalization.emptyStringAsNull)
			) {
				if (normalization.trimStrings) {
					value = value.trim();
				}
				if (normalization.emptyStringAsNull && value === '') {
					value = null;
				}
			}

			// Null to Undefined
			if (value === null && nullToUndefined) {
				value = undefined;
			}

			// Unknown Property Handling
			const isDecorated = decoratedFields.includes(targetKey);

			const hasDesignType = targetKey in designTypes;
			const isDeclared =
				targetKey in instance ||
				targetKey in Object.getPrototypeOf(instance);
			const isUnknown = !isDecorated && !hasDesignType && !isDeclared;

			if (isUnknown) {
				if (unknownPolicy === 'error') {
					throw new QModelError(
						`Strict Mode: Property '${targetKey}' (mapped from '${key}') is not defined in model ${modelClass.name}`,
						{
							className: modelClass.name,
							propertyKey: targetKey,
							value,
						}
					);
				}
				if (unknownPolicy === 'strip') {
					continue;
				}
				// 'keep': Proceed normally
			}

			// SECURITY: Prevent Instance Method Shadowing (Arrow Functions)
			const template = this.getTemplateInstance(modelClass);
			if (
				this.securityInspector.isArrowFunctionMethod(
					targetKey,
					template,
					decoratedFields
				)
			) {
				if (strictOption) {
					throw new QModelError(
						`Strict Mode: Blocked attempt to overwrite instance method '${targetKey}' with data.`,
						{
							className: modelClass.name,
							propertyKey: targetKey,
							value,
						}
					);
				}
				console.warn(
					`[QuickModel] Security Warning: Blocked attempt to overwrite instance method '${targetKey}' with data. ` +
						`This property acts as a function in the model default state. ` +
						`If you intend to assign data to it, you must explicitly decorate it with @Quick({ ${targetKey}: Type }) or @QType(Type) to authorize the overwrite.`
				);
				continue;
			}

			// Always allow undefined as "missing value" (optional)
			if (value === undefined) {
				instance[targetKey] = value;
				continue;
			}

			// DoS Protection: Check Array Length
			if (Array.isArray(value)) {
				this.sizeValidator.validateArraySize(
					targetKey,
					value,
					maxArrayLength,
					modelClass.name
				);
			}

			// DoS Protection: Check nested object size
			this.sizeValidator.validateNestedObjectSize(
				targetKey,
				value,
				modelClass.name
			);

			// If property is NOT decorated with @QType(), transform by design type
			// This allows __type polymorphism for generic fields (Object/any)
			if (!decoratedFields.includes(targetKey)) {
				// Validation: Check if value matches the design type (primitives only)
				const expectedType = designTypes[targetKey];
				if (expectedType) {
					value = this.validateOrCoercePrimitiveType(
						targetKey,
						value,
						expectedType,
						modelClass.name,
						coercionStrategy
					);
				}

				// Transform by design type (handles __type polymorphism for generic fields)
				const transformContext: IQTransformContext = {
					propertyKey: targetKey,
					className: modelClass.name,
				};
				instance[targetKey] =
					this.valueTransformer.transformByDesignType(
						value,
						expectedType,
						transformContext,
						recursionContext
					);
				continue;
			}

			// Property IS decorated with @QType() → transform it
			const context: IQTransformContext = {
				propertyKey: targetKey,
				className: modelClass.name,
				metadata: {
					transformerOptions: options.transformerOptions?.[targetKey],
					maxArrayLength,
					coercionStrategy,
				},
			};

			// 0. 🔥 CHECK: Custom transformer from options (High Priority)
			const customTransformerFn = options.transformers?.[targetKey];
			if (typeof customTransformerFn === 'function') {
				instance[targetKey] = customTransformerFn(value);
				continue;
			}

			// 1. Check for custom transformer function from @Quick()
			const customTransformer = Reflect.getMetadata(
				'customTransformer',
				instance,
				targetKey
			);
			if (customTransformer && typeof customTransformer === 'function') {
				instance[targetKey] = customTransformer(value);
				continue;
			}

			// 2. Check for custom transformer via fieldType metadata
			const fieldType = Reflect.getMetadata(
				'fieldType',
				instance,
				targetKey
			);
			if (fieldType) {
				const transformer =
					this.transformerLookup.getTransformer(fieldType);
				if (transformer) {
					instance[targetKey] = transformer.deserialize(
						value,
						context.propertyKey,
						context.className,
						context
					);
					continue;
				}
			}

			// 3. Check for array of models or nested model
			let arrayElementClass = Reflect.getMetadata(
				'arrayElementClass',
				instance,
				targetKey
			);

			// FALLBACK: Implicit Primitive Handling for @QType() (no args)
			// If property is decorated but has no explicit transformer or array config
			if (!fieldType && !arrayElementClass) {
				const expectedType = designTypes[targetKey];

				// Only handle primitives (String, Number, Boolean) implicitly
				if (
					expectedType &&
					(expectedType === String ||
						expectedType === Number ||
						expectedType === Boolean)
				) {
					instance[targetKey] = this.validateOrCoercePrimitiveType(
						targetKey,
						value,
						expectedType,
						modelClass.name,
						coercionStrategy
					);
					continue;
				}
			}

			// Check if the nested model class has a registered transformer
			if (
				arrayElementClass &&
				!Array.isArray(value) &&
				QTransformerRegistry.has(arrayElementClass)
			) {
				const transformer =
					this.transformerLookup.getTransformer(arrayElementClass);
				if (transformer) {
					instance[targetKey] = transformer.deserialize(
						value,
						context.propertyKey,
						context.className,
						context
					);
					continue;
				}
			}

			let arrayElementTypes = Reflect.getMetadata(
				'arrayElementTypes',
				instance,
				targetKey
			);

			// FALLBACK: If arrayElementClass is missing, try to resolve from Quick TypeMap
			if (!arrayElementClass) {
				const typeMap = Reflect.getMetadata(
					QUICK_TYPE_MAP_KEY,
					modelClass
				);
				if (typeMap && typeMap[targetKey]) {
					const mappedType = typeMap[targetKey];
					if (Array.isArray(mappedType) && mappedType.length > 0) {
						arrayElementClass = mappedType[0];
						if (mappedType.length > 1) {
							arrayElementTypes = mappedType;
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
							arrayElementClass = mappedType;
						}
					}
				}
			}

			if (arrayElementClass) {
				// If we recovered arrayElementClass from fallback, force design:type to Array if it was missing/wrong
				let designType = Reflect.getMetadata(
					'design:type',
					instance,
					key
				);
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

				// 🔥 NEW: If explicit nesting depth is specified
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
						instance[targetKey] =
							this.valueTransformer.transformNestedArray(
								value,
								arrayElementClass,
								context,
								recursionContext
							);
					} else {
						const possibleTypes = arrayElementTypes || [
							arrayElementClass,
						];
						const IQDiscriminatorConfig =
							discriminators?.[targetKey];

						instance[targetKey] =
							this.valueTransformer.transformNestedModelArray(
								value,
								possibleTypes,
								IQDiscriminatorConfig,
								context,
								recursionContext
							);
					}
					continue;
				}

				// Check if arrayElementClass is Set or Map WITHOUT arrayNestingDepth
				if (
					(arrayElementClass === Set || arrayElementClass === Map) &&
					!arrayNestingDepth
				) {
					const IQTransformerKey =
						arrayElementClass === Set ? 'set' : 'map';
					const transformer =
						this.transformerLookup.getTransformer(IQTransformerKey);
					if (transformer) {
						instance[targetKey] = transformer.deserialize(
							value,
							context.propertyKey,
							context.className,
							context
						);
						continue;
					}
				}

				// Special handling for arrays of Set/Map
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
						instance[targetKey] = value.map((item) => {
							if (item === null || item === undefined)
								return item;
							return transformer.deserialize(
								item,
								context.propertyKey,
								context.className,
								context
							);
						});
						continue;
					}
				}

				// Logic to handle TypedArrays (whole array transformation) vs Element mapping
				if (isArrayType) {
					if (!Array.isArray(value)) {
						throw new Error(
							`${context.className}.${targetKey}: Expected array, got ${typeof value}`
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

						instance[targetKey] = value.map((item) => {
							if (item === null || item === undefined)
								return item;
							if (isTypedArrayElement && Array.isArray(item)) {
								return this.valueTransformer.transformByDesignType(
									item,
									arrayElementClass,
									context
								);
							}
							if (Array.isArray(item)) {
								return this.valueTransformer.transformNestedArray(
									item,
									arrayElementClass,
									context,
									recursionContext
								);
							}
							return this.valueTransformer.transformByDesignType(
								item,
								arrayElementClass,
								context,
								recursionContext
							);
						});
					} else {
						const possibleTypes = arrayElementTypes || [
							arrayElementClass,
						];
						const IQDiscriminatorConfig =
							discriminators?.[targetKey];
						instance[targetKey] =
							this.valueTransformer.transformNestedModelArray(
								value,
								possibleTypes,
								IQDiscriminatorConfig,
								context,
								recursionContext
							);
					}
					continue;
				}

				// If not Array, it's an individual nested model
				if (
					typeof value === 'object' &&
					value !== null &&
					!Array.isArray(value)
				) {
					instance[targetKey] =
						this.recursiveDeserializer.deserialize(
							value as Record<string, unknown>,
							arrayElementClass,
							recursionContext
						);
					continue;
				}
			}

			// 4. Auto-detection via design:type
			const designType = Reflect.getMetadata(
				'design:type',
				instance,
				targetKey
			);

			if (designType === Array && !arrayElementClass) {
				instance[targetKey] = value;
				continue;
			}

			// 4.5 SPECIAL CASE: auto-wrap as [Type]
			// Simplified this part or should I ask ValueTransformerService to handle?
			// The original logic had a complex condition check here.
			// Replicating logic using ValueTransformer.

			// Handled by generic transformByDesignType logic inside loop or explicit array map
			if (
				Array.isArray(value) &&
				designType &&
				designType !== Array &&
				designType !== Object
			) {
				// Special Case: Set/Map
				if (designType === Set || designType === Map) {
					instance[targetKey] =
						this.valueTransformer.transformByDesignType(
							value,
							designType,
							context
						);
					continue;
				}

				// TypedArrays/Buffers
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
				const isTypedArray =
					typedArrayConstructors.includes(designType);
				const isArrayBuffer = designType === ArrayBuffer;
				const isDataView = designType === DataView;

				if (isTypedArray || isArrayBuffer || isDataView) {
					instance[targetKey] =
						this.valueTransformer.transformByDesignType(
							value,
							designType,
							context
						);
				} else {
					// STRICT VALIDATION:
					// If we are here, it means we have an Array value but design:type is NOT Array (and not a special native type like Set/Map/TypedArray).
					// This usually means the user did @QType(Model) but passed an array.
					// We should THROW here instead of auto-wrapping, to enforce explicit array syntax.

					// Exception: Mixed primitives might rely on this?
					// But primitives (String, Number) don't take Array in constructor usually.
					// So it's safe to throw for them too if they receive an array.

					throw new Error(
						`${context.className}.${targetKey}: Expected object, got array. To allow arrays, use @QType([${designType.name}]) or @Quick({ ${targetKey}: [${designType.name}] })`
					);
				}
				continue;
			}

			instance[targetKey] = this.valueTransformer.transformByDesignType(
				value,
				designType,
				context
			);
		}

		// Handle Dot Notation properties
		const dotNotationFields = decoratedFields.filter(
			(f: unknown) => typeof f === 'string' && f.includes('.')
		);

		for (const dotKey of dotNotationFields) {
			this.applyDotNotationTransform(
				instance,
				dotKey as string,
				modelClass,
				recursionContext
			);
		}
	}

	private validateOrCoercePrimitiveType(
		key: string,
		value: unknown,
		expectedType: unknown,
		className: string,
		strategy: 'strict' | 'loose'
	): unknown {
		if (value === null || value === undefined) return value;

		if (expectedType === Number) {
			if (typeof value === 'number') return value;

			if (strategy === 'loose') {
				const coerced = Number(value);
				if (!isNaN(coerced)) return coerced;
			}

			throw new QModelError(
				`${className}.${key}: Expected number, got ${typeof value}`,
				{
					className,
					propertyKey: key,
					value,
					expectedType: 'number',
				}
			);
		} else if (expectedType === String) {
			if (typeof value === 'string') return value;

			if (strategy === 'loose') {
				if (
					typeof value === 'number' ||
					typeof value === 'boolean' ||
					typeof value === 'bigint'
				) {
					return String(value);
				}
			}

			throw new QModelError(
				`${className}.${key}: Expected string, got ${typeof value}`,
				{
					className,
					propertyKey: key,
					value,
					expectedType: 'string',
				}
			);
		} else if (expectedType === Boolean) {
			if (typeof value === 'boolean') return value;

			if (strategy === 'loose') {
				if (value === 'true') return true;
				if (value === 'false') return false;
				if (value === 1) return true;
				if (value === 0) return false;
			}

			throw new QModelError(
				`${className}.${key}: Expected boolean, got ${typeof value}`,
				{
					className,
					propertyKey: key,
					value,
					expectedType: 'boolean',
				}
			);
		}

		return value;
	}

	private applyDotNotationTransform(
		instance: Record<string, unknown>,
		path: string,
		modelClass: Function,
		recursionContext?: { visited?: WeakSet<object> }
	): void {
		const parts = path.split('.');
		let current: Record<string, unknown> = instance;

		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i];
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
							context,
							recursionContext
						);
				} else {
					current[lastKey] =
						this.valueTransformer.transformNestedModelArray(
							value,
							[arrayElementClass],
							undefined,
							context,
							recursionContext
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
