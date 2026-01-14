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

		// Strict Mode is DISABLED by default (unless explicitly enabled)
		const isStrict = options.strict ?? globalDefaults.strict ?? false;

		// DoS Protection config
		const maxArrayLength =
			options.maxArrayLength ?? globalDefaults.maxArrayLength ?? 5000000;

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
			const value = data[key];
			if (key === 'save')
				console.log('[POPULATE_DEBUG] Found save key in data');

			// DEBUG
			if (key === 'save') {
				console.log(
					`[DEBUG] decoratedFields: ${JSON.stringify(decoratedFields)}`
				);
			}

			// SECURITY: Prevent Prototype Pollution
			if (this.securityInspector.isDangerousKey(key)) {
				continue;
			}

			// SECURITY: Prevent Method Shadowing (Logic Bomb / DoS)
			if (
				this.securityInspector.isMethodOnPrototype(
					Object.getPrototypeOf(instance),
					key,
					decoratedFields
				)
			) {
				console.log(`[SECURITY] Skipped shadowing attempt for: ${key}`);
				continue;
			}

			// Strict Mode: Check if property is known
			if (isStrict) {
				const isDecorated = decoratedFields.includes(key);
				const hasDesignType = key in designTypes;
				const isDeclared =
					key in instance || key in Object.getPrototypeOf(instance);

				if (!isDecorated && !hasDesignType && !isDeclared) {
					throw new QModelError(
						`Strict Mode: Property '${key}' is not defined in model ${modelClass.name}`,
						{ className: modelClass.name, propertyKey: key, value }
					);
				}
			}

			// SECURITY: Prevent Instance Method Shadowing (Arrow Functions)
			const template = this.getTemplateInstance(modelClass);
			if (
				this.securityInspector.isArrowFunctionMethod(
					key,
					template,
					decoratedFields
				)
			) {
				if (isStrict) {
					throw new QModelError(
						`Strict Mode: Blocked attempt to overwrite instance method '${key}' with data.`,
						{ className: modelClass.name, propertyKey: key, value }
					);
				}
				console.warn(
					`[QuickModel] Security Warning: Blocked attempt to overwrite instance method '${key}' with data. ` +
						`This property acts as a function in the model default state. ` +
						`If you intend to assign data to it, you must explicitly decorate it with @Quick({ ${key}: Type }) or @QType(Type) to authorize the overwrite.`
				);
				continue;
			}

			// Always allow undefined as "missing value" (optional)
			if (value === undefined) {
				instance[key] = value;
				continue;
			}

			// DoS Protection: Check Array Length
			if (Array.isArray(value)) {
				this.sizeValidator.validateArraySize(
					key,
					value,
					maxArrayLength,
					modelClass.name
				);
			}

			// DoS Protection: Check nested object size
			this.sizeValidator.validateNestedObjectSize(
				key,
				value,
				modelClass.name
			);

			// If property is NOT decorated with @QType(), copy as-is (but validate type first)
			if (!decoratedFields.includes(key)) {
				// Validation: Check if value matches the design type (primitives only)
				const expectedType = designTypes[key];
				if (expectedType) {
					this.validatePrimitiveType(
						key,
						value,
						expectedType,
						modelClass.name
					);
				}

				instance[key] = value;
				continue;
			}

			// Property IS decorated with @QType() → transform it
			const context: IQTransformContext = {
				propertyKey: key,
				className: modelClass.name,
				metadata: {
					transformerOptions: options.transformerOptions?.[key],
					maxArrayLength,
				},
			};

			// 0. 🔥 CHECK: Custom transformer from options (High Priority)
			if (
				options.transformers &&
				key in options.transformers &&
				typeof options.transformers[key] === 'function'
			) {
				instance[key] = options.transformers[key](value);
				continue;
			}

			// 1. Check for custom transformer function from @Quick()
			const customTransformer = Reflect.getMetadata(
				'customTransformer',
				instance,
				key
			);
			if (customTransformer && typeof customTransformer === 'function') {
				instance[key] = customTransformer(value);
				continue;
			}

			// 2. Check for custom transformer via fieldType metadata
			const fieldType = Reflect.getMetadata('fieldType', instance, key);
			if (fieldType) {
				const transformer =
					this.transformerLookup.getTransformer(fieldType);
				if (transformer) {
					instance[key] = transformer.deserialize(
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
				key
			);

			// Check if the nested model class has a registered transformer
			if (
				arrayElementClass &&
				!Array.isArray(value) &&
				QTransformerRegistry.has(arrayElementClass)
			) {
				const transformer =
					this.transformerLookup.getTransformer(arrayElementClass);
				if (transformer) {
					instance[key] = transformer.deserialize(
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
				key
			);

			// FALLBACK: If arrayElementClass is missing, try to resolve from Quick TypeMap
			if (!arrayElementClass) {
				const typeMap = Reflect.getMetadata(
					QUICK_TYPE_MAP_KEY,
					modelClass
				);
				if (typeMap && typeMap[key]) {
					const mappedType = typeMap[key];
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

					if (isPrimitiveOrTransformable && !discriminators?.[key]) {
						instance[key] =
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
						const IQDiscriminatorConfig = discriminators?.[key];

						instance[key] =
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
						instance[key] = transformer.deserialize(
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
						instance[key] = value.map((item) => {
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
							`${context.className}.${key}: Expected array, got ${typeof value}`
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
					const hasDiscriminator = !!discriminators?.[key];

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

						instance[key] = value.map((item) => {
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
						const IQDiscriminatorConfig = discriminators?.[key];
						instance[key] =
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
					instance[key] = this.recursiveDeserializer.deserialize(
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
				key
			);

			if (designType === Array && !arrayElementClass) {
				instance[key] = value;
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
					instance[key] = this.valueTransformer.transformByDesignType(
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
					instance[key] = this.valueTransformer.transformByDesignType(
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
						`${context.className}.${key}: Expected object, got array. To allow arrays, use @QType([${designType.name}]) or @Quick({ ${key}: [${designType.name}] })`
					);
				}
				continue;
			}

			instance[key] = this.valueTransformer.transformByDesignType(
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

	private validatePrimitiveType(
		key: string,
		value: unknown,
		expectedType: unknown,
		className: string
	): void {
		if (value === null || value === undefined) return;

		if (expectedType === Number) {
			if (typeof value !== 'number') {
				throw new QModelError(
					`${className}.${key}: Expected number, got ${typeof value}`,
					{
						className,
						propertyKey: key,
						value,
						expectedType: 'number',
					}
				);
			}
		} else if (expectedType === String) {
			if (typeof value !== 'string') {
				throw new QModelError(
					`${className}.${key}: Expected string, got ${typeof value}`,
					{
						className,
						propertyKey: key,
						value,
						expectedType: 'string',
					}
				);
			}
		} else if (expectedType === Boolean) {
			if (typeof value !== 'boolean') {
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
		}
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

	/**
	 * Checks if a key corresponds to a method on the prototype chain.
	 * Used to prevent Method Shadowing attacks where payload data overwrites methods.
	 */
	private isMethodOnPrototype(
		proto: any,
		key: string,
		decoratedFields: string[] = []
	): boolean {
		// If the property is explicitly decorated as a data field, we trust it.
		if (decoratedFields.includes(key)) {
			return false;
		}

		let current = proto;
		while (current && current !== Object.prototype) {
			const descriptor = Object.getOwnPropertyDescriptor(current, key);
			if (descriptor) {
				// Classic method definition
				if (typeof descriptor.value === 'function') {
					return true;
				}
				// Accessors (getters/setters)
				if (
					typeof descriptor.get === 'function' ||
					typeof descriptor.set === 'function'
				) {
					return true;
				}
			}
			current = Object.getPrototypeOf(current);
		}
		return false;
	}
}
