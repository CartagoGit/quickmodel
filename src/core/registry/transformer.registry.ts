import { IQTransformer } from '../interfaces/transformer.interface';
import type { IQAlias } from '../types/q-alias.type';

/**
 * Valid keys to identify a transformer.
 * Can be a string literal ('date', 'bigint'), a constructor (Date, BigInt), a string name,
 * or a custom transformer object implementing IQTransformer.
 */
export type IQTransformerKey =
	| IQAlias
	| { name: string }
	| string
	| IQTransformer<any, any>;

/**
 * Global registry for transformers.
 * Allows users to register custom transformers that will be available to all specific services (Deserializer, Serializer).
 */
export class QTransformerRegistry {
	private static transformers = new Map<
		string,
		IQTransformer<unknown, unknown>
	>();

	/**
	 * Registers a custom transformer.
	 *
	 * @param key - The key to identify the transformer (Class constructor or string name)
	 * @param transformer - The transformer instance
	 *
	 * @example
	 * ```typescript
	 * class MoneyTransformer implements IQTransformer<Money, string> { ... }
	 * QTransformerRegistry.register(Money, new MoneyTransformer());
	 * ```
	 */
	public static register(
		key: IQTransformerKey,
		transformer: IQTransformer<unknown, unknown>
	): void {
		const lookupKey = this.normalizeKey(key);
		if (lookupKey) {
			this.transformers.set(lookupKey, transformer);
		}
	}

	/**
	 * Retrieves a transformer by key.
	 *
	 * @param key - The key to look up
	 * @returns The transformer or undefined
	 */
	public static get(
		key: IQTransformerKey
	): IQTransformer<unknown, unknown> | undefined {
		const lookupKey = this.normalizeKey(key);
		if (lookupKey && this.transformers.has(lookupKey)) {
			return this.transformers.get(lookupKey);
		}
		return undefined;
	}

	/**
	 * Checks if a transformer is registered.
	 */
	public static has(key: IQTransformerKey): boolean {
		const lookupKey = this.normalizeKey(key);
		return !!lookupKey && this.transformers.has(lookupKey);
	}

	/**
	 * Normalizes the key to a lowercase string.
	 */
	private static normalizeKey(key: IQTransformerKey): string | undefined {
		if (typeof key === 'string') {
			return key.toLowerCase();
		} else if (
			typeof key === 'function' &&
			(key as { name: string }).name
		) {
			return (key as { name: string }).name.toLowerCase();
		} else if (typeof key === 'object' && key !== null && 'name' in key) {
			// Handle object with name property (like a class constructor viewed as object)
			return (key as { name: string }).name.toLowerCase();
		}
		return undefined;
	}

	/**
	 * Clears all custom transformers (useful for testing).
	 */
	public static clear(): void {
		this.transformers.clear();
	}
}
