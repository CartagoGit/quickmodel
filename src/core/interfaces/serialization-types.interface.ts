/**
 * Utility types for type-safe serialization/deserialization
 *
 * These types correctly map TypeScript types to their IQSerialized representations
 */

/**
 * Maps a TypeScript runtime type to its JSON-safe serialized representation.
 *
 * Used to derive the correct interface type for `serialize()` return values.
 *
 * | Runtime type             | Serialized type                          |
 * |--------------------------|------------------------------------------|
 * | `Date`                   | `string` (ISO 8601)                      |
 * | `RegExp`                 | `string` or `{ __type: 'regexp'; ... }`  |
 * | `Error`                  | `string`                                 |
 * | `URL`, `URLSearchParams` | `string`                                 |
 * | `bigint`                 | `string` or `{ __type: 'bigint'; ... }`  |
 * | `symbol`                 | `string` or `{ __type: 'symbol'; ... }`  |
 * | Typed arrays             | `number[]` (or `string[]` for BigInt64)  |
 * | `ArrayBuffer`, `DataView`| `number[]`                               |
 * | `Map<K, V>`              | `[K, V][]` or `{ __type: 'Map'; ... }`   |
 * | `Set<U>`                 | `U[]` or `{ __type: 'Set'; ... }`        |
 * | `Array<U>`               | `IQSerialized<U>[]`                      |
 * | plain `object`           | `{ [K in keyof T]: IQSerialized<T[K]> }` |
 * | primitives               | as-is (`string`, `number`, `boolean`, …) |
 *
 * @template T - The runtime TypeScript type to map.
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
 * Maps every property of an interface to its {@link IQSerialized} equivalent.
 *
 * This is the return type of `QModel.serialize()` when no `alias` map is used.
 * Each property is independently mapped through `IQSerialized<T[K]>`.
 *
 * @template T - The model interface (runtime property types).
 * @see {@link IQAliasedSerializedInterface} — variant with key renaming via `@Quick({ alias: ... })`
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
 * Maps a model interface to the shape accepted as **input** by `create()`, `createMany()`
 * and `new Model()` when the model declares alias keys via `TAliasMap`.
 *
 * - Keys that have an entry in `TAliasMap` are replaced by their alias value
 *   (e.g. `firstName` → `'first_name'`).
 * - Keys without an entry keep their original name.
 * - When `TAliasMap` is empty (`Record<never, never>`) the type is identical to `T`
 *   — no overhead and no regression for models without aliases.
 * - The union with `T` preserves the documented fallback: passing **camelCase** (original)
 *   keys instead of alias keys is also valid at runtime and therefore at type level.
 *
 * @template T         - The model interface (runtime / wire property names).
 * @template TAliasMap - Literal map `{ propertyName: 'alias_key' }` — same second
 *                       type parameter as `QModel<TInterface, TAliasMap>`.
 *
 * @example
 * ```typescript
 * type IUserAliasMap = { firstName: 'first_name'; lastName: 'last_name' };
 *
 * // IQAliasInput<IUser, IUserAliasMap> produces:
 * // { first_name: string; last_name: string } | IUser
 * ```
 */
export type IQAliasInput<
	T,
	TAliasMap extends Record<string, string> = Record<never, never>,
> = [keyof TAliasMap] extends [never]
	? T
	: // Alias-remapped shape (alias keys → original types) ∪ original shape (fallback)
			| {
					[K in keyof T as K extends string
						? K extends keyof TAliasMap
							? TAliasMap[K]
							: K
						: K]: T[K];
			  }
			| T;

/**
 * Identity mapping from serialized → deserialized type.
 *
 * This is a type-level no-op: the actual deserialization is performed at runtime
 * by the registered transformers. The type alias exists to make intent explicit in
 * method signatures that accept or return deserialized data.
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
