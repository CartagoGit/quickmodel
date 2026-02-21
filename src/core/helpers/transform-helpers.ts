/**
 * String transformation helpers.
 * Use these to compose multiple transformations easily.
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
 * Deep freezes an object.
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
			const value = (obj as any)[name];
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

export const trim = (str: string): string => str.trim();
export const trimStart = (str: string): string => str.trimStart();
export const trimEnd = (str: string): string => str.trimEnd();

/**
 * Safely stringifies a value, handling circular references and limiting length.
 * Use this for error messages to prevent DoS via circular objects.
 */
export function safeStringify(value: unknown, space?: number): string {
	const visited = new WeakSet();
	try {
		return JSON.stringify(
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
	} catch {
		return `[Unserializable: ${typeof value}]`;
	}
}

export const uppercase = (str: string): string => str.toUpperCase();
export const lowercase = (str: string): string => str.toLowerCase();

export const capitalize = (str: string): string =>
	str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export const capitalizeWords = (str: string): string =>
	str
		.split(' ')
		.map((word) => capitalize(word))
		.join(' ');

export const slugify = (str: string): string =>
	str
		.trim()
		.toLowerCase()
		.replace(/[^\w\s-]/g, '') // Remove special chars
		.replace(/\s+/g, '-') // Spaces to hyphens
		.replace(/-+/g, '-'); // Multiple hyphens to single

export const camelCase = (str: string): string =>
	str
		.toLowerCase()
		.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());

export const snakeCase = (str: string): string =>
	str
		.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
		.replace(/^_/, '');

export const kebabCase = (str: string): string =>
	str
		.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
		.replace(/^-/, '');

export const reverse = (str: string): string =>
	str.split('').reverse().join('');

export const truncate =
	(maxLength: number) =>
	(str: string): string =>
		str.length > maxLength ? str.slice(0, maxLength) + '...' : str;

export const removeSpaces = (str: string): string => str.replace(/\s+/g, '');

export const normalizeWhitespace = (str: string): string =>
	str.replace(/\s+/g, ' ').trim();

// ============================================================================
// NUMBER HELPERS
// ============================================================================

export const round =
	(decimals: number = 0) =>
	(num: number): number =>
		Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);

export const floor = (num: number): number => Math.floor(num);
export const ceil = (num: number): number => Math.ceil(num);
export const trunc = (num: number): number => Math.trunc(num);
export const abs = (num: number): number => Math.abs(num);

export const clamp =
	(min: number, max: number) =>
	(num: number): number =>
		Math.min(max, Math.max(min, num));

export const percentage = (num: number): number => clamp(0, 100)(num);

export const toFixed =
	(decimals: number) =>
	(num: number): string =>
		num.toFixed(decimals);

export const multiply =
	(factor: number) =>
	(num: number): number =>
		num * factor;

export const divide =
	(divisor: number) =>
	(num: number): number =>
		num / divisor;

export const add =
	(amount: number) =>
	(num: number): number =>
		num + amount;

export const subtract =
	(amount: number) =>
	(num: number): number =>
		num - amount;

// ============================================================================
// ENCODING/DECODING HELPERS
// ============================================================================

export const base64Encode = (str: string): string =>
	Buffer.from(str).toString('base64');

export const base64Decode = (str: string): string =>
	Buffer.from(str, 'base64').toString('utf-8');

export const jsonParse = <T = unknown>(str: string): T => JSON.parse(str);

export const jsonStringify = (obj: unknown): string => JSON.stringify(obj);

export const encodeURIString = (str: string): string => encodeURIComponent(str);

export const decodeURIString = (str: string): string => decodeURIComponent(str);

// ============================================================================
// COMPOSITION HELPER
// ============================================================================

/**
 * Compose multiple transformation functions left to right.
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
 * Pipe is an alias for compose (same behavior, different name).
 * Some developers prefer "pipe" terminology.
 */
export const pipe = compose;

// ============================================================================
// CURRENCY/BUSINESS HELPERS
// ============================================================================

export const tax =
	(rate: number) =>
	(price: number): number =>
		price * rate;

export const discount =
	(rate: number) =>
	(price: number): number =>
		price * (1 - rate);

export const vat = (price: number): number => price * 0.21; // VAT 21%

export const formatCurrency =
	(currency: string = '$', decimals: number = 2) =>
	(amount: number): string =>
		`${currency}${amount.toFixed(decimals)}`;

// ============================================================================
// ARRAY HELPERS
// ============================================================================

export const unique = <T>(arr: T[]): T[] => [...new Set(arr)];

export const sortAsc = <T>(arr: T[]): T[] => [...arr].sort();

export const sortDesc = <T>(arr: T[]): T[] => [...arr].sort().reverse();

export const first = <T>(arr: T[]): T | undefined => arr[0];

export const last = <T>(arr: T[]): T | undefined => arr[arr.length - 1];

export const compact = <T>(arr: T[]): NonNullable<T>[] =>
	arr.filter(Boolean) as NonNullable<T>[];
