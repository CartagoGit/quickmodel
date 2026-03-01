/**
 * String transformation helpers.
 * Use these to compose multiple transformations easily.
 *
 * @see {@link compose} — pipeline composition helper
 * @see {@link pipe} — alias for compose
 * @see {@link deepFreeze} — deep object freezing helper
 *
 * @example
 * ```typescript
 * import { trim, uppercase, compose } from './core/helpers/transform-helpers';
 *
 * @Quick({
 *   name: compose(trim, uppercase),           // Applies trim and then uppercase
 *   email: compose(trim, lowercase),
 *   slug: slugify,
 * })
 * ```
 */

// ============================================================================
// OBJECT HELPERS
// ============================================================================

/**
 * Recursively freezes `obj` and all nested object references using `Object.freeze()`.
 *
 * Circular references and shared sub-graphs are protected by a `WeakSet` so each
 * object is only frozen once. The recursion cap (512) guards against pathologically
 * deep structures.
 *
 * @template T - Type of the value being frozen
 * @param obj - The value / object to freeze (primitives and functions are returned as-is)
 * @param visited - Internal `WeakSet` used to detect already-visited objects (do not pass externally)
 * @param depth - Internal recursion counter; throws at 512 to prevent stack overflow
 * @returns The same `obj` reference after all nested objects have been frozen
 * @throws {Error} If `depth` exceeds 512 (security guard against infinite structures)
 * @see {@link QModel.createReadonly} — creates a frozen readonly model instance
 */
export function deepFreeze<T>(
	obj: T,
	visited = new WeakSet<any>(),
	depth = 0
): T {
	if (depth > 512) {
		throw new Error(
			`QuickModel Security: Maximum recursion depth (512) exceeded during deepFreeze.`
		);
	}

	if (obj && typeof obj === 'object') {
		if (visited.has(obj)) {
			return obj;
		}
		visited.add(obj);

		const propNames = Object.getOwnPropertyNames(obj);
		for (const name of propNames) {
			const value = (obj as Record<string, unknown>)[name];
			if (value && typeof value === 'object') {
				deepFreeze(value, visited, depth + 1);
			}
		}
		return Object.freeze(obj);
	}
	return obj;
}

// ============================================================================
// STRING HELPERS
// ============================================================================

/**
 * Removes leading and trailing whitespace from a string.
 *
 * @param str - The string to trim.
 * @returns The trimmed string.
 * @see {@link trimStart} — remove only leading whitespace
 * @see {@link trimEnd} — remove only trailing whitespace
 *
 * @example
 * ```ts
 * trim('  hello  ') // 'hello'
 * ```
 */
export const trim = (str: string): string => str.trim();

/**
 * Removes leading whitespace from a string.
 *
 * @param str - The string to trim.
 * @returns The string with leading whitespace removed.
 * @see {@link trim} — remove both leading and trailing whitespace
 * @see {@link trimEnd} — remove only trailing whitespace
 *
 * @example
 * ```ts
 * trimStart('  hello  ') // 'hello  '
 * ```
 */
export const trimStart = (str: string): string => str.trimStart();

/**
 * Removes trailing whitespace from a string.
 *
 * @param str - The string to trim.
 * @returns The string with trailing whitespace removed.
 * @see {@link trim} — remove both leading and trailing whitespace
 * @see {@link trimStart} — remove only leading whitespace
 *
 * @example
 * ```ts
 * trimEnd('  hello  ') // '  hello'
 * ```
 */
export const trimEnd = (str: string): string => str.trimEnd();

/**
 * Safely stringifies a value, handling circular references and limiting length.
 * Use this for error messages to prevent DoS via circular objects and info-leak
 * via large payloads.
 *
 * @param value - The value to stringify
 * @param space - Optional JSON indentation spaces
 * @param maxLength - Maximum output length before truncation (default: 500).
 *   Set to `0` to disable truncation.
 * @returns A safe JSON string, truncated with `...[truncated]` if too long.
 *
 * @see {@link Logger} — used internally for safe debug output
 * @see {@link TraceLogger} — also uses this helper for trace entries
 *
 * @example
 * ```ts
 * safeStringify({ name: 'test' }) // '{"name":"test"}'
 * safeStringify({ data: 'x'.repeat(1000) }) // '{"data":"xxxxx...[truncated]'
 * safeStringify({ data: 'x' }, undefined, 100) // Custom max length
 * ```
 */
