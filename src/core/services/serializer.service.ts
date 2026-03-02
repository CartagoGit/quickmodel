// @quickmodel-rule-ignore: no-as-unknown — serializer uses `this`-as-record for
// dynamic key access and returns a sentinel value typed as TInterface to abort
// circular-reference cycles; both patterns are structurally unavoidable.
/**
 * Service for serializing model instances to JSON-compatible format.
 *
 * **IMPORTANT:** This service ONLY handles JSON serialization. For preserving original
 * input formats, see `ToInterfaceService`.
 *
 * **Key differences:**
 * - `serializer.serialize()` → Converts to JSON-compatible (Date → ISO string, BigInt → string, etc.)
 * - `toInterfaceService.toInterface()` → Preserves ORIGINAL input format from constructor
 *
 * Converts QuickModel instances and their fields into plain objects suitable
 * for JSON serialization, using registered transformers for type conversions.
 *
 * @template TModel - The model type (extends Record)
 * @template TInterface - The IQSerialized interface type
 *
 * @remarks
 * **SOLID principles:**
 * - **Single Responsibility**: Only handles JSON serialization (no format preservation)
 * - **Open/Closed**: Extensible via transformer registry
 * - **Dependency Inversion**: Depends on IQTransformer abstraction
 *
 * **Serialization process:**
 * 1. Iterates through all model properties
 * 2. Looks up transformers for special types (Date → ISO string, URL → string, Map → object, etc.)
 * 3. Falls back to default serialization if no transformer found
 * 4. Handles nested models recursively via `serialize()` method
 *
 * **Output format (JSON-compatible):**
 * - `Date` → ISO 8601 string `"2024-01-01T00:00:00.000Z"`
 * - `BigInt` → string `"999999999999999"`
 * - `RegExp` → object `{ source: "^test$", flags: "gi" }`
 * - `Symbol` → string (via Symbol.keyFor)
 * - `URL` → string href
 * - `Map` → object `{ key1: value1, key2: value2 }`
 * - `Set` → array `[value1, value2, value3]`
 * - `Error` → object `{ message, stack, name }`
 * - TypedArrays → number/string arrays
 * - Nested models → recursively IQSerialized
 *
 * @example
 * **Basic serialization**
 * ```typescript
 * const serializer = new Serializer();
 *
 * @Quick({
 *   name: 'string',
 *   birthDate: Date,
 *   tags: Set
 * })
 * class User extends QuickModel<IUser> {
 *   declare name: string;
 *   declare birthDate: Date;
 *   declare tags: Set<string>;
 * }
 *
 * const user = new User({
 *   name: "John",
 *   birthDate: new Date("2000-01-01"),
 *   tags: new Set(["admin", "user"])
 * });
 *
 * const json = serializer.serialize(user);
 * // { name: "John", birthDate: "2000-01-01T00:00:00.000Z", tags: ["admin", "user"] }
 *
 * const jsonString = serializer.serializeToJson(user);
 * // '{"name":"John","birthDate":"2000-01-01T00:00:00.000Z","tags":["admin","user"]}'
 * ```
 *
 * @example
 * **Complex types serialization**
 * ```typescript
 * const account = new Account({
 *   balance: 999999999999999n,    // BigInt
 *   pattern: /^test$/gi,           // RegExp
 *   metadata: new Map([['key', 'value']])  // Map
 * });
 *
 * account.serialize();
 * // {
 * //   balance: "999999999999999",
 * //   pattern: { source: "^test$", flags: "gi" },
 * //   metadata: { key: "value" }
 * // }
 * ```
 *
 * @see {@link IQSerializer} — interface contract implemented by this service
 * @see {@link QModel.$qSerialize} — public-facing API that delegates to this service
 * @see {@link QTransformerRegistry} — registry of custom transformers
 */

import { CaseHelper } from '@/core/helpers/case.helper';
import {
	IQSerializer,
	IQSerializationOptions,
} from '../interfaces/serializer.interface';
import { BigIntTransformer } from '@/transformers/bigint.transformer';
import { DateTransformer } from '@/transformers/date.transformer';
import { ErrorTransformer } from '@/transformers/error.transformer';
import { RegExpTransformer } from '@/transformers/regexp.transformer';
import { SymbolTransformer } from '@/transformers/symbol.transformer';
import { TypedArrayTransformer } from '@/transformers/typed-array.transformer';
import {
	URLTransformer,
	URLSearchParamsTransformer,
	BlobTransformer,
	FileTransformer,
} from '@/transformers/web-apis.transformer';
import {
	MapTransformer,
	SetTransformer,
} from '@/transformers/map-set.transformer';
import {
	WeakMapTransformer,
	WeakSetTransformer,
} from '@/transformers/weak-collections.transformer';
import { IQTransformer } from '../interfaces/transformer.interface';
import { QTransformerRegistry } from '../registry/transformer.registry';
import 'reflect-metadata';
import {
	QUICK_TYPE_MAP_KEY,
	QUICK_OPTIONS_KEY,
	QUICK_DECORATOR_KEY,
	QUICK_VALUES_KEY,
	QCOMPUTED_METADATA_KEY,
} from '../constants/metadata-keys';
import { QTYPES_METADATA_KEY } from '../decorators/qtype.decorator';
import { QConfig } from '../config/quick.config';
import { TraceLogger } from '../helpers/trace-logger.helper';
import { IQAdvancedOptions } from '../interfaces/quick-options.interface';
import { QM_SPECIAL_TOKEN_KEY } from '@/transformers/special-float.transformer';
import type { IFileModeOutput } from '@/core/helpers/form-data.helpers';

