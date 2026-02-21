/**
 * Supported case transformation types.
 */
export type ICaseType =
	| 'snake_case'
	| 'camelCase'
	| 'kebab-case'
	| 'PascalCase';

/**
 * Configuration for case transformation.
 */
export interface IQCaseOptions {
	/**
	 * Case format to expect in the input (API -> Model).
	 * If specified, input keys will be converted to camelCase to match model properties.
	 */
	in?: ICaseType;

	/**
	 * Case format to generate in the output (Model -> API).
	 * If specified, model properties (camelCase) will be converted to this format in toJSON().
	 */
	out?: ICaseType;
}