export function safeStringify(
	value: unknown,
	space?: number,
	maxLength = 500
): string {
	const visited = new WeakSet();
	try {
		const result = JSON.stringify(
			value,
			(_key, val) => {
				if (typeof val === 'object' && val !== null) {
					if (visited.has(val)) {
						return '[Circular]';
					}
					visited.add(val);
				}
				return val;
			},
			space
		);
		const str = result ?? 'undefined';
		if (maxLength > 0 && str.length > maxLength) {
			return str.slice(0, maxLength) + '...[truncated]';
		}
		return str;
	} catch {
		return `[Unserializable: ${typeof value}]`;
	}
}

/**
 * Converts a string to `UPPERCASE`.
 *
 * @param str - Source string
 * @returns The string with all characters uppercased via `String.prototype.toUpperCase()`
 * @see {@link lowercase} — inverse: convert to lowercase
 * @see {@link capitalize} — uppercase only the first character
 * @example uppercase('hello') // → 'HELLO'
 */
export const uppercase = (str: string): string => str.toUpperCase();

/**
 * Converts a string to `lowercase`.
 *
 * @param str - Source string
 * @returns The string with all characters lowercased via `String.prototype.toLowerCase()`
 * @see {@link uppercase} — inverse: convert to uppercase
 * @see {@link capitalize} — uppercase only the first character
 * @example lowercase('HELLO') // → 'hello'
 */
export const lowercase = (str: string): string => str.toLowerCase();

/**
 * Capitalises the first letter and lowercases the rest of a string.
 * @see {@link capitalizeWords} — capitalise every word in a string
 * @see {@link uppercase} — uppercase the entire string
 * @example capitalize('hELLO') // → 'Hello'
 */
export const capitalize = (str: string): string =>
	str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

/**
 * Capitalises the first letter of every space-separated word.
 * @see {@link capitalize} — capitalise only the first character of the whole string
 * @see {@link uppercase} — uppercase the entire string
 * @example capitalizeWords('hello world') // → 'Hello World'
 */
export const capitalizeWords = (str: string): string =>
	str
		.split(' ')
		.map((word) => capitalize(word))
		.join(' ');

/**
 * Converts a string to a URL-friendly slug (lowercase, hyphens, no special chars).
 * @see {@link kebabCase} — similar but preserves word boundaries from camelCase
 * @see {@link lowercase} — convert to lowercase without slug formatting
 * @example slugify('Hello World!') // → 'hello-world'
 */
export const slugify = (str: string): string =>
	str
		.trim()
		.toLowerCase()
		.replace(/[^\w\s-]/g, '') // Remove special chars
		.replace(/\s+/g, '-') // Spaces to hyphens
		.replace(/-+/g, '-'); // Multiple hyphens to single

/**
 * Converts a string to camelCase.
 * @see {@link snakeCase} — convert to snake_case instead
 * @see {@link kebabCase} — convert to kebab-case instead
 * @example camelCase('hello world') // → 'helloWorld'
 */
export const camelCase = (str: string): string =>
	str
		.toLowerCase()
		.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());

/**
 * Converts a string to snake_case.
 * @see {@link camelCase} — convert to camelCase instead
 * @see {@link kebabCase} — convert to kebab-case instead
 * @example snakeCase('helloWorld') // → 'hello_world'
 */
export const snakeCase = (str: string): string =>
	str
		.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
		.replace(/^_/, '');

/**
 * Converts a string to kebab-case.
 * @see {@link camelCase} — convert to camelCase instead
 * @see {@link snakeCase} — convert to snake_case instead
 * @example kebabCase('helloWorld') // → 'hello-world'
 */
export const kebabCase = (str: string): string =>
	str
		.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
		.replace(/^-/, '');

/**
 * Reverses the characters of a string.
 * @see {@link trim} — remove whitespace before reversing
 * @example reverse('abc') // → 'cba'
 */
export const reverse = (str: string): string =>
	str.split('').reverse().join('');