// ---------------------------------------------------------------------------
// Module-level per-constructor cache for serialize() hot path
// Safe because decorator metadata is immutable after class definition
// ---------------------------------------------------------------------------
/**
 * @internal Per-class static serialization metadata cached after first `serialize()` call.
 * Contains resolved model options, type map, excluded fields, and getter keys.
 * @see {@link Serializer.serialize} — method that builds and reads this cache
 * @see {@link IQSerializationOptions} — user-facing options this cache is derived from
 */
interface IQSerializeClassMeta {
	modelOptions: IQAdvancedOptions | undefined;
	typeMap: Record<string, unknown> | null | undefined;
	excludeFields: string[];
	/** Getter keys from prototype chain that should be included (qtype:generated + QComputed) */
	getterKeys: string[];
	/** Per-field fileMode from @QType({ fileMode }) decorators — null when none defined */
	fieldFileModes: Record<string, IFileModeOutput> | null;
}

const _SERIALIZE_CLASS_META = new WeakMap<Function, IQSerializeClassMeta>();

// ---------------------------------------------------------------------------
// QModel constructor detection cache — Reflect.hasMetadata is called in
// serializeValue() per object-type field. Caching per constructor eliminates
// the reflection cost on repeated serializations of the same model types.
// ---------------------------------------------------------------------------
const _IS_QMODEL_CTOR = new WeakMap<Function, boolean>();

/** @internal Returns `true` when `ctor` is a decorated QModel class; result is cached per constructor. */
function _isQModelCtor(ctor: Function): boolean {
	let cached = _IS_QMODEL_CTOR.get(ctor);
	if (cached === undefined) {
		cached =
			Reflect.hasMetadata(QUICK_DECORATOR_KEY, ctor) ||
			Reflect.hasMetadata(QUICK_TYPE_MAP_KEY, ctor);
		_IS_QMODEL_CTOR.set(ctor, cached);
	}
	return cached;
}

// ---------------------------------------------------------------------------
// Merged serialization options (QConfig-aware) — cached per constructor,
// invalidated when QConfig reference changes. Only used on the base call
// (no explicit options). Avoids QConfig.get() + object spread every call.
// ---------------------------------------------------------------------------
/**
 * @internal Cached merged serialization options per constructor, QConfig-aware.
 * Invalidated when the QConfig reference changes. Avoids repeated `QConfig.get()` + spread on every call.
 * @see {@link Serializer.serialize} — method that reads and invalidates this cache
 * @see {@link IQSerializationOptions} — the merged options type stored in this cache
 */
interface IQSerializeMergedOpts {
	configRef: unknown;
	/**
	 * Pre-resolved options to use when serialize() is called without user options.
	 * `undefined` means all defaults apply (no object needed at all).
	 */
	baseOptions: IQSerializationOptions | undefined;
}
const _SERIALIZE_MERGED_OPTS = new WeakMap<Function, IQSerializeMergedOpts>();

// ---------------------------------------------------------------------------
// Depth-only options cache for serializeValue() Map/Set/Array inner-element
// paths. When options === undefined (common case), avoids `{ ...options, _depth: N }`
// object allocation per element. Objects are frozen to prevent accidental mutation.
// ---------------------------------------------------------------------------
const _DEPTH_ONLY_OPTS: ReadonlyArray<
	Readonly<IQSerializationOptions & { _depth: number }>
> = Array.from({ length: 32 }, (_, idx) => Object.freeze({ _depth: idx }));

/**
 * @internal Returns child options for container-element recursion in serializeValue().
 * When options is undefined, returns a pre-allocated frozen depth-only object.
 * When options is provided, creates a new merged object (slow path, rare).
 * @see {@link Serializer.serialize} — top-level entry point calling this recursively
 * @see {@link IQSerializationOptions} — the options type this helper extends with depth
 */
function _nextDepthOpts(
	options: IQSerializationOptions | undefined,
	depth: number
): IQSerializationOptions {
	if (options === undefined) {
		return _DEPTH_ONLY_OPTS[depth + 1] ?? { _depth: depth + 1 };
	}
	return { ...options, _depth: depth + 1 };
}

