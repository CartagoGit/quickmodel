/**
 * Service for checking type integrity of model instances.
 *
 * @remarks
 * This class follows SOLID principles:
 * - **Single Responsibility**: Only handles model type integrity checks
 *
 * @see {@link QModel.checkIntegrity} — public entry-point that delegates to this service
 * @see {@link QModel.hasIntegrity} — boolean shortcut over `checkIntegrity()`
 * @see {@link QTransformerRegistry} — custom transformers consulted during checks
 * @see {@link IQIntegrityResult} — shape of each error entry returned
 *
 * @example
 * ```typescript
 * const service = new IntegrityService();
 *
 * class User extends QuickModel<IUser> {
 *   @QType('date') birthDate!: Date;
 * }
 *
 * const user = new User({ birthDate: "invalid" });
 * const results = service.checkIntegrity(user, { modelClass: User });
 *
 * if (results.length > 0) {
 *   console.error('Integrity errors:', results);
 * }
 *
 * // Or use convenience method
 * if (!service.isValid(user, User)) {
 *   console.error('User is invalid');
 * }
 * ```
 */

import 'reflect-metadata';
import { QConfig } from '../config/quick.config';
import { TraceLogger } from '../helpers/trace-logger.helper';
import {
	IQIntegrityResult,
	IQIntegrityChecker,
	IQTransformer,
} from '../interfaces/transformer.interface';
import {
	QTransformerRegistry,
	type IQTransformerKey,
} from '../registry/transformer.registry';
import { BigIntTransformer } from '@/transformers/bigint.transformer';
import { DateTransformer } from '@/transformers/date.transformer';
import { ErrorTransformer } from '@/transformers/error.transformer';
import {
	MapTransformer,
	SetTransformer,
} from '@/transformers/map-set.transformer';
import {
	WeakMapTransformer,
	WeakSetTransformer,
} from '@/transformers/weak-collections.transformer';
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
import { QUICK_OPTIONS_KEY } from '../constants/metadata-keys';

// ---------------------------------------------------------------------------
// Module-level per-class caches — built once on first validation, reused after
// ---------------------------------------------------------------------------

/** @internal Static metadata that never changes after class decoration. */
interface IQIntegrityClassMeta {
	/** Result of Reflect.getMetadata(QUICK_OPTIONS_KEY, configClass) */
	localOptions: Record<string, unknown>;
	/** List of property names decorated with @QType / @Quick */
	decoratedFields: string[];
	/** fieldType metadata per decorated field — static after decoration */
	fieldTypes: Map<string, unknown>;
}

/** @internal Per-class merged/runtime options, invalidated when QConfig reference changes. */
interface IQIntegrityMergedOpts {
	/** Reference snapshot of QConfig used when this entry was built. */
	configRef: unknown;
	/** Resolved strategy: true = failFast, false = accumulate. */
	failFast: boolean;
}

const _INTEGRITY_CLASS_META = new WeakMap<Function, IQIntegrityClassMeta>();
const _INTEGRITY_MERGED_OPTS = new WeakMap<Function, IQIntegrityMergedOpts>();

/** @internal Context passed between recursive calls to track cycle detection and depth. */
type IIntegrityContext = {
	/** Tracks already-visited objects to prevent infinite cycles. */
	seen: WeakSet<object>;
	/** Current recursion depth; validated against MAX_DEPTH. */
	depth: number;
};

/**
 * Options accepted by {@link IntegrityService.checkIntegrity}.
 */
export interface IIntegrityOptions {
	/**
	 * The model class constructor. Used to resolve metadata and configuration.
	 * When omitted, the constructor is inferred from the instance.
	 */
	modelClass?: Function;
	/** @internal Recursion context — do not pass externally. */
	ctx?: IIntegrityContext;
}

