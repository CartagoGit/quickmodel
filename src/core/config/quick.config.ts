/**
 * Configuration interface for QuickModel global settings.
 * Defines the structure of the configuration object passed to `QConfig.configure()`.
 *
 * Use this interface to inspect available configuration options for:
 * - strict mode (validating payload properties)
 * - denial of service protection (array limits)
 *
 * @group Configuration
 *
 * @example
 * ```typescript
 * const config: IQConfig = {
 *   defaults: {
 *     strict: true,
 *     maxArrayLength: 5000
 *   }
 * };
 * QConfig.configure(config);
 * ```
 */
export interface IQConfig {
	/**
	 * Default options applied to all models decorated with `@Quick`.
	 * Can be overridden by individual `@Quick` decorators.
	 */
	defaults?: {
		/**
		 * If true, enables Strict Mode by default for all models.
		 * Strict Mode rejects properties in the payload that are not defined in the model.
		 * @deprecated Use `unknownPropertyPolicy: 'error'` instead.
		 */
		strict?: boolean;

		/**
		 * Defines behavior when encountering properties in the input payload that are not defined in the model.
		 * - `keep`: Preserves extra properties (Default).
		 * - `strip`: Silently removes extra properties.
		 * - `error`: Throws an error (Equivalent to `strict: true`).
		 */
		unknownPropertyPolicy?: 'keep' | 'strip' | 'error';

		/**
		 * Global limit for array length during deserialization to prevent DoS attacks.
		 * @default 10000
		 */
		maxArrayLength?: number;

		/**
		 * Limits the depth of nested objects during deserialization to prevent Stack Overflow attacks.
		 * @default 50
		 */
		maxRecursionDepth?: number;

		/**
		 * Automatically excludes properties starting with `_` or `$` from serialization (output),
		 * preventing internal state leakage.
		 * - `true`: Strips properties starting with `_` or `$`.
		 * - `string[]`: Strips properties starting with propertys in the custom array prefix
		 */
		stripInternalIdentifiers?: boolean | string[];

		/**
		 * String normalization options.
		 */
		normalization?: {
			/** If true, applies .trim() to all string values. Default: false. */
			trimStrings?: boolean;
			/** If true, converts empty strings "" to null. Default: false. */
			emptyStringAsNull?: boolean;
		};

		/**
		 * Type coercion strategy.
		 * - `strict`: Throws error on type mismatch (default).
		 * - `loose`: Attempts strict coercion (string "123" -> number 123, "true" -> true).
		 */
		coercionStrategy?: 'strict' | 'loose';

		/**
		 * If true, converts all `null` values to `undefined` during population.
		 * Useful for standardizing missing values.
		 * @default false
		 */
		nullToUndefined?: boolean;

		/**
		 * Serialization strategy for Date objects.
		 * - `iso`: Serializes to ISO 8601 string (default).
		 * - `timestamp`: Serializes to numeric timestamp (ms).
		 * - `native`: Keeps as Date object.
		 */
		dateStrategy?: 'iso' | 'timestamp' | 'native';

        /**
         * Case transformation strategy.
         */
        transformCase?: {
            in?: 'snake_case' | 'camelCase' | 'kebab-case' | 'PascalCase';
            out?: 'snake_case' | 'camelCase' | 'kebab-case' | 'PascalCase';
        };
	};
}

/**
 * Global configuration service for QuickModel.
 *
 * Allows setting default behaviors for the entire application,
 * such as enabling Strict Mode globally.
 */
export class QModelConfigService {
	private config: IQConfig = {};

	/**
	 * Updates the global configuration.
	 * Merges the provided config with the existing one.
	 *
	 * @param config - The configuration object to apply.
	 * @example
	 * ```typescript
	 * QConfig.configure({
	 *   defaults: {
	 *     strict: true
	 *   }
	 * });
	 * ```
	 */
	public configure(config: IQConfig): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Retrieves the current global configuration.
	 * Includes all active defaults.
	 *
	 * @returns The current configuration object.
	 */
	public get(): IQConfig {
		return this.config;
	}

	/**
	 * Resets the configuration to initial state.
	 * Useful for testing.
	 * @internal
	 */
	public reset(): void {
		this.config = {};
	}
}

/**
 * Global Singleton for QuickModel Configuration.
 *
 * `QConfig` provides a central point to configure the behavior of QuickModel across your entire application.
 * It allows you to set global defaults, security limits, and strict mode settings that apply to all models
 * unless explicitly overridden.
 *
 * **Key Features:**
 * - 🌍 **Global Defaults**: Set `strict: true` once for the whole app.
 * - 🛡️ **Security Limits**: Configure `maxArrayLength` to prevent DoS attacks.
 * - ⚙️ **Hot Reload**: Configuration can be updated at runtime (though usually done at startup).
 *
 * @group Configuration
 *
 * @example
 * **1. Enable Strict Mode Globally**
 * ```typescript
 * import { QConfig } from '@cartago-git/quickmodel';
 *
 * // Reject any property not defined in the model
 * QConfig.configure({
 *   defaults: {
 *     strict: true
 *   }
 * });
 * ```
 *
 * @example
 * **2. Configure Security Limits**
 * ```typescript
 * QConfig.configure({
 *   defaults: {
 *     maxArrayLength: 5000 // Limit nested arrays to 5k items
 *   }
 * });
 * ```
 */
export const QConfig = new QModelConfigService();
