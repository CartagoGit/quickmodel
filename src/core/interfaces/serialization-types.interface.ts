/**
 * Utility types for type-safe serialization/deserialization
 *
 * These types correctly map TypeScript types to their IQSerialized representations
 */

/**
 * Maps a TypeScript type to its IQSerialized version
 */
export type IQSerialized<T> = T extends RegExp
	? string | { __type: 'regexp'; source: string; flags: string }
	: T extends Error
		? string
		: T extends Date
			? string
			: T extends URL
				? string
				: T extends URLSearchParams
					? string
					: T extends bigint
						? string | { __type: 'bigint'; value: string }
						: T extends symbol
							? string | { __type: 'symbol'; description: string }
							: T extends Int8Array
								? number[]
								: T extends Uint8Array
									? number[]
									: T extends Uint8ClampedArray
										? number[]
										: T extends Int16Array
											? number[]
											: T extends Uint16Array
												? number[]
												: T extends Int32Array
													? number[]
													: T extends Uint32Array
														? number[]
														: T extends Float32Array
															? number[]
															: T extends Float64Array
																? number[]
																: T extends BigInt64Array
																	? string[]
																	: T extends BigUint64Array
																		? string[]
																		: T extends ArrayBuffer
																			? number[]
																			: T extends DataView
																				? number[]
																				: T extends Map<
																							infer K,
																							infer V
																					  >
																					?
																							| [
																									IQSerialized<K>,
																									IQSerialized<V>,
																							  ][]
																							| {
																									__type: 'Map';
																									entries: [
																										K,
																										V,
																									][];
																							  }
																					: T extends Set<
																								infer U
																						  >
																						?
																								| IQSerialized<U>[]
																								| {
																										__type: 'Set';
																										values: U[];
																								  }
																						: T extends Array<
																									infer U
																							  >
																							? IQSerialized<U>[]
																							: T extends object
																								? {
																										[K in keyof T]: IQSerialized<
																											T[K]
																										>;
																									}
																								: T; // primitivos (string, number, boolean, null, undefined)

/**
 * Maps a complete interface to its IQSerialized version
 */
export type IQSerializedInterface<T> = {
	[K in keyof T]: IQSerialized<T[K]>;
};

/**
 * Maps a complete interface to its IQSerialized version, remapping keys according to
 * the `alias` map passed to `@Quick()`. This is the return type of `serialize()` when
 * `@Quick` is used with the `alias` option.
 *
 * Keys present in `TAliasMap` are renamed to their alias values; all other keys are kept.
 *
 * @template T - The model interface (property names)
 * @template TAliasMap - Literal map `{ propertyName: 'alias_name' }` from `@Quick({ alias: ... })`
 *
 * @example
 * ```typescript
 * interface IUser { firstName: string; lastName: string; }
 *
 * @Quick({}, { alias: { firstName: 'first_name', lastName: 'last_name' } })
 * class User extends QModel<IUser> {
 *   declare firstName: string;
 *   declare lastName: string;
 * }
 *
 * const user = new User({ first_name: 'Dave', last_name: 'Jones' });
 * const json = user.serialize();
 * // Type: { first_name: string; last_name: string }  ✅  IDE autocomplete correcto
 * json.first_name; // 'Dave'
 * ```
 */
export type IQAliasedSerializedInterface<
	T,
	TAliasMap extends Record<string, string> = Record<never, never>,
> = {
	[K in keyof T as K extends string
		? K extends keyof TAliasMap
			? TAliasMap[K]
			: K
		: K]: IQSerialized<T[K]>;
};

/**
 * Maps a serialized type back to its original (deserialized) type.
 *
 * This is an identity mapping at the type level — actual deserialization is
 * performed at runtime by the registered transformers.
 *
 * @template T - The deserialized TypeScript type.
 */
export type IDeserialized<T> = T; // Deserialization handled at runtime with transformers

/**
 * Union type accepted by the `QModel` constructor for input data.
 *
 * Allows passing either:
 * - The raw interface type `T` (e.g. directly from a backend JSON response),
 * - The serialized version `IQSerializedInterface<T>` (e.g. after `JSON.parse()`), or
 * - A generic `Record<string, unknown>` for loosely-typed or partial payloads.
 *
 * This flexibility lets you hand any of the above shapes directly to `new Model(data)`
 * without manual casting.
 *
 * @template T - The model interface type.
 */
export type IQModelData<T> =
	| T
	| IQSerializedInterface<T>
	| Record<string, unknown>;