/**
 * Returns a curried function that truncates a string to `maxLength` characters,
 * appending `'...'` when truncation occurs.
 *
 * @param maxLength - Maximum number of characters before truncation.
 * @see {@link removeSpaces} — remove whitespace rather than truncate
 * @see {@link normalizeWhitespace} — normalize rather than truncate
 * @example truncate(5)('Hello World') // → 'Hello...'
 */
export const truncate =
	(maxLength: number) =>
	(str: string): string =>
		str.length > maxLength ? str.slice(0, maxLength) + '...' : str;

/**
 * Removes all whitespace characters from a string.
 *
 * @param str - Source string.
 * @returns A new string with all whitespace removed.
 * @see {@link normalizeWhitespace} — normalize to single spaces instead of removing all
 * @see {@link trim} — remove only leading/trailing whitespace
 * @example removeSpaces('hello world') // → 'helloworld'
 */
export const removeSpaces = (str: string): string => str.replace(/\s+/g, '');

/**
 * Normalises consecutive whitespace to a single space and trims both ends.
 * @see {@link removeSpaces} — remove whitespace entirely instead of normalizing
 * @see {@link trim} — remove only leading/trailing whitespace
 * @example normalizeWhitespace('  hello   world  ') // → 'hello world'
 */
export const normalizeWhitespace = (str: string): string =>
	str.replace(/\s+/g, ' ').trim();

// ============================================================================
// NUMBER HELPERS
// ============================================================================

/**
 * Returns a curried function that rounds a number to `decimals` decimal places.
 * @param decimals - Number of decimal places (default: 0).
 * @see {@link floor} — always round down
 * @see {@link ceil} — always round up
 * @example round(2)(3.14159) // → 3.14
 */
export const round =
	(decimals: number = 0) =>
	(num: number): number =>
		Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);

/**
 * Returns the largest integer less than or equal to `num`.
 *
 * @param num - Input number.
 * @returns `Math.floor(num)`.
 * @see {@link ceil} — always round up
 * @see {@link round} — round to nearest
 * @example floor(3.7) // → 3
 */
export const floor = (num: number): number => Math.floor(num);

/**
 * Returns the smallest integer greater than or equal to `num`.
 *
 * @param num - Input number.
 * @returns `Math.ceil(num)`.
 * @see {@link floor} — always round down
 * @see {@link round} — round to nearest
 * @example ceil(3.1) // → 4
 */
export const ceil = (num: number): number => Math.ceil(num);

/**
 * Returns the integer part of `num` by removing any fractional digits.
 *
 * @param num - Input number.
 * @returns `Math.trunc(num)`.
 * @see {@link floor} — round towards negative infinity
 * @see {@link round} — round to nearest
 * @example trunc(3.9) // → 3
 */
export const trunc = (num: number): number => Math.trunc(num);

/**
 * Returns the absolute value of `num`.
 *
 * @param num - Input number.
 * @returns `Math.abs(num)`.
 * @see {@link clamp} — constrain to a numeric range
 * @example abs(-5) // → 5
 */
export const abs = (num: number): number => Math.abs(num);

/**
 * Returns a curried function that clamps a number between `min` and `max`.
 * @param min - Lower bound (inclusive).
 * @param max - Upper bound (inclusive).
 * @see {@link percentage} — clamps to [0, 100] for percentage values
 * @see {@link abs} — absolute value helper
 * @example clamp(0, 100)(150) // → 100
 */
export const clamp =
	(min: number, max: number) =>
	(num: number): number =>
		Math.min(max, Math.max(min, num));

/** Clamps a number to the range [0, 100]. Useful for percentage values. */
export const percentage = (num: number): number => clamp(0, 100)(num);

/**
 * Returns a curried function that formats a number to a fixed number of decimals.
 * @param decimals - Number of decimal places.
 * @see {@link round} — round to decimal places (returns number)
 * @see {@link formatCurrency} — format with a currency symbol prefix
 * @example toFixed(2)(3.1) // → '3.10'
 */
export const toFixed =
	(decimals: number) =>
	(num: number): string =>
		num.toFixed(decimals);

/**
 * Returns a curried function that multiplies a number by `factor`.
 * @see {@link divide} — inverse: divide by factor
 * @see {@link add} — addition helper
 * @example multiply(2)(5) // → 10
 */
export const multiply =
	(factor: number) =>
	(num: number): number =>
		num * factor;

