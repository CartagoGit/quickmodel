/**
 * Global configuration for QuickModel.
 */
export interface IQuickModelConfig {
	/**
	 * Default options applied to all models decorated with @Quick.
	 * Can be overridden by individual @Quick decorators.
	 */
	defaults?: {
		/**
		 * If true, enables Strict Mode by default for all models.
		 * Strict Mode rejects properties in the payload that are not defined in the model.
		 */
		strict?: boolean;
	};
}

/**
 * Global configuration service for QuickModel.
 *
 * Allows setting default behaviors for the entire application,
 * such as enabling Strict Mode globally.
 */
class QuickModelConfigService {
	private config: IQuickModelConfig = {};

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
	public configure(config: IQuickModelConfig): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Retrieves the current global configuration.
	 * Includes all active defaults.
	 *
	 * @returns The current configuration object.
	 */
	public get(): IQuickModelConfig {
		return this.config;
	}
}

/**
 * Singleton instance of the global configuration service.
 * Use this to configure QuickModel behavior across your application.
 */
export const QConfig = new QuickModelConfigService();
