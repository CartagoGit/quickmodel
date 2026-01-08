/**
 * String transformation helpers.
 * Use these to compose multiple transformations easily.
 * 
 * @example
 * ```typescript
 * import { trim, uppercase, compose } from './core/helpers/transform-helpers';
 * 
 * @Quick({
 *   name: compose(trim, uppercase),  // Aplica trim y luego uppercase
 *   email: compose(trim, lowercase),
 *   slug: slugify,
 * })
 * ```
 */

// ============================================================================
// STRING HELPERS
// ============================================================================

export const trim = (s: string): string => s.trim();
export const trimStart = (s: string): string => s.trimStart();
export const trimEnd = (s: string): string => s.trimEnd();

export const uppercase = (s: string): string => s.toUpperCase();
export const lowercase = (s: string): string => s.toLowerCase();

export const capitalize = (s: string): string => 
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export const capitalizeWords = (s: string): string => 
  s.split(' ').map(word => capitalize(word)).join(' ');

export const slugify = (s: string): string => 
  s.trim()
   .toLowerCase()
   .replace(/[^\w\s-]/g, '')  // Remove special chars
   .replace(/\s+/g, '-')       // Spaces to hyphens
   .replace(/-+/g, '-');       // Multiple hyphens to single

export const camelCase = (s: string): string => 
  s.toLowerCase()
   .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());

export const snakeCase = (s: string): string => 
  s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
   .replace(/^_/, '');

export const kebabCase = (s: string): string => 
  s.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
   .replace(/^-/, '');

export const reverse = (s: string): string => 
  s.split('').reverse().join('');

export const truncate = (maxLength: number) => (s: string): string => 
  s.length > maxLength ? s.slice(0, maxLength) + '...' : s;

export const removeSpaces = (s: string): string => 
  s.replace(/\s+/g, '');

export const normalizeWhitespace = (s: string): string => 
  s.replace(/\s+/g, ' ').trim();

// ============================================================================
// NUMBER HELPERS
// ============================================================================

export const round = (decimals: number = 0) => (n: number): number => 
  Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);

export const floor = (n: number): number => Math.floor(n);
export const ceil = (n: number): number => Math.ceil(n);
export const trunc = (n: number): number => Math.trunc(n);
export const abs = (n: number): number => Math.abs(n);

export const clamp = (min: number, max: number) => (n: number): number => 
  Math.min(max, Math.max(min, n));

export const percentage = (n: number): number => clamp(0, 100)(n);

export const toFixed = (decimals: number) => (n: number): string => 
  n.toFixed(decimals);

export const multiply = (factor: number) => (n: number): number => 
  n * factor;

export const divide = (divisor: number) => (n: number): number => 
  n / divisor;

export const add = (amount: number) => (n: number): number => 
  n + amount;

export const subtract = (amount: number) => (n: number): number => 
  n - amount;

// ============================================================================
// ENCODING/DECODING HELPERS
// ============================================================================

export const base64Encode = (s: string): string => 
  Buffer.from(s).toString('base64');

export const base64Decode = (s: string): string => 
  Buffer.from(s, 'base64').toString('utf-8');

export const jsonParse = <T = any>(s: string): T => 
  JSON.parse(s);

export const jsonStringify = (obj: any): string => 
  JSON.stringify(obj);

export const encodeURIString = (s: string): string => 
  encodeURIComponent(s);

export const decodeURIString = (s: string): string => 
  decodeURIComponent(s);

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
  return (value: T) => fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * Pipe is an alias for compose (same behavior, different name).
 * Some developers prefer "pipe" terminology.
 */
export const pipe = compose;

// ============================================================================
// CURRENCY/BUSINESS HELPERS
// ============================================================================

export const tax = (rate: number) => (price: number): number => 
  price * rate;

export const discount = (rate: number) => (price: number): number => 
  price * (1 - rate);

export const vat = (price: number): number => 
  price * 0.21; // IVA 21%

export const formatCurrency = (currency: string = '$', decimals: number = 2) => 
  (amount: number): string => 
    `${currency}${amount.toFixed(decimals)}`;

// ============================================================================
// ARRAY HELPERS
// ============================================================================

export const unique = <T>(arr: T[]): T[] => 
  [...new Set(arr)];

export const sortAsc = <T>(arr: T[]): T[] => 
  [...arr].sort();

export const sortDesc = <T>(arr: T[]): T[] => 
  [...arr].sort().reverse();

export const first = <T>(arr: T[]): T | undefined => 
  arr[0];

export const last = <T>(arr: T[]): T | undefined => 
  arr[arr.length - 1];

export const compact = <T>(arr: T[]): NonNullable<T>[] => 
  arr.filter(Boolean) as NonNullable<T>[];