/**
 * Returns a curried function that divides a number by `divisor`.
 * @see {@link multiply} — inverse: multiply by factor
 * @see {@link subtract} — subtraction helper
 * @example divide(2)(10) // → 5
 */
export const divide =
	(divisor: number) =>
	(num: number): number =>
		num / divisor;

/**
 * Returns a curried function that adds `amount` to a number.
 * @see {@link subtract} — inverse: subtract amount from number
 * @see {@link multiply} — multiplication helper
 * @example add(3)(7) // → 10
 */
export const add =
	(amount: number) =>
	(num: number): number =>
		num + amount;

/**
 * Returns a curried function that subtracts `amount` from a number.
 * @see {@link add} — inverse: add amount to number
 * @see {@link divide} — division helper
 * @example subtract(3)(10) // → 7
 */
export const subtract =
	(amount: number) =>
	(num: number): number =>
		num - amount;

// ============================================================================
// ENCODING/DECODING HELPERS
// ============================================================================

/**
 * Encodes a UTF-8 string as Base64.
 *
 * @param str - Source UTF-8 string.
 * @returns The Base64-encoded representation.
 * @see {@link base64Decode} — inverse: decode Base64 back to UTF-8
 * @see {@link encodeURIString} — URL-encode instead of Base64-encode
 * @example base64Encode('hello') // → 'aGVsbG8='
 */
export const base64Encode = (str: string): string =>
	Buffer.from(str).toString('base64');

/**
 * Decodes a Base64-encoded string back to UTF-8.
 *
 * @param str - Base64-encoded string.
 * @returns The decoded UTF-8 string.
 * @see {@link base64Encode} — inverse: encode UTF-8 to Base64
 * @see {@link decodeURIString} — URL-decode instead of Base64-decode
 * @example base64Decode('aGVsbG8=') // → 'hello'
 */
export const base64Decode = (str: string): string =>
	Buffer.from(str, 'base64').toString('utf-8');

/**
 * Parses a JSON string and returns the typed value.
 * @template T - Expected type of the parsed value.
 * @see {@link jsonStringify} — inverse: serialise a value to JSON string
 */
export const jsonParse = <T = unknown>(str: string): T => JSON.parse(str);

/**
 * Serialises a value to a JSON string.
 *
 * @param obj - Any serialisable value.
 * @returns A JSON string representation of `obj`.
 * @see {@link jsonParse} — inverse: parse a JSON string back to a value
 * @see {@link safeStringify} — safer version, handles circular references and truncation
 * @example jsonStringify({ name: 'test' }) // → '{"name":"test"}'
 */
export const jsonStringify = (obj: unknown): string => JSON.stringify(obj);

/**
 * Encodes a string for safe use in a URI component.
 *
 * Delegates to `encodeURIComponent`.
 *
 * @param str - Raw string to encode.
 * @returns The URL-encoded string.
 * @see {@link decodeURIString} — inverse: decode a URI-encoded string
 * @see {@link base64Encode} — Base64 encoding alternative
 * @example encodeURIString('hello world') // → 'hello%20world'
 */
export const encodeURIString = (str: string): string => encodeURIComponent(str);

/**
 * Decodes a URI-encoded component string.
 *
 * Delegates to `decodeURIComponent`.
 *
 * @param str - URI-encoded string.
 * @returns The decoded plain string.
 * @see {@link encodeURIString} — inverse: encode a string for URI use
 * @see {@link base64Decode} — Base64 decoding alternative
 * @example decodeURIString('hello%20world') // → 'hello world'
 */
export const decodeURIString = (str: string): string => decodeURIComponent(str);

// ============================================================================
// COMPOSITION HELPER
// ============================================================================

/**
 * Composes multiple transformation functions from left to right (pipeline order).
 *
 * Each function receives the output of the previous one. The composed function
 * applies them sequentially: `fn1 → fn2 → … → fnN`.
 *
 * @template T - The common input/output type shared by all functions in the pipeline
 * @param fns - One or more transformation functions, each accepting and returning `T`
 * @returns A single function that applies all `fns` in order
 *
 * @see {@link pipe} — alias for this function
 * @see {@link Quick} — `@Quick()` typeMap values can be composed functions
 *
 * @example
 * ```typescript
 * @Quick({
 *   name: compose(trim, uppercase),           // trim → uppercase
 *   email: compose(trim, lowercase),          // trim → lowercase
 *   slug: compose(trim, lowercase, slugify),  // trim → lowercase → slugify
 * })
 * ```
 */