/** @internal */
export class IntegrityService {
	private transformers = new Map<string, IQTransformer<unknown, unknown>>();
	/** @internal Cache for string-key toLowerCase() results inside getTransformer() */
	private readonly _strKeyCache = new Map<string, string>();
	/** @internal Cache for function/object-key toLowerCase() results inside getTransformer() */
	private readonly _fnKeyCache = new WeakMap<object, string>();

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
		const weakMapTransformer = new WeakMapTransformer();
		const weakSetTransformer = new WeakSetTransformer();
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
		this.transformers.set('weakmap', weakMapTransformer);
		this.transformers.set('weakset', weakSetTransformer);
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
	 * Resolves the transformer (custom or default) for the given key.
	 *
	 * Lookup order:
	 * 1. **Global registry** (`QTransformerRegistry`) — user-registered overrides win.
	 * 2. **Local defaults** — built-in transformers registered in the constructor.
	 *
	 * String keys are normalised to lowercase; function/constructor keys are resolved
	 * via their `.name` property, both results cached to avoid repeated allocations.
	 *
	 * @param key - A string alias (`"date"`, `"bigint"`) or a constructor reference (`Date`, `BigInt`).
	 * @returns The matching `IQTransformer`, or `undefined` if none is registered for the key.
	 * @see {@link QTransformerRegistry.get} — global registry lookup used first
	 * @see {@link IQTransformer} — interface the returned transformer implements
	 */
	public getTransformer(
		key: IQTransformerKey
	): IQTransformer<unknown, unknown> | undefined {
		// 1. Check global registry first (allows overriding defaults)
		const customTransformer = QTransformerRegistry.get(key);
		if (customTransformer) {
			return customTransformer;
		}

		// 2. Check local defaults
		let lookupKey: string | undefined;

		if (typeof key === 'string') {
			let cached = this._strKeyCache.get(key);
			if (cached === undefined) {
				cached = key.toLowerCase();
				this._strKeyCache.set(key, cached);
			}
			lookupKey = cached;
		} else if (typeof key === 'function' && 'name' in key) {
			let cached = this._fnKeyCache.get(key);
			if (cached === undefined) {
				cached = (key as { name: string }).name.toLowerCase();
				this._fnKeyCache.set(key, cached);
			}
			lookupKey = cached;
		} else if (typeof key === 'object' && key !== null && 'name' in key) {
			let cached = this._fnKeyCache.get(key as object);
			if (cached === undefined) {
				cached = (key as { name: string }).name.toLowerCase();
				this._fnKeyCache.set(key as object, cached);
			}
			lookupKey = cached;
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
	 * @param options - Optional configuration: `modelClass` to resolve metadata, `ctx` for internal recursion tracking
	 * @returns Array of validation results for failed validations (empty if all valid)
	 *
	 * @remarks
	 * Only validates fields that have:
	 * 1. A `fieldType` metadata entry
	 * 2. A corresponding validator in the registry
	 *
	 * @see {@link IntegrityService.isValid} — boolean shortcut wrapping this method
	 * @see {@link IQIntegrityResult} — shape of each error entry returned
	 * @see {@link QModel.checkIntegrity} — public API that delegates here
	 *
	 * @example
	 * ```typescript
	 * const errors = service.checkIntegrity(user, { modelClass: UserModel });
	 * ```
	 */
	checkIntegrity(
		instance: Record<string, unknown>,
		options: IIntegrityOptions = {}
	): IQIntegrityResult[] {
		const { modelClass, ctx = { seen: new WeakSet(), depth: 0 } } = options;
		const { depth, seen } = ctx;
		// SECURITY: Prevent Stack Overflow via deep recursion
		const MAX_DEPTH = 200;
		if (depth > MAX_DEPTH) {
			return [
				{
					isValid: false,
					error: `Integrity error: Maximum recursion depth (${MAX_DEPTH}) exceeded.`,
				},
			];
		}

		if (typeof instance === 'object' && instance !== null) {
			if (seen.has(instance)) {
				return []; // Already validated this instance in this cycle
			}
			seen.add(instance);
		}

		const results: IQIntegrityResult[] = [];
		const configClass = modelClass || instance.constructor;
		const className = configClass.name;

		// --- per-class static metadata cache ---
		let classMeta = _INTEGRITY_CLASS_META.get(configClass);
		if (!classMeta) {
			const rawLocalOptions =
				(Reflect.getMetadata(QUICK_OPTIONS_KEY, configClass) as
					| Record<string, unknown>
					| undefined) ?? {};
			const proto: object =
				(configClass as { prototype?: object }).prototype ??
				configClass;
			const rawFields: string[] =
				Reflect.getMetadata(QTYPES_METADATA_KEY, proto) ??
				Reflect.getMetadata(QTYPES_METADATA_KEY, configClass) ??
				[];
			const fldTypes = new Map<string, unknown>();
			for (const fld of rawFields) {
				const ftype: unknown = Reflect.getMetadata(
					'fieldType',
					proto,
					fld
				);
				if (ftype !== undefined) fldTypes.set(fld, ftype);
			}
			classMeta = {
				localOptions: rawLocalOptions,
				decoratedFields: rawFields,
				fieldTypes: fldTypes,
			};
			_INTEGRITY_CLASS_META.set(configClass, classMeta);
		}
		const { localOptions, decoratedFields, fieldTypes } = classMeta;

		// --- merged runtime options (config-invalidation aware) ---
		const globalConfig = QConfig.get();
		let mergedOpts = _INTEGRITY_MERGED_OPTS.get(configClass);
		if (!mergedOpts || mergedOpts.configRef !== globalConfig) {
			const globalDefaults = (globalConfig.defaults ?? {}) as Record<
				string,
				unknown
			>;
			const strategy =
				(localOptions.integrityErrorStrategy as string | undefined) ??
				(globalDefaults.integrityErrorStrategy as string | undefined) ??
				'accumulate';
			mergedOpts = {
				configRef: globalConfig,
				failFast: strategy === 'failFast',
			};
			_INTEGRITY_MERGED_OPTS.set(configClass, mergedOpts);
		}
		const failFast = mergedOpts.failFast;

		for (const key of decoratedFields) {
			// Ignore internal props just in case
			if (key.startsWith('__')) continue;

			// Get current value (accessing via getter if applicable)
			const value = instance[key];

			// Get fieldType from cache (populated at class-build time)
			const fieldType = fieldTypes.get(key);

			if (fieldType) {
				const transformer = this.getTransformer(
					fieldType as IQTransformerKey
				);

				// Check if transformer implements IQIntegrityChecker (has checkIntegrity method)
				if (
					transformer &&
					'checkIntegrity' in transformer &&
					typeof (transformer as unknown as IQIntegrityChecker)
						.checkIntegrity === 'function'
				) {
					const checker =
						transformer as unknown as IQIntegrityChecker;
					const context = {
						propertyKey: key,
						className: className,
					};

					try {
						const result = checker.checkIntegrity(value, context);
						TraceLogger.traceIntegrity({
							modelName: className,
							modelCtor: instance.constructor,
							field: key,
							isValid: result.isValid,
							errorMsg: result.error,
						});
						if (!result.isValid) {
							results.push(result);
							if (failFast) return results;
						}
					} catch (error) {
						// Catch errors during integrity check to prevent crash
						const errMsg = `Integrity error for ${className}.${key}: ${error instanceof Error ? error.message : String(error)}`;
						TraceLogger.traceIntegrity({
							modelName: className,
							modelCtor: instance.constructor,
							field: key,
							isValid: false,
							errorMsg: errMsg,
						});
						results.push({
							isValid: false,
							error: errMsg,
						});
						if (failFast) return results;
					}
				}
			}

			// RECURSIVE INTEGRITY CHECK for Nested Models
			// Checks if the value itself is checkable (has a checkIntegrity method)
			if (value) {
				// 1. Single Nested Model
				if (
					typeof value === 'object' &&
					'checkIntegrity' in value &&
					typeof (value as any).checkIntegrity === 'function'
				) {
					try {
						// Pass 'seen' set to recursive call
						// to preserve cycle detection context.
						const nestedErrors = this.checkIntegrity(
							value as Record<string, unknown>,
							{ ctx: { seen, depth: depth + 1 } }
						);
						if (Array.isArray(nestedErrors)) {
							for (const err of nestedErrors) {
								results.push({
									isValid: false,
									error: `${key}.${err.error ? err.error.replace(/^\w+\./, '') : 'Invalid'}`,
								});
								if (failFast) return results;
							}
						}
					} catch (err) {
						// Ignore errors in child to prevent crash
						console.error('Caught integrity error:', err);
					}
				}

				// 2. Array of Nested Models
				if (Array.isArray(value)) {
					value.forEach((item, index) => {
						if (
							item &&
							typeof item === 'object' &&
							// We can check if it's potentially a model
							(Reflect.hasMetadata(QTYPES_METADATA_KEY, item) ||
								Reflect.hasMetadata(
									QTYPES_METADATA_KEY,
									Object.getPrototypeOf(item)
								))
						) {
							try {
								const nestedErrors = this.checkIntegrity(
									item as Record<string, unknown>,
									{ ctx: { seen, depth: depth + 1 } }
								);
								if (Array.isArray(nestedErrors)) {
									for (const err of nestedErrors) {
										results.push({
											isValid: false,
											error: `${key}[${index}].${err.error ? err.error.replace(/^\w+\./, '') : 'Invalid'}`,
										});
									}
								}
							} catch (_) {
								// Ignore
							}
						}
					});
				}
			}
		}

		return results;
	}

	/**
	 * Checks if a model instance passes all integrity checks.
	 *
	 * @param instance - The model instance to check
	 * @param modelClass - The model class constructor
	 * @returns True if all integrity checks pass, false if any fail
	 * @see {@link IntegrityService.checkIntegrity} — full error-detail variant
	 * @see {@link QModel.hasIntegrity} — public API that delegates here
	 */
	isValid(instance: Record<string, unknown>, modelClass?: Function): boolean {
		return this.checkIntegrity(instance, { modelClass }).length === 0;
	}
}
