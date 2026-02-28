import { ICaseType } from '../types/case.type';

/**
 * Utility class for converting strings between different naming conventions.
 *
 * Supports the four case formats recognized by the `@Quick()` `transformCase` option:
 * `snake_case`, `camelCase`, `kebab-case`, and `PascalCase`.
 *
 * Normalisation follows this pipeline:
 * 1. Split on camelCase boundaries (`myField` → `['my', 'Field']`).
 * 2. Replace `_` and `-` separators.
 * 3. Lowercase all tokens.
 * 4. Re-join in the requested format.
 *
 * @see {@link ICaseType} — union of accepted format strings
 * @see {@link QModel.serialize} — applies `transformCase` during serialization when configured in `@Quick`
 *
 * @example
 * ```ts
 * CaseHelper.toCase('snake_case', 'firstName') // 'first_name'
 * CaseHelper.toCase('kebab-case', 'firstName') // 'first-name'
 * CaseHelper.toCase('PascalCase', 'my_field')  // 'MyField'
 * CaseHelper.toCase('camelCase',  'my-field')  // 'myField'
 * ```
 */
export class CaseHelper {
	/**
	 * Converts a string from any recognised naming convention to `format`.
	 *
	 * The conversion follows the normalisation pipeline described in the class-level
	 * JSDoc: split on camelCase/snake/kebab boundaries → lowercase tokens → re-join.
	 *
	 * @param format - Target case format: `'snake_case'`, `'camelCase'`, `'kebab-case'`, or `'PascalCase'`
	 * @param str - The source string to convert (any mixed case/separator style)
	 * @returns The string converted to `format`, or the original string unchanged
	 *   if `format` is unrecognised or `str` is falsy.
	 *
	 * @see {@link ICaseType} — accepted format string literals
	 * @see {@link QModel.serialize} — applies this when `transformCase` is set on `@Quick`
	 *
	 * @example
	 * ```ts
	 * CaseHelper.toCase('snake_case', 'firstName')  // 'first_name'
	 * CaseHelper.toCase('kebab-case', 'firstName')  // 'first-name'
	 * CaseHelper.toCase('PascalCase', 'my_field')   // 'MyField'
	 * CaseHelper.toCase('camelCase',  'my-field')   // 'myField'
	 * ```
	 */
	static toCase(format: ICaseType, str: string): string {
		if (!str) return str;

		// normalize to space separated first
		const words = str
			.replace(/([a-z])([A-Z])/g, '$1 $2') // split camelCase
			.replace(/[_-]+/g, ' ') // split snake_case/kebab-case
			.toLowerCase()
			.split(' ')
			.filter(Boolean);

		switch (format) {
			case 'snake_case':
				return words.join('_');
			case 'kebab-case':
				return words.join('-');
			case 'camelCase':
				return words
					.map((word, idx) =>
						idx === 0
							? word
							: word.charAt(0).toUpperCase() + word.slice(1)
					)
					.join('');
			case 'PascalCase':
				return words
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join('');
			default:
				return str;
		}
	}
}
