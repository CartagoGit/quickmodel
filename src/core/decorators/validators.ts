import 'reflect-metadata';
import { QRule } from './qrule.decorator';

/**
 * Pre-built **validator decorators** — thin, composable wrappers around `@QRule`.
 *
 * These provide a `class-validator`-style API on top of QuickModel's native rule system.
 * All validators:
 * - Work on plain classes **and** classes extending `QModel`
 * - Are fully compatible with `@QGroup` (group-level validation)
 * - Support both `experimentalDecorators` (legacy) and TC39 decorator modes
 * - Are stackable: multiple validators on the same property are all evaluated
 *
 * ## Quick reference
 *
 * | Decorator            | Field type | Validates                          |
 * |----------------------|------------|------------------------------------|
 * | `@IsEmail()`         | `string`   | Email address format               |
 * | `@IsUrl()`           | `string`   | Valid URL (via `new URL()`)         |
 * | `@Min(n)`            | `number`   | Value ≥ n                          |
 * | `@Max(n)`            | `number`   | Value ≤ n                          |
 * | `@MinLength(n)`      | `string`   | String length ≥ n                  |
 * | `@MaxLength(n)`      | `string`   | String length ≤ n                  |
 * | `@IsNotEmpty()`      | `string`   | Non-empty / non-whitespace         |
 * | `@Matches(pattern)`  | `string`   | Matches RegExp                     |
 * | `@IsInt()`           | `number`   | Integer (no decimal part)          |
 * | `@IsPositive()`      | `number`   | Value > 0                          |
 * | `@IsNegative()`      | `number`   | Value < 0                          |
 * | `@IsIn(values)`      | `T`        | Value is in the provided list      |
 * | `@IsUuid()`          | `string`   | UUID v1–v5 format                  |
 * | `@IsDateString()`    | `string`   | Parseable date string              |
 *
 * @module validators
 *
 * @see {@link QRule} — primitive rule decorator that powers all validators here
 * @see {@link qCheckRules} — evaluate rules added by these validators at runtime
 * @see {@link QGroup} — organize validators into named groups
 *
 * @example
 * ```typescript
 * import { Quick, QModel } from 'quickmodel';
 * import { IsEmail, Min, MaxLength } from 'quickmodel';
 *
 * @Quick({ age: 'number' })
 * class UserForm extends QModel<IUserForm> {
 *   @IsEmail()
 *   declare email: string;
 *
 *   @Min(18)
 *   @Max(120)
 *   declare age: number;
 *
 *   @MaxLength(50)
 *   declare username: string;
 * }
 *
 * const form = new UserForm({ email: 'bad', age: 15, username: 'alice' });
 * const { valid, errors } = form.$qm.checkRules();
 * // valid  → false
 * // errors → [{ field: 'email', … }, { field: 'age', … }]
 * ```
 */

// ─────────────────────────────────────────────────────────────────────────────
// String validators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that a string is a well-formed email address.
 *
 * @param message - Custom error message (optional).
 *
 * @example
 * ```typescript
 * @IsEmail()
 * declare email: string;
 * ```
 * @see {@link IsUrl} — sibling string-format validator
 * @see {@link QRule} — underlying primitive used internally
 */
export function IsEmail(message = 'Invalid email address') {
	return QRule<string>(
		(val: string) =>
			typeof val === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
		message
	);
}

/**
 * Validates that a string is a valid URL (using the built-in `URL` constructor).
 *
 * @param message - Custom error message (optional).
 *
 * @example
 * ```typescript
 * @IsUrl()
 * declare website: string;
 * ```
 * @see {@link IsEmail} — sibling email-format validator
 * @see {@link QRule} — underlying primitive used internally
 */
export function IsUrl(message = 'Invalid URL') {
	return QRule<string>((val: string) => {
		try {
			new URL(val);
			return true;
		} catch {
			return false;
		}
	}, message);
}

/**
 * Validates that a string is not empty or whitespace-only.
 *
 * @param message - Custom error message (optional).
 *
 * @example
 * ```typescript
 * @IsNotEmpty()
 * declare username: string;
 * ```
 * @see {@link MinLength} — related length constraint
 * @see {@link QRule} — underlying primitive used internally
 */
export function IsNotEmpty(message = 'Must not be empty') {
	return QRule<string>(
		(val: string) => typeof val === 'string' && val.trim().length > 0,
		message
	);
}

/**
 * Validates that a string length is at least `min` characters.
 *
 * @param min - Minimum allowed length (inclusive).
 * @param message - Custom error message (optional).
 *
 * @example
 * ```typescript
 * @MinLength(3)
 * declare name: string;
 * ```
 * @see {@link MaxLength} — companion maximum-length constraint
 * @see {@link IsNotEmpty} — related non-empty check
 * @see {@link QRule} — underlying primitive used internally
 */
export function MinLength(min: number, message?: string) {
	return QRule<string>(
		(val: string) => typeof val === 'string' && val.length >= min,
		message ?? `Must be at least ${min} character${min === 1 ? '' : 's'}`
	);
}

/**
 * Validates that a string length does not exceed `max` characters.
 *
 * @param max - Maximum allowed length (inclusive).
 * @param message - Custom error message (optional).
 *
 * @example
 * ```typescript
 * @MaxLength(255)
 * declare bio: string;
 * ```
 * @see {@link MinLength} — companion minimum-length constraint
 * @see {@link QRule} — underlying primitive used internally
 */