/** @internal Builds and caches per-class serialization metadata (options, type map, excluded fields, getter keys). */
function _getSerializeClassMeta(ctor: Function): IQSerializeClassMeta {
	let meta = _SERIALIZE_CLASS_META.get(ctor);
	if (!meta) {
		const modelOptions = Reflect.getMetadata(QUICK_OPTIONS_KEY, ctor) as
			| IQAdvancedOptions
			| undefined;
		const typeMap = (Reflect.getMetadata(QUICK_TYPE_MAP_KEY, ctor) ??
			null) as Record<string, unknown> | null;
		const excludeFields: string[] = modelOptions?.excludeFields ?? [];

		// Walk prototype chain once to collect getter keys
		const getterKeys: string[] = [];
		let proto = (ctor as { prototype: object }).prototype as object | null;
		while (proto && proto !== Object.prototype) {
			for (const key of Object.getOwnPropertyNames(proto)) {
				if (key === 'constructor') continue;
				const descriptor = Object.getOwnPropertyDescriptor(proto, key);
				if (descriptor?.get) {
					if (
						Reflect.hasMetadata('qtype:generated', proto, key) ||
						Reflect.hasMetadata(QCOMPUTED_METADATA_KEY, proto, key)
					) {
						getterKeys.push(key);
					}
				}
			}
			proto = Object.getPrototypeOf(proto) as object | null;
		}

		// Collect per-field fileMode from @QType({ fileMode }) decorators
		let fieldFileModes: Record<string, IFileModeOutput> | null = null;
		const classproto = (ctor as { prototype: object }).prototype;
		const qtypeFields = Reflect.getMetadata(
			QTYPES_METADATA_KEY,
			classproto
		) as Array<string | symbol> | undefined;
		if (qtypeFields?.length) {
			for (const fieldKey of qtypeFields) {
				const fieldFileMode = Reflect.getMetadata(
					'qtype:fileMode',
					classproto,
					fieldKey
				) as IFileModeOutput | undefined;
				if (fieldFileMode) {
					if (fieldFileModes === null) fieldFileModes = {};
					fieldFileModes[String(fieldKey)] = fieldFileMode;
				}
			}
		}

		meta = {
			modelOptions,
			typeMap,
			excludeFields,
			getterKeys,
			fieldFileModes,
		};
		_SERIALIZE_CLASS_META.set(ctor, meta);
	}
	return meta;
}

/**
 * Serializer: converts a `QModel` instance to a JSON-compatible plain object.
 *
 * See the module-level documentation at the top of this file for full details,
 * type-conversion table, and usage examples.
 *
 * @template TModel - Model instance type.
 * @template TInterface - Target plain-object type.
 * @see {@link IQSerializer} — interface contract this class fulfils
 * @see {@link QModel.$qSerialize} — public entry-point that delegates here
 * @see {@link QTransformerRegistry} — registry queried for custom transformers
 * @see {@link ToInterfaceService} — sister service for preserving original input types
 */
export class Serializer<
	TModel extends Record<string, unknown> = Record<string, unknown>,
	TInterface extends Record<string, unknown> = Record<string, unknown>,
