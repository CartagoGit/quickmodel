/**
 * Supported case transformation types for `@Quick()` and `QConfig` settings.
 *
 * Used as the value for `in` / `out` properties of {@link IQCaseOptions}.
 *
 * @see {@link IQCaseOptions} for the full case-transformation config shape
 * @see {@link CaseHelper} for the converter implementation
 */
export type ICaseType =
	| 'snake_case'
	| 'camelCase'
	| 'kebab-case'
	| 'PascalCase';

/**
 * Configuration for automatic case transformation in `@Quick()` and `QConfig`.
 *
 * When set, QuickModel converts property names between the specified formats
 * on input (API → Model) and output (Model → API) automatically.
 *
 * @see {@link ICaseType} for the supported format literals
 * @see {@link CaseHelper.toCase} for the conversion implementation
 *
 * @example
 * ```typescript
 * // Accept snake_case from API, emit camelCase to client
 * QConfig.configure({
 *   defaults: { transformCase: { in: 'snake_case', out: 'camelCase' } }
 * });
 * ```
 */
export interface IQCaseOptions {
	/**
	 * Case format expected in the raw input data (API → Model direction).
	 *
	 * When set, QuickModel normalises incoming key names from the specified format
	 * to `camelCase` so they match the model's TypeScript property names.
	 *
	 * @default undefined — incoming keys are used as-is
	 */
	in?: ICaseType;

	/**
	 * Case format to apply in serialised output (Model → API direction).
	 *
	 * When set, QuickModel converts `camelCase` model property names to the
	 * specified format when calling `toJSON()` / `serialize()`.
	 *
	 * @default undefined — output keys are kept in `camelCase`
	 */
	out?: ICaseType;
}