export function compose<T>(...fns: Array<(val: T) => T>): (val: T) => T {
	return (value: T) => fns.reduce((acc, func) => func(acc), value);
}

/**
 * Alias for {@link compose} — applies functions left-to-right (pipeline order).
 *
 * Some developers prefer the `pipe` term over `compose`. Both are semantically
 * identical in this implementation.
 *
 * @see compose
 */
export const pipe = compose;

// ============================================================================
// CURRENCY/BUSINESS HELPERS
// ============================================================================

/**
 * Returns a curried function that applies a tax rate to a price.
 * @param rate - Tax rate as a decimal fraction (e.g. `0.1` for 10 %).
 * @see {@link discount} — apply a discount rate instead
 * @see {@link vat} — fixed 21 % VAT helper
 */
export const tax =
	(rate: number) =>
	(price: number): number =>
		price * rate;

/**
 * Returns a curried function that applies a discount rate to a price.
 * @param rate - Discount rate as a decimal fraction (e.g. `0.2` for 20 % off).
 * @see {@link tax} — apply a tax rate instead
 * @see {@link vat} — fixed 21 % VAT helper
 */
export const discount =
	(rate: number) =>
	(price: number): number =>
		price * (1 - rate);

/**
 * Applies a fixed 21 % VAT rate to the given price.
 *
 * @param price - Net price before tax.
 * @returns The tax amount (not the final price). Add to `price` for the gross amount.
 * @see {@link tax} — apply a custom tax rate
 * @see {@link discount} — apply a discount rate
 * @example vat(100) // → 21
 */
export const vat = (price: number): number => price * 0.21;

/**
 * Returns a curried function that formats a number as a currency string.
 * @param currency - Currency symbol prefix (default `'$'`).
 * @param decimals - Number of decimal places (default `2`).
 * @see {@link toFixed} — format number to fixed decimals without symbol
 * @see {@link vat} — compute VAT on a price
 */
export const formatCurrency =
	(currency: string = '$', decimals: number = 2) =>
	(amount: number): string =>
		`${currency}${amount.toFixed(decimals)}`;

// ============================================================================
// ARRAY HELPERS
// ============================================================================

/**
 * Returns a new array with duplicate values removed (uses `Set` equality).
 * @template T - Element type.
 * @see {@link compact} — remove falsy values from an array
 * @see {@link sortAsc} — sort after deduplication
 */
export const unique = <T>(arr: T[]): T[] => [...new Set(arr)];

/**
 * Returns a shallow copy of the array sorted in ascending order.
 * @template T - Element type.
 * @see {@link sortDesc} — sort in descending order
 * @see {@link unique} — deduplicate before sorting
 */
export const sortAsc = <T>(arr: T[]): T[] => [...arr].sort();

/**
 * Returns a shallow copy of the array sorted in descending order.
 * @template T - Element type.
 * @see {@link sortAsc} — sort in ascending order
 * @see {@link unique} — deduplicate before sorting
 */
export const sortDesc = <T>(arr: T[]): T[] => [...arr].sort().reverse();

/**
 * Returns the first element of the array, or `undefined` if the array is empty.
 * @template T - Element type.
 * @see {@link last} — return the last element
 * @see {@link compact} — remove falsy values first
 */
export const first = <T>(arr: T[]): T | undefined => arr[0];

/**
 * Returns the last element of the array, or `undefined` if the array is empty.
 * @template T - Element type.
 * @see {@link first} — return the first element
 * @see {@link sortDesc} — sort descending before picking last
 */
export const last = <T>(arr: T[]): T | undefined => arr[arr.length - 1];

/**
 * Returns a new array with all falsy values (`null`, `undefined`, `0`, `''`, `false`) removed.
 * @template T - Element type.
 * @see {@link unique} — remove duplicate values
 * @see {@link first} — get the first non-falsy element after compacting
 */
export const compact = <T>(arr: T[]): NonNullable<T>[] =>
	arr.filter(Boolean) as NonNullable<T>[];