> implements IQSerializer<TModel, TInterface> {
	/** @internal Map of transformer key (string or constructor) → `IQTransformer` instances used during value serialization. */
	private readonly transformers: Map<
		string | Function,
		IQTransformer<unknown, unknown>
	>;

	/**
	 * Creates a model serializer.
	 */
	constructor() {
		// Initialize transformers
		this.transformers = new Map();

		const dateTransformer = new DateTransformer();
		const bigintTransformer = new BigIntTransformer();
		const symbolTransformer = new SymbolTransformer();
		const regexpTransformer = new RegExpTransformer();
		const errorTransformer = new ErrorTransformer();
		const urlTransformer = new URLTransformer();
		const urlSearchParamsTransformer = new URLSearchParamsTransformer();
		const mapTransformer = new MapTransformer();
		const setTransformer = new SetTransformer();
		const weakMapTransformer = new WeakMapTransformer();
		const weakSetTransformer = new WeakSetTransformer();

		// Register by name and constructor
		this.transformers.set('date', dateTransformer);
		this.transformers.set(Date, dateTransformer);
		this.transformers.set('bigint', bigintTransformer);
		this.transformers.set('symbol', symbolTransformer);
		this.transformers.set('regexp', regexpTransformer);
		this.transformers.set(RegExp, regexpTransformer);
		this.transformers.set('error', errorTransformer);
		this.transformers.set(Error, errorTransformer);
		this.transformers.set(URL, urlTransformer);
		this.transformers.set(URLSearchParams, urlSearchParamsTransformer);
		this.transformers.set('map', mapTransformer);
		this.transformers.set(Map, mapTransformer);
		this.transformers.set('set', setTransformer);
		this.transformers.set(Set, setTransformer);
		this.transformers.set('weakmap', weakMapTransformer);
		this.transformers.set(WeakMap, weakMapTransformer);
		this.transformers.set('weakset', weakSetTransformer);
		this.transformers.set(WeakSet, weakSetTransformer);

		// Register Blob and File transformers
		const blobTransformer = new BlobTransformer();
		const fileTransformer = new FileTransformer();
		this.transformers.set('blob', blobTransformer);
		this.transformers.set(Blob, blobTransformer);
		this.transformers.set('file', fileTransformer);
		this.transformers.set(File, fileTransformer);

		// Register typed arrays
		this.transformers.set(
			Int8Array,
			new TypedArrayTransformer<Int8Array>(Int8Array)
		);
		this.transformers.set(
			Uint8Array,
			new TypedArrayTransformer<Uint8Array>(Uint8Array)
		);
		this.transformers.set(
			Int16Array,
			new TypedArrayTransformer<Int16Array>(Int16Array)
		);
		this.transformers.set(
			Uint16Array,
			new TypedArrayTransformer<Uint16Array>(Uint16Array)
		);
		this.transformers.set(
			Int32Array,
			new TypedArrayTransformer<Int32Array>(Int32Array)
		);
		this.transformers.set(
			Uint32Array,
			new TypedArrayTransformer<Uint32Array>(Uint32Array)
		);
		this.transformers.set(
			Float32Array,
			new TypedArrayTransformer<Float32Array>(Float32Array)
		);
		this.transformers.set(
			Float64Array,
			new TypedArrayTransformer<Float64Array>(Float64Array)
		);
		this.transformers.set(
			BigInt64Array,
			new TypedArrayTransformer<BigInt64Array>(BigInt64Array, true)
		);
		this.transformers.set(
			BigUint64Array,
			new TypedArrayTransformer<BigUint64Array>(BigUint64Array, true)
		);
	}

	/**
	 * Serializes a model instance to plain object using transformers.
	 *
	 * @param model - The model instance to serialize
	 * @param seen - Optional WeakSet to track circular references
	 * @param options - Optional serialization options
	 * @returns Plain object suitable for JSON serialization with transformers applied
	 * @throws {Error} If the serialization recursion depth exceeds 512 (circular-structure guard).
	 *
	 * @remarks
	 * Uses transformers to convert special types (BigInt, Date, RegExp, etc.) to JSON-compatible format.
	 *
	 * @see {@link IQSerializer.serialize} — interface definition
	 * @see {@link Serializer.serializeToJson} — JSON-string variant
	 * @see {@link IQSerializationOptions} — available serialization options
	 */
	serialize(
		model: TModel,
		seen?: WeakSet<object>,
		options?: IQSerializationOptions
	): TInterface {
		// Emit serialize trace on top-level call (seen is undefined only at depth 0)
		if (
			seen === undefined &&
			TraceLogger.isEnabled('info', model.constructor)
		) {
			TraceLogger.traceSerialize(
				model.constructor.name,
				model.constructor
			);
		}

		// Per-constructor cache: eliminates Reflect.getMetadata + proto chain walk per call
		const {
			modelOptions,
			typeMap,
			excludeFields: modelExcludeFields,
			getterKeys,
			fieldFileModes,
		} = _getSerializeClassMeta(model.constructor);

		// Resolve Configuration (DateStrategy, Case, etc.)
		let activeOptions = options;

		if (!options) {
			// Fast path: no user options — use per-class cached base options.
			// Avoids QConfig.get() + object allocation on every serialize() call.
			const globalConfig = QConfig.get();
			let merged = _SERIALIZE_MERGED_OPTS.get(model.constructor);
			if (!merged || merged.configRef !== globalConfig) {
				const gDef = globalConfig.defaults;
				const dateStrategy =
					modelOptions?.dateStrategy ?? gDef?.dateStrategy ?? 'iso';
				const transformCase =
					modelOptions?.transformCase ?? gDef?.transformCase;
				const exposeUnsetFields =
					modelOptions?.exposeUnsetFields ?? gDef?.exposeUnsetFields;
				let baseOpts: IQSerializationOptions | undefined;
				if (
					dateStrategy !== 'iso' ||
					transformCase ||
					exposeUnsetFields !== undefined
				) {
					baseOpts = {} as IQSerializationOptions;
					if (dateStrategy !== 'iso')
						baseOpts.dateStrategy = dateStrategy;
					if (transformCase) baseOpts.transformCase = transformCase;
					if (exposeUnsetFields !== undefined)
						baseOpts.exposeUnsetFields = exposeUnsetFields;
				}
				merged = { configRef: globalConfig, baseOptions: baseOpts };
				_SERIALIZE_MERGED_OPTS.set(model.constructor, merged);
			}
			activeOptions = merged.baseOptions;
		} else if (!options.dateStrategy || !options.transformCase) {
			// Partial options: merge with model defaults + global config.
			const globalDefaults = QConfig.get().defaults;
			const dateStrategy =
				modelOptions?.dateStrategy ??
				globalDefaults?.dateStrategy ??
				'iso';
			const transformCase =
				modelOptions?.transformCase ?? globalDefaults?.transformCase;
			const exposeUnsetFields =
				modelOptions?.exposeUnsetFields ??
				globalDefaults?.exposeUnsetFields;
			const newOptions: IQSerializationOptions = { ...options };
			if (!options.dateStrategy && dateStrategy !== 'iso')
				newOptions.dateStrategy = dateStrategy;
			if (!options.transformCase && transformCase)
				newOptions.transformCase = transformCase;
			if (!options.exposeUnsetFields && exposeUnsetFields !== undefined)
				newOptions.exposeUnsetFields = exposeUnsetFields;
			activeOptions = newOptions;
		}

		const depth = activeOptions?._depth || 0;
		// SECURITY: Prevent Stack Overflow
		const MAX_DEPTH = 512;
		if (depth > MAX_DEPTH) {
			throw new Error(
				`QuickModel Security: Maximum recursion depth (${MAX_DEPTH}) exceeded during serialization.`
			);
		}

		const result: Record<string, unknown> = {};

		// OPT#SER-B: lazy WeakSet — skip allocation for flat models (no object-type fields).
		// When `seen` is provided, reuse it directly (no alloc). When null, the WeakSet is
		// materialized on first object-type field encountered in the loop below.
		let _visited: WeakSet<object> | null = seen ?? null;
		if (_visited !== null) {
			// Fast-path: caller already provided a WeakSet for cycle tracking
			if (_visited.has(model as object)) {
				// Circular reference detected
				// We return a special marker that is JSON compatible but informative
				return { __circular: true } as unknown as TInterface;
			}
			_visited.add(model as object);
		}

		// Get all property keys
		const keys = new Set<string>();
		for (const key of Object.keys(model as object)) {
			keys.add(key);
		}

		// Also collect keys from the internal backup storage (QUICK_VALUES_KEY).
		// This ensures fields from ancestor classes that did not receive their own
		// enumerable property slot during construction are always serialized.
		const quickValues = (model as Record<string, unknown>)[
			QUICK_VALUES_KEY
		];
		if (quickValues && typeof quickValues === 'object') {
			for (const key of Object.keys(quickValues)) {
				keys.add(key);
			}
		}

		// Add getter keys pre-computed from prototype chain (cached per constructor)
		for (const key of getterKeys) {
			keys.add(key);
		}

		// OPT#SER-A: pre-compute child depth options once — reuse for every field.
		// Avoids creating a new `{ ...activeOptions, _depth: depth+1 }` object per field
		// in the hot loop below (N allocs → 1 alloc per serialize() call).
		const _childOpts = _nextDepthOpts(activeOptions, depth);

		// Serialize with transformers
		for (const key of keys) {
			// SECURITY: Prevent Prototype Pollution
			if (
				key === '__proto__' ||
				key === 'constructor' ||
				key === 'prototype'
			) {
				continue;
			}

			if (key.startsWith('__')) {
				if (!activeOptions?.includeDoubleUnderscore) continue;
			} else if (key.startsWith('_')) {
				if (!activeOptions?.includeUnderscore) continue;
			}

			// excludeFields: permanently excluded by @Quick() decorator (e.g. WeakMap, passwords)
			if (
				modelExcludeFields.length > 0 &&
				modelExcludeFields.includes(key)
			) {
				continue;
			}

			const value = (model as unknown as Record<string, unknown>)[key];

			// Exclude undefined values unless explicitly exposed
			if (value === undefined && !activeOptions?.exposeUnsetFields) {
				continue;
			}

			// Calculate Output Key (Case Transformation)
			let outputKey = key;
			if (activeOptions?.transformCase?.out) {
				outputKey = CaseHelper.toCase(
					activeOptions.transformCase.out,
					key
				);
			}

			// Custom Transformer Object check (Bidirectional transformers in TypeMap)
			if (typeMap && typeMap[key]) {
				const mapValue = typeMap[key];

				if (
					typeof mapValue === 'object' &&
					mapValue !== null &&
					!Array.isArray(mapValue) &&
					'serialize' in mapValue
				) {
					// Use custom transformer serializer
					// Pass context so transformers can access global config (like dateStrategy)
					const context = {
						propertyKey: key,
						className: model.constructor.name,
						metadata: activeOptions as Record<string, unknown>,
					};
					result[outputKey] = (mapValue as IQTransformer).serialize(
						value,
						context
					);
					continue;
				}

				// String alias in typeMap (e.g. 'blob', 'file', 'date')
				// Look up the matching transformer by alias name so it is
				// applied even when the runtime value is not detected by the
				// instanceof checks in serializeValue().
				if (typeof mapValue === 'string') {
					const aliasTransformer = this.transformers.get(
						mapValue.toLowerCase()
					);
					if (
						aliasTransformer &&
						value !== null &&
						value !== undefined
					) {
						result[outputKey] = aliasTransformer.serialize(value);
						continue;
					}
				}
			}

			// OPT#SER-B: materialize the WeakSet only when we actually have an object value
			// that needs cycle tracking. Flat models (all primitives) skip the alloc entirely.
			if (
				_visited === null &&
				typeof value === 'object' &&
				value !== null
			) {
				_visited = new WeakSet<object>();
				_visited.add(model as object);
			}
			// Per-field fileMode: @QType({ fileMode }) acts as field-level default;
			// a global call option (activeOptions?.fileMode) always takes precedence.
			const decoratorFileMode = fieldFileModes?.[key];
			const fieldOpts =
				decoratorFileMode && !activeOptions?.fileMode
					? { ..._childOpts, fileMode: decoratorFileMode }
					: _childOpts;
			result[outputKey] = this.serializeValue(
				value,
				_visited ?? undefined,
				fieldOpts
			);
		}

		return result as TInterface;
	}

	/**
	 * Serializes a model instance to JSON string.
	 *
	 * @param model - The model instance to serialize
	 * @returns JSON string representation
	 * @see {@link Serializer.serialize} — plain-object variant
	 * @see {@link IQSerializationOptions} — available serialization options
	 * @see {@link QModel.toJSON} — public-facing API that delegates here
	 */
	serializeToJson(model: TModel, options?: IQSerializationOptions): string {
		return JSON.stringify(this.serialize(model, undefined, options));
	}

	/**
	 * Serializes a single value based on its type.
	 *
	 * @param value - The value to serialize
	 * @param seen - WeakSet to track circular references
	 * @param options - Serialization options for nested structures
	 * @returns IQSerialized value suitable for JSON
	 *
	 * @remarks
	 * Handles special types in priority order:
	 * 1. Date → ISO string
	 * 2. URL → href string
	 * 3. URLSearchParams → query string
	 * 4. BigInt → string
	 * 5. Symbol → string (via Symbol.keyFor)
	 * 6. RegExp → object with source/flags
	 * 7. Error → object with message/stack/name
	 * 8. TypedArrays → number/string arrays
	 * 9. ArrayBuffer/DataView → byte arrays
	 * 10. Nested models → recursive serialization
	 * 11. Arrays → element-wise serialization
	 * 12. Map → object
	 * 13. Set → array
	 * 14. Primitives → as-is
	 */
	private serializeValue(
		value: unknown,
		seen?: WeakSet<object>,
		options?: IQSerializationOptions
	): unknown {
		// OPT#VAL-A: Short-circuit for primitive types — the common case for flat models.
		// Primitives never recurse, so they can safely skip the depth guard and all
		// instanceof checks. This saves 20+ comparisons per field in the hot path.
		// NOTE: NaN and ±Infinity are NOT finite, so they fall through to the special-float
		// handler at the bottom. null/undefined are returned as-is.
		if (value === null || value === undefined) return value;
		const _vType = typeof value;
		if (_vType === 'string' || _vType === 'boolean') return value;
		if (_vType === 'number' && isFinite(value as number)) return value;
		// bigint, symbol, and object types fall through to the full dispatch below

		const depth = options?._depth || 0;
		// SECURITY: Prevent Stack Overflow
		const MAX_DEPTH = 512;
		if (depth > MAX_DEPTH) {
			throw new Error(
				`QuickModel Security: Maximum recursion depth (${MAX_DEPTH}) exceeded during value serialization.`
			);
		}

		// WeakMap and WeakSet - ALWAYS throw error (not serializable)
		if (value instanceof WeakMap) {
			const transformer = this.transformers.get(WeakMap);
			if (transformer) {
				return transformer.serialize(value); // Will throw error
			}
			throw new Error(
				'WeakMap cannot be serialized to JSON (keys are not iterable/enumerable).'
			);
		}

		if (value instanceof WeakSet) {
			const transformer = this.transformers.get(WeakSet);
			if (transformer) {
				return transformer.serialize(value); // Will throw error
			}
			throw new Error(
				'WeakSet cannot be serialized to JSON (values are not iterable/enumerable).'
			);
		}

		// Containers (Set, Map, Array) - Handle FIRST to support recursion & cycles
		if (value instanceof Map) {
			const visited = seen || new WeakSet<object>();
			if (visited.has(value)) {
				return { __circular: true };
			}
			visited.add(value);

			// OPT#MAP-A: Check if Map has Symbol keys using a direct for-of loop.
			// Avoids Array.from() allocation — short-circuits on first Symbol key found.
			let hasSymbolKeys = false;
			for (const _mapKey of value.keys()) {
				if (typeof _mapKey === 'symbol') {
					hasSymbolKeys = true;
					break;
				}
			}

			// If has Symbol keys, serialize as array of tuples to preserve Symbol info
			if (hasSymbolKeys) {
				const entries: [string, unknown][] = [];
				for (const [key, val] of value) {
					// Convert Symbol to string (Symbol.keyFor or description)
					const keyStr =
						typeof key === 'symbol'
							? (Symbol.keyFor(key) ??
								key.description ??
								String(key))
							: String(key);

					// SECURITY: Prevent Prototype Poisoning
					if (
						keyStr === '__proto__' ||
						keyStr === 'constructor' ||
						keyStr === 'prototype'
					) {
						continue;
					}

					// Recursive call ensures values (like BigInt, Date) are IQSerialized
					const serializedValue = this.serializeValue(
						val,
						visited,
						_nextDepthOpts(options, depth)
					);

					entries.push([keyStr, serializedValue]);
				}
				return entries;
			}

			// Standard Map serialization (object format)
			const result: Record<string, unknown> = {};
			for (const [key, val] of value) {
				const keyStr = String(key);
				// SECURITY: Prevent Prototype Poisoning
				if (
					keyStr === '__proto__' ||
					keyStr === 'constructor' ||
					keyStr === 'prototype'
				) {
					continue;
				}

				// Recursive call ensures values (like BigInt) are IQSerialized
				result[keyStr] = this.serializeValue(
					val,
					visited,
					_nextDepthOpts(options, depth)
				);
			}
			return result;
		}

		if (value instanceof Set) {
			const visited = seen || new WeakSet<object>();
			if (visited.has(value)) {
				return { __circular: true };
			}
			visited.add(value);

			// Recursive call ensures values (like Date) are IQSerialized
			return Array.from(value).map((item) =>
				this.serializeValue(
					item,
					visited,
					_nextDepthOpts(options, depth)
				)
			);
		}

		if (Array.isArray(value)) {
			const visited = seen || new WeakSet<object>();
			if (visited.has(value)) {
				return { __circular: true };
			}
			visited.add(value);

			return value.map((item) =>
				this.serializeValue(
					item,
					visited,
					_nextDepthOpts(options, depth)
				)
			);
		}

		// Custom Transformers (Registry)
		if (
			value !== null &&
			value !== undefined &&
			typeof value === 'object'
		) {
			// Try to find transformer by constructor
			const ctor = (value as Record<string, unknown>).constructor;
			if (ctor && QTransformerRegistry.has(ctor)) {
				const transformer = QTransformerRegistry.get(ctor);
				if (transformer) {
					return transformer.serialize(value);
				}
			}
		}

		// Date
		if (value instanceof Date) {
			const transformer =
				this.transformers.get('date') || this.transformers.get(Date);

			const context = {
				propertyKey: '',
				className: '',
				metadata: {
					dateStrategy: options?.dateStrategy,
				},
			};

			return transformer
				? transformer.serialize(value, context)
				: value.toISOString();
		}

		// URL
		if (value instanceof URL) {
			const transformer =
				this.transformers.get(URL) ||
				this.transformers.get(Symbol('URL').toString());
			return transformer ? transformer.serialize(value) : value.href;
		}

		// URLSearchParams
		if (value instanceof URLSearchParams) {
			const transformer =
				this.transformers.get(URLSearchParams) ||
				this.transformers.get(Symbol('URLSearchParams').toString());
			return transformer
				? transformer.serialize(value)
				: value.toString();
		}

		// File — must be checked before Blob (File extends Blob)
		if (value instanceof File) {
			if (options?.fileMode === 'reference') return value.name;
			const transformer = this.transformers.get(File);
			return transformer
				? transformer.serialize(value)
				: {
						name: value.name,
						size: value.size,
						type: value.type,
						lastModified: value.lastModified,
					};
		}

		// Blob
		if (value instanceof Blob) {
			if (options?.fileMode === 'reference') return '[Blob]';
			const transformer = this.transformers.get(Blob);
			return transformer
				? transformer.serialize(value)
				: { size: value.size, type: value.type, _blobRef: true };
		}

		// BigInt
		if (typeof value === 'bigint') {
			const transformer = this.transformers.get('bigint');
			if (transformer) {
				return transformer.serialize(value);
			}
			return value.toString();
		}

		// Symbol
		if (typeof value === 'symbol') {
			const transformer = this.transformers.get('symbol');
			return transformer
				? transformer.serialize(value)
				: Symbol.keyFor(value) || value.toString();
		}

		// RegExp
		if (value instanceof RegExp) {
			const transformer =
				this.transformers.get(RegExp) ||
				this.transformers.get(Symbol('RegExp').toString());
			return transformer
				? transformer.serialize(value)
				: { source: value.source, flags: value.flags };
		}

		// Error
		if (value instanceof Error) {
			const transformer =
				this.transformers.get(Error) ||
				this.transformers.get(Symbol('Error').toString());
			return transformer
				? transformer.serialize(value)
				: {
						message: value.message,
						stack: value.stack,
						name: value.name,
					};
		}

		// TypedArrays
		if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
			if (options?.fileMode === 'reference') return '[binary]';
			// Determine which constructor to use to look up the transformer
			let transformer;
			if (value instanceof Int8Array)
				transformer = this.transformers.get(Int8Array);
			else if (value instanceof Uint8Array)
				transformer = this.transformers.get(Uint8Array);
			else if (value instanceof Int16Array)
				transformer = this.transformers.get(Int16Array);
			else if (value instanceof Uint16Array)
				transformer = this.transformers.get(Uint16Array);
			else if (value instanceof Int32Array)
				transformer = this.transformers.get(Int32Array);
			else if (value instanceof Uint32Array)
				transformer = this.transformers.get(Uint32Array);
			else if (value instanceof Float32Array)
				transformer = this.transformers.get(Float32Array);
			else if (value instanceof Float64Array)
				transformer = this.transformers.get(Float64Array);
			else if (value instanceof BigInt64Array)
				transformer = this.transformers.get(BigInt64Array);
			else if (value instanceof BigUint64Array)
				transformer = this.transformers.get(BigUint64Array);

			if (transformer) {
				return transformer.serialize(value);
			}

			// Fallback: convertir a array
			// Para BigInt64Array y BigUint64Array, convertir bigints a strings
			if (
				value instanceof BigInt64Array ||
				value instanceof BigUint64Array
			) {
				return Array.from(value, (val: bigint) => val.toString());
			}
			// TypedArrays tienen iterator pero TypeScript necesita type assertion
			if (value instanceof Int8Array) return Array.from(value);
			if (value instanceof Uint8Array) return Array.from(value);
			if (value instanceof Int16Array) return Array.from(value);
			if (value instanceof Uint16Array) return Array.from(value);
			if (value instanceof Int32Array) return Array.from(value);
			if (value instanceof Uint32Array) return Array.from(value);
			if (value instanceof Float32Array) return Array.from(value);
			if (value instanceof Float64Array) return Array.from(value);
			if (value instanceof Uint8ClampedArray) return Array.from(value);
			// Should never reach here
			return [];
		}

		// ArrayBuffer
		if (value instanceof ArrayBuffer) {
			if (options?.fileMode === 'reference') return '[binary]';
			const transformer =
				this.transformers.get(ArrayBuffer) ||
				this.transformers.get(Symbol('ArrayBuffer').toString());
			return transformer
				? transformer.serialize(value)
				: Array.from(new Uint8Array(value));
		}

		// DataView
		if (value instanceof DataView) {
			const transformer =
				this.transformers.get(DataView) ||
				this.transformers.get(Symbol('DataView').toString());
			return transformer
				? transformer.serialize(value)
				: Array.from(new Uint8Array(value.buffer));
		}

		// Nested model
		if (
			typeof value === 'object' &&
			value !== null &&
			('$qSerialize' in value || 'serialize' in value) &&
			typeof (value as { $qSerialize?: unknown }).$qSerialize ===
				'function'
		) {
			const visited = seen || new WeakSet<object>();

			// OPT#NEST-A: For QModels, build a minimal childOptions directly instead of
			// spreading all parent options and then deleting dateStrategy/transformCase
			// (spread alloc + 2 slow delete operations per nested model).
			// QModel autonomy is preserved: strip dateStrategy and transformCase so the
			// nested model resolves its own configured defaults.
			// Non-QModel custom serializables (rare path) still get full parent options.
			let childOptions: IQSerializationOptions;
			if (_isQModelCtor(value.constructor)) {
				childOptions = {
					_depth: depth + 1,
					includeUnderscore: options?.includeUnderscore,
					includeDoubleUnderscore: options?.includeDoubleUnderscore,
				};
			} else {
				// Custom serializable (e.g. hand-written serialize() method):
				// propagate all parent options, only increment depth.
				childOptions = {
					...options,
					_depth: depth + 1,
				};
			}

			return (
				value as {
					$qSerialize: (
						s?: WeakSet<object>,
						o?: IQSerializationOptions
					) => unknown;
				}
			).$qSerialize(visited, childOptions);
		}

		// Nested model (legacy: objects with only serialize(), not $qSerialize())
		if (
			typeof value === 'object' &&
			value !== null &&
			'serialize' in value &&
			!('$qSerialize' in value) &&
			typeof value.serialize === 'function'
		) {
			const visited = seen || new WeakSet<object>();

			let childOptions: IQSerializationOptions;
			if (_isQModelCtor(value.constructor)) {
				childOptions = {
					_depth: depth + 1,
					includeUnderscore: options?.includeUnderscore,
					includeDoubleUnderscore: options?.includeDoubleUnderscore,
				};
			} else {
				childOptions = {
					...options,
					_depth: depth + 1,
				};
			}

			return (
				value as {
					serialize: (
						s?: WeakSet<object>,
						o?: IQSerializationOptions
					) => unknown;
				}
			).serialize(visited, childOptions);
		}

		// Nested QuickModel (Deep Serialization)
		// Detects models by presence of metadata if they don't have explicit serialize method
		if (
			typeof value === 'object' &&
			value !== null &&
			value.constructor &&
			_isQModelCtor(value.constructor)
		) {
			const visited = seen || new WeakSet<object>();
			// Recursively serialize the nested model
			// Note: We strip 'dateStrategy' from options to allow the nested model
			// to fully resolve its own strategy defaults, unless explictly handled otherwise.
			// Ideally we should differentiate between "Force Global Strategy" and "Inherited Default".
			// For now, we favor Model Autonomy.
			const childOptions: IQSerializationOptions = {
				_depth: depth + 1,
				includeUnderscore: options?.includeUnderscore,
				includeDoubleUnderscore: options?.includeDoubleUnderscore,
			};

			return this.serialize(
				value as unknown as Parameters<typeof this.serialize>[0],
				visited,
				childOptions
			); // @quickmodel-rule-ignore: no-as-unknown — value is a QModel instance narrowed by _isQModelCtor; TypeScript can't resolve the generic TInterface at this dynamic call site
		}

		// Plain Object (recursive serialization)
		// This enables proper serialization of nested plain objects that might contain
		// complex types (e.g. from dot notation transforms like 'stats.points': BigInt)
		if (
			typeof value === 'object' &&
			value !== null &&
			(Object.getPrototypeOf(value) === Object.prototype ||
				Object.getPrototypeOf(value) === null)
		) {
			const visited = seen || new WeakSet<object>();
			if (visited.has(value)) {
				return { __circular: true };
			}
			visited.add(value);

			const result: Record<string, unknown> = {};
			for (const key of Object.keys(value)) {
				result[key] = this.serializeValue(
					(value as Record<string, unknown>)[key],
					visited,
					_nextDepthOpts(options, depth)
				);
			}
			return result;
		}

		// Special float values: NaN, Infinity, -Infinity → JSON-safe QM tokens
		// Ensures these values survive JSON.stringify → JSON.parse losslessly
		if (typeof value === 'number') {
			if (Number.isNaN(value)) return { [QM_SPECIAL_TOKEN_KEY]: 'nan' };
			if (value === Infinity) return { [QM_SPECIAL_TOKEN_KEY]: 'inf' };
			if (value === -Infinity) return { [QM_SPECIAL_TOKEN_KEY]: '-inf' };
		}

		// Primitive
		return value;
	}
}
