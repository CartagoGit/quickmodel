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

// ─── Performance caches ───────────────────────────────────────────────────────
// Model-class metadata is immutable after decorators run. Caching per class
// avoids repeated Reflect.getMetadata calls on every model construction.
interface IQPopulateClassMeta {
	options: IQAdvancedOptions;
	decoratedFields: string[];
	decoratedFieldsSet: Set<string>;
	discriminators: unknown;
	designTypes: Record<string, unknown>;
	hasTypeMapKey: boolean;
	/** Set of property names decorated with @QComputed — skip on deserialization. */
	computedKeysSet: Set<string>;
	/**
	 * Lazy cache: isMethodOnPrototype(proto, key) result per key.
	 * Populated on first construction — saved for all subsequent constructions.
	 */
	isMethodCache: Map<string, boolean>;
	/**
	 * Lazy cache: isArrowFunctionMethod(key, template, decoratedFields) result per key.
	 */
	isArrowMethodCache: Map<string, boolean>;
}
const _POPULATE_CLASS_META = new WeakMap<Function, IQPopulateClassMeta>();

// ─── Merged runtime options cache ────────────────────────────────────────────
// Merges model-level @Quick options with QConfig.get().defaults once per
// (class, globalConfig reference). Invalidated automatically when QConfig
// is reconfigured (detect via object identity comparison).
interface IQMergedRuntimeOptions {
	disableSafetyChecks: boolean;
	unknownPolicy: 'keep' | 'strip' | 'error';
	/** true when model or global config explicitly set unknownPropertyPolicy */
	unknownPolicyExplicit: boolean;
	maxArrayLength: number;
	normalization: { trimStrings?: boolean; emptyStringAsNull?: boolean };
	coercionStrategy: 'strict' | 'loose';
	nullToUndefined: boolean;
	transformCase: IQAdvancedOptions['transformCase'] | undefined;
	stripInternal: IQAdvancedOptions['stripInternalIdentifiers'] | undefined;
	/** Cached maxRecursionDepth — avoids extra QConfig.get() in validateDepth */
	maxRecursionDepth: number;
}
interface IQMergedMetaCacheEntry {
	/** Reference to the QConfig.defaults at build time — used for change detection */
	configRef: IQAdvancedOptions | undefined;
	merged: IQMergedRuntimeOptions;
}
const _MERGED_RUNTIME_META = new WeakMap<Function, IQMergedMetaCacheEntry>();

