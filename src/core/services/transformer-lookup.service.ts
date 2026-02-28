import {
	QTransformerRegistry,
	type IQTransformerKey,
} from '../registry/transformer.registry';
import { IQTransformer } from '../interfaces/transformer.interface';
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
	SharedArrayBufferTransformer,
} from '@/transformers/buffer.transformer';
import { TypedArrayTransformer } from '@/transformers/typed-array.transformer';
import {
	URLTransformer,
	URLSearchParamsTransformer,
	TextEncoderTransformer,
	TextDecoderTransformer,
} from '@/transformers/web-apis.transformer';
import { PrimitiveTransformer } from '@/transformers/primitive.transformer';
import { SpecialFloatTransformer } from '@/transformers/special-float.transformer';

/**
 * Service responsible for looking up and managing transformers.
 *
 * This service applies SOLID principles:
 * - Single Responsibility: Only handles transformer registration and lookup.
 */
export class TransformerLookupService {
	private readonly transformers: Map<string, IQTransformer<unknown, unknown>>;
	/** Cache: normalized lowercase key per string input to avoid repeated .toLowerCase() calls */
	private readonly _strKeyCache = new Map<string, string>();
	/** Cache: normalized lowercase name per constructor Function */
	private readonly _fnKeyCache = new WeakMap<Function, string>();

	/** @internal Initializes the service and registers all built-in default transformers. */
	constructor() {
		this.transformers = new Map();
		this.registerDefaultTransformers();
	}

	/**
	 * Gets a registered transformer by key or constructor name.
	 *
	 * @param key - The key to look up (string literal, constructor, or class name)
	 * @returns The registered transformer or `undefined` if not found
	 */
	public getTransformer(
		key: IQTransformerKey
	): IQTransformer<unknown, unknown> | undefined {
		// 0. Check if key is a Transformer Object (Direct injection)
		if (
			typeof key === 'object' &&
			key !== null &&
			'serialize' in key &&
			'deserialize' in key
		) {
			return key as IQTransformer<unknown, unknown>;
		}

		// 1. Check global registry first (allows overriding defaults)
		const customTransformer = QTransformerRegistry.get(key);
		if (customTransformer) {
			return customTransformer;
		}

		// 2. Check local defaults
		let lookupKey: string | undefined;

		if (typeof key === 'string') {
			// Cache normalized string keys to avoid repeated .toLowerCase() allocations
			lookupKey = this._strKeyCache.get(key);
			if (!lookupKey) {
				lookupKey = key.toLowerCase();
				this._strKeyCache.set(key, lookupKey);
			}
		} else if (typeof key === 'function') {
			// Cache constructor name lookups via WeakMap
			lookupKey = this._fnKeyCache.get(key);
			if (!lookupKey) {
				lookupKey = (key as { name: string }).name.toLowerCase();
				this._fnKeyCache.set(key, lookupKey);
			}
		} else if (typeof key === 'object' && key !== null && 'name' in key) {
			// Handle object with name property (like a class constructor viewed as object)
			lookupKey = (key as { name: string }).name.toLowerCase();
		}

		if (lookupKey && this.transformers.has(lookupKey)) {
			return this.transformers.get(lookupKey);
		}

		return undefined;
	}

	/**
	 * Returns a list of all available transformer keys.
	 *
	 * @returns Array of transformer keys (e.g., 'date', 'bigint')
	 */
	public getAvailableTransformers(): string[] {
		return Array.from(this.transformers.keys());
	}

	/** @internal Registers all built-in type transformers (date, bigint, symbol, regexp, error, map, set, …). */
	private registerDefaultTransformers(): void {
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

		// Register SharedArrayBuffer
		const sharedArrayBufferTransformer = new SharedArrayBufferTransformer();
		this.transformers.set(
			'sharedarraybuffer',
			sharedArrayBufferTransformer
		);

		// Register Web APIs
		const urlTransformer = new URLTransformer();
		const urlSearchParamsTransformer = new URLSearchParamsTransformer();
		const textEncoderTransformer = new TextEncoderTransformer();
		const textDecoderTransformer = new TextDecoderTransformer();

		this.transformers.set('url', urlTransformer);
		this.transformers.set('urlsearchparams', urlSearchParamsTransformer);
		this.transformers.set('textencoder', textEncoderTransformer);
		this.transformers.set('textdecoder', textDecoderTransformer);

		// Register special float transformers (NaN, Infinity, -Infinity)
		const specialFloatTransformer = new SpecialFloatTransformer();
		this.transformers.set('nan', specialFloatTransformer);
		this.transformers.set('infinity', specialFloatTransformer);
		this.transformers.set('-infinity', specialFloatTransformer);
		this.transformers.set('special-float', specialFloatTransformer);
	}
}
