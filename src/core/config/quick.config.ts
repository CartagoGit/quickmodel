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
		 */
		strict?: boolean;

		/**
		 * Global limit for array length during deserialization to prevent DoS attacks.
		 * @default 10000
		 */
		maxArrayLength?: number;
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