/** Builds and caches the merged (model + global) runtime options for a class */
function _getMergedRuntimeOptions(
	modelClass: Function,
	options: IQAdvancedOptions
): IQMergedRuntimeOptions {
	const rawGlobalDefaults = QConfig.get().defaults;
	const globalDefaults = rawGlobalDefaults as IQAdvancedOptions | undefined;
	const cached = _MERGED_RUNTIME_META.get(modelClass);
	if (cached && cached.configRef === globalDefaults) {
		return cached.merged;
	}
	const gDef = globalDefaults || ({} as IQAdvancedOptions);
	const merged: IQMergedRuntimeOptions = {
		disableSafetyChecks:
			options?.performance?.disableSafetyChecks ??
			gDef?.performance?.disableSafetyChecks ??
			false,
		unknownPolicy:
			options.unknownPropertyPolicy ||
			gDef.unknownPropertyPolicy ||
			'keep',
		/** true when at least one of model or global explicitly sets the policy */
		unknownPolicyExplicit: !!(
			options.unknownPropertyPolicy || gDef.unknownPropertyPolicy
		),
		maxArrayLength:
			options.maxArrayLength ?? gDef.maxArrayLength ?? 5000000,
		normalization: {
			...gDef.normalization,
			...options.normalization,
		},
		coercionStrategy:
			options.coercionStrategy || gDef.coercionStrategy || 'strict',
		nullToUndefined:
			options.nullToUndefined ?? gDef.nullToUndefined ?? false,
		transformCase: options.transformCase || gDef.transformCase,
		stripInternal:
			options.stripInternalIdentifiers ?? gDef.stripInternalIdentifiers,
		maxRecursionDepth: rawGlobalDefaults?.maxRecursionDepth ?? 50,
	};
	_MERGED_RUNTIME_META.set(modelClass, { configRef: globalDefaults, merged });
	return merged;
}
// ─────────────────────────────────────────────────────────────────────────────

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

		// ── Per-class metadata cache ─────────────────────────────────────────
		// All Reflect.getMetadata calls on modelClass are static after decorators run.
		// We build and cache them once, then reuse across every construction.
		let classMeta = _POPULATE_CLASS_META.get(modelClass);
		if (!classMeta) {
			const rawOptions: IQAdvancedOptions =
				Reflect.getMetadata(QUICK_OPTIONS_KEY, modelClass) || {};
			const rawDecorated: string[] =
				Reflect.getMetadata(
					QTYPES_METADATA_KEY,
					modelClass.prototype
				) || [];
			const rawDiscriminators = Reflect.getMetadata(
				QUICK_DISCRIMINATORS_KEY,
				modelClass
			);
			const rawDesignTypes: Record<string, unknown> =
				Reflect.getMetadata(QUICK_DESIGN_TYPES_KEY, modelClass) || {};
			const rawHasTypeMapKey = Reflect.hasMetadata(
				QUICK_TYPE_MAP_KEY,
				modelClass
			);

			// Build computed keys set by walking prototype chain once per class
			const computedKeysSet = new Set<string>();
			let proto = modelClass.prototype;
			while (proto && proto !== Object.prototype) {
				for (const propKey of Object.getOwnPropertyNames(proto)) {
					if (
						Reflect.hasMetadata(
							QCOMPUTED_METADATA_KEY,
							proto,
							propKey
						)
					) {
						computedKeysSet.add(propKey);
					}
				}
				proto = Object.getPrototypeOf(proto);
			}

			classMeta = {
				options: rawOptions,
				decoratedFields: rawDecorated,
				decoratedFieldsSet: new Set(rawDecorated),
				discriminators: rawDiscriminators,
				designTypes: rawDesignTypes,
				hasTypeMapKey: rawHasTypeMapKey,
				computedKeysSet,
				isMethodCache: new Map(),
				isArrowMethodCache: new Map(),
			};
			_POPULATE_CLASS_META.set(modelClass, classMeta);
		}

		// Model-level options (cached). Merged with global defaults via per-class cache
		// invalidated automatically when QConfig is reconfigured (reference comparison).
		const options = classMeta.options;
		const {
			disableSafetyChecks,
			unknownPolicy,
			unknownPolicyExplicit,
			maxArrayLength,
			normalization,
			coercionStrategy,
			nullToUndefined,
			transformCase,
			stripInternal,
			maxRecursionDepth,
		} = _getMergedRuntimeOptions(modelClass, options);

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

		if (!disableSafetyChecks && currentDepth > maxRecursionDepth) {
			throw new Error(
				`QuickModel Security: Maximum recursion depth (${maxRecursionDepth}) exceeded during population.`
			);
		}

		// Circular reference detection — reuse recursionContext.visited to avoid a second new WeakSet()
		const recursionContext = this.recursionGuard.createContext(context);
		if (
			this.recursionGuard.hasCircularReference(
				data,
				recursionContext.visited
			)
		) {
			// Prevent infinite recursion on circular structures
			return;
		}

		// Use cached class metadata — all static after decorators run
		const {
			decoratedFields,
			decoratedFieldsSet,
			discriminators,
			designTypes,
		} = classMeta;

		// Deprecation warning: the default 'keep' will change to 'strip' in v2.0.0.
		// Only fires for classes explicitly decorated with @Quick, once per class.
		if (
			currentDepth === 0 &&
			classMeta.hasTypeMapKey &&
			!unknownPolicyExplicit &&
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
					decoratedFieldsSet.has(normalizedKey) ||
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
					decoratedFieldsSet.has(key) ||
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
			// Check TARGET key because that's what will be assigned (result cached per class.key)
			let isMethod = classMeta.isMethodCache.get(targetKey);
			if (isMethod === undefined) {
				isMethod = this.securityInspector.isMethodOnPrototype(
					Object.getPrototypeOf(instance),
					targetKey,
					decoratedFields
				);
				classMeta.isMethodCache.set(targetKey, isMethod);
			}
			if (isMethod) {
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
			const isDecorated = decoratedFieldsSet.has(targetKey);

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

			// @QComputed() properties are skip on deserialization (cached per class)
			if (classMeta.computedKeysSet.has(targetKey)) continue;

			// SECURITY: Prevent Instance Method Shadowing (Arrow Functions)
			// Result cached per (class, key) — static after class definition
			let isArrow = classMeta.isArrowMethodCache.get(targetKey);
			if (isArrow === undefined) {
				const template =
					this.securityInspector.getTemplateInstance(modelClass);
				isArrow = this.securityInspector.isArrowFunctionMethod(
					targetKey,
					template,
					decoratedFields
				);
				classMeta.isArrowMethodCache.set(targetKey, isArrow);
			}
			if (isArrow) {
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
					decoratedFieldsSet,
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
				path: dotKey,
				modelClass,
				recursionContext,
			});
		}
	}
}
