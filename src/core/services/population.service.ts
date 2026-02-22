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
	QCOMPUTED_METADATA_KEY,
} from '../constants/metadata-keys';
import { QConfig } from '../config/quick.config';
import { IQAdvancedOptions } from '../interfaces/quick-options.interface';
import { QModelError } from '../errors/quickmodel.error';
import { TransformerLookupService } from './transformer-lookup.service';
import { SecurityInspector } from './security-inspector.service';
import { ObjectSizeValidator } from './object-size-validator.service';
import { RecursionGuard } from './recursion-guard.service';
import { CaseHelper } from '../helpers/case.helper';
import { DotNotationHandler } from './dot-notation-handler.service';
import { PropertyTransformer } from './property-transformer.service';
import { Logger } from '../helpers/logger.helper';

/**
 * Service responsible for populating an instance with data.
 */
export class PopulationService {
	private readonly securityInspector = new SecurityInspector();
	private readonly sizeValidator = new ObjectSizeValidator();
	private readonly recursionGuard = new RecursionGuard();

	/**
	 * Tracks which model classes have already received the `unknownPropertyPolicy`
	 * deprecation warning so it fires at most once per class.
	 * @internal
	 */
	private static readonly _warnedMissingPolicy = new Set<Function>();

	/**
	 * Clears the per-class cache of deprecation warnings.
	 * Intended for use in tests only — do not call in production code.
	 * @internal
	 */
	public static _clearWarnedPolicyCache(): void {
		PopulationService._warnedMissingPolicy.clear();
	}
	private readonly dotNotationHandler: DotNotationHandler;
	private readonly propertyTransformer: PropertyTransformer;

	constructor(
		valueTransformer: ValueTransformerService,
		transformerLookup: TransformerLookupService,
		recursiveDeserializer: IRecursiveDeserializer
	) {
		this.dotNotationHandler = new DotNotationHandler(
			transformerLookup,
			valueTransformer,
			recursiveDeserializer
		);
		this.propertyTransformer = new PropertyTransformer(
			valueTransformer,
			transformerLookup,
			recursiveDeserializer
		);
	}

	/**
	 * Populates a model instance with data from a plain object.
	 */
	public populateInstance<T extends Record<string, unknown>>(
		instance: Record<string, unknown>,
		data: T,
		params: {
			modelClass: Function;
			context?: { visited?: WeakSet<object>; depth?: number };
		}
	): void {
		const { modelClass, context } = params;
		const visited = context?.visited || new WeakSet();

		// Get strict mode configuration
		const options: IQAdvancedOptions =
			Reflect.getMetadata(QUICK_OPTIONS_KEY, modelClass) || {};

		const globalDefaults = QConfig.get().defaults || {};

		const disableSafetyChecks =
			options?.performance?.disableSafetyChecks ??
			globalDefaults?.performance?.disableSafetyChecks ??
			false;

		// Recursion Limits check
		const currentDepth = context?.depth || 0;

		// Emit a security warning when safety checks are disabled (only on root call, not recursion)
		if (disableSafetyChecks && currentDepth === 0) {
			Logger.warn(
				`disableSafetyChecks is ENABLED on "${(modelClass as { name?: string }).name ?? 'unknown'}". ` +
					'Performance checks bypassed: initial recursion depth limit, array size limit, nested object size limit. ' +
					'Prototype pollution protection, method shadowing protection, and circular reference detection remain active. ' +
					'Do NOT use this in production with untrusted input.'
			);
		}

		if (!disableSafetyChecks) {
			this.recursionGuard.validateDepth(currentDepth);
		}

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

		// Determine Unknown Property Policy
		// Priority: Model Config > Global Config > Default ('keep')
		const unknownPolicy =
			options.unknownPropertyPolicy ||
			globalDefaults.unknownPropertyPolicy ||
			'keep';

		// Deprecation warning: the default 'keep' will change to 'strip' in v2.0.0.
		// Only fires for classes explicitly decorated with @Quick, once per class.
		if (
			currentDepth === 0 &&
			Reflect.hasMetadata(QUICK_TYPE_MAP_KEY, modelClass) &&
			!options.unknownPropertyPolicy &&
			!globalDefaults.unknownPropertyPolicy &&
			!PopulationService._warnedMissingPolicy.has(modelClass)
		) {
			PopulationService._warnedMissingPolicy.add(modelClass);
			Logger.warn(
				`[QuickModel] Deprecation: "${(modelClass as { name?: string }).name ?? 'unknown'}" does not set 'unknownPropertyPolicy'. ` +
					"Currently defaulting to 'keep' (unknown properties are preserved). " +
					"In v2.0.0 the default will change to 'strip'. " +
					"Set it explicitly: @Quick({...}, { unknownPropertyPolicy: 'strip' }) to silence this warning."
			);
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
		this.sizeValidator.validateObjectSize({
			keys,
			limit: PROPS_LIMIT,
			className: modelClass.name,
		});

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
			if (key === 'save') {
				Logger.debug(
					'[POPULATE_DEBUG] Found save key in data',
					modelClass,
					{ decoratedFields }
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
				Logger.debug(
					`[SECURITY] Skipped shadowing attempt for: ${targetKey} (mapped from ${key})`,
					modelClass
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

			// @QComputed() properties are read-only computed getters — skip deserialization assignment
			let isComputedGetter = false;
			let checkProto = Object.getPrototypeOf(instance);
			while (checkProto && checkProto !== Object.prototype) {
				if (
					Reflect.hasMetadata(
						QCOMPUTED_METADATA_KEY,
						checkProto,
						targetKey
					)
				) {
					isComputedGetter = true;
					break;
				}
				checkProto = Object.getPrototypeOf(checkProto);
			}
			if (isComputedGetter) continue;

			// SECURITY: Prevent Instance Method Shadowing (Arrow Functions)
			const template =
				this.securityInspector.getTemplateInstance(modelClass);
			if (
				this.securityInspector.isArrowFunctionMethod(
					targetKey,
					template,
					decoratedFields
				)
			) {
				if (unknownPolicy === 'error') {
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
			if (!disableSafetyChecks && Array.isArray(value)) {
				this.sizeValidator.validateArraySize({
					key: targetKey,
					value,
					maxLength: maxArrayLength,
					className: modelClass.name,
				});
			}

			// DoS Protection: Check nested object size
			if (!disableSafetyChecks) {
				this.sizeValidator.validateNestedObjectSize(
					targetKey,
					value,
					modelClass.name
				);
			}

			// Transform Property
			instance[targetKey] = this.propertyTransformer.transformProperty(
				targetKey,
				value,
				{
					instance,
					modelClass,
					decoratedFields,
					designTypes,
					options,
					discriminators,
					transformContext: {
						propertyKey: targetKey,
						className: modelClass.name,
					},
					recursionContext,
					maxArrayLength,
					coercionStrategy: coercionStrategy,
				}
			);
		}

		// Handle Dot Notation properties
		const dotNotationFields = decoratedFields.filter(
			(field: unknown) => typeof field === 'string' && field.includes('.')
		);

		for (const dotKey of dotNotationFields) {
			this.dotNotationHandler.apply(instance, {
				path: dotKey as string,
				modelClass,
				recursionContext,
			});
		}
	}
}