export function MaxLength(max: number, message?: string) {
	return QRule<string>(
		(val: string) => typeof val === 'string' && val.length <= max,
		message ?? `Must be at most ${max} character${max === 1 ? '' : 's'}`
	);
}

/**
 * Validates that a string matches the given regular expression.
 *
 * @param pattern - The `RegExp` to test against.
 * @param message - Custom error message (optional).
 *
 * @example
 * ```typescript
 * @Matches(/^[A-Z]{3}$/)
 * declare code: string;
 * ```
 * @see {@link IsUuid} — related format validator using a fixed pattern
 * @see {@link QRule} — underlying primitive used internally
 */
export function Matches(pattern: RegExp, message?: string) {
	return QRule<string>(
		(val: string) => typeof val === 'string' && pattern.test(val),
		message ?? `Must match pattern ${pattern.toString()}`
	);
}

/**
 * Validates that a string is a valid UUID (v1–v5).
 *
 * @param message - Custom error message (optional).
 *
 * @example
 * ```typescript
 * @IsUuid()
 * declare id: string;
 * ```
 * @see {@link Matches} — use this for custom pattern validation
 * @see {@link QRule} — underlying primitive used internally
 */
export function IsUuid(message = 'Must be a valid UUID') {
	return QRule<string>(
		(val: string) =>
			typeof val === 'string' &&
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
				val
			),
		message
	);
}

/**
 * Validates that a string is a parseable date string.
 *
 * @param message - Custom error message (optional).
 *
 * @example
 * ```typescript
 * @IsDateString()
 * declare publishedAt: string;
 * ```
 * @see {@link IsUuid} — sibling string-format validator
 * @see {@link QRule} — underlying primitive used internally
 */
export function IsDateString(message = 'Must be a valid date string') {
	return QRule<string>(
		(val: string) =>
			typeof val === 'string' && !Number.isNaN(Date.parse(val)),
		message
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Numeric validators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that a number is greater than or equal to `min`.
 *
 * @param min - Minimum allowed value (inclusive).
 * @param message - Custom error message (optional).
 *
 * @example
 * ```typescript
 * @Min(18)
 * declare age: number;
 * ```
 * @see {@link Max} — companion maximum-value constraint
 * @see {@link IsPositive} — related sign constraint
 * @see {@link QRule} — underlying primitive used internally
 */
export function Min(min: number, message?: string) {
	return QRule<number>(
		(val: number) => typeof val === 'number' && val >= min,
		message ?? `Must be at least ${min}`
	);
}

/**
 * Validates that a number is less than or equal to `max`.
 *
 * @param max - Maximum allowed value (inclusive).
 * @param message - Custom error message (optional).
 *
 * @example
 * ```typescript
 * @Max(100)
 * declare score: number;
 * ```
 * @see {@link Min} — companion minimum-value constraint
 * @see {@link QRule} — underlying primitive used internally
 */
export function Max(max: number, message?: string) {
	return QRule<number>(
		(val: number) => typeof val === 'number' && val <= max,
		message ?? `Must be at most ${max}`
	);
}

/**
 * Validates that a number has no fractional part (is an integer).
 *
 * @param message - Custom error message (optional).
 *
 * @example
 * ```typescript
 * @IsInt()
 * declare count: number;
 * ```
 * @see {@link IsPositive} — related numeric constraint
 * @see {@link Min} — use for range constraints alongside `@IsInt()`
 * @see {@link QRule} — underlying primitive used internally
 */
export function IsInt(message = 'Must be an integer') {
	return QRule<number>(
		(val: number) => typeof val === 'number' && Number.isInteger(val),
		message
	);
}

/**
 * Validates that a number is strictly greater than zero.
 *
 * @param message - Custom error message (optional).
 *
 * @example
 * ```typescript
 * @IsPositive()
 * declare quantity: number;
 * ```
 * @see {@link IsNegative} — opposite sign constraint
 * @see {@link Min} — use for a specific lower bound
 * @see {@link QRule} — underlying primitive used internally
 */
export function IsPositive(message = 'Must be a positive number') {
	return QRule<number>(
		(val: number) => typeof val === 'number' && val > 0,
		message
	);
}

/**
 * Validates that a number is strictly less than zero.
 *
 * @param message - Custom error message (optional).
 *
 * @example
 * ```typescript
 * @IsNegative()
 * declare delta: number;
 * ```
 * @see {@link IsPositive} — opposite sign constraint
 * @see {@link Max} — use for a specific upper bound
 * @see {@link QRule} — underlying primitive used internally
 */
export function IsNegative(message = 'Must be a negative number') {
	return QRule<number>(
		(val: number) => typeof val === 'number' && val < 0,
		message
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic / multi-type validators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that a value is one of the provided allowed values.
 * Works with strings, numbers, enums, or any comparable type.
 *
 * @param allowed - Array of valid values.
 * @param message - Custom error message (optional).
 *
 * @example
 * ```typescript
 * @IsIn(['admin', 'user', 'guest'])
 * declare role: string;
 *
 * @IsIn([1, 2, 3, 5, 8, 13])
 * declare fibonacci: number;
 * ```
 * @see {@link Matches} — use for pattern-based constraints on strings
 * @see {@link QRule} — underlying primitive used internally
 */
export function IsIn<T>(allowed: T[], message?: string) {
	return QRule<T>(
		(val: T) => allowed.includes(val),
		message ?? `Must be one of: ${allowed.join(', ')}`
	);
}
