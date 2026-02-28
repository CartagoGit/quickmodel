import { QConfig } from '../config/quick.config';
import { QUICK_OPTIONS_KEY } from '../constants/metadata-keys';
import 'reflect-metadata';

/**
 * Internal structured logger for QuickModel debug output.
 *
 * @remarks
 * Respects two verbosity controls, checked in order:
 * 1. **Global flag** — `QConfig.get().defaults.enableDebugLogs` (cached per
 *    config reference to avoid repeated `QConfig.get()` calls in the hot path).
 * 2. **Per-model flag** — `@Quick({}, { enableDebugLogs: true })` on a specific
 *    class (read once via `Reflect.getMetadata` on the class constructor).
 *
 * All output is prefixed with `[QuickModel]` or `[QuickModel:ClassName]` so
 * consumers can easily filter logs in the browser/Node console.
 *
 * Callers should gate expensive string interpolation behind
 * `Logger.globalDebugEnabled` to avoid unnecessary allocations.
 *
 * @example
 * ```typescript
 * import { Logger } from '@/core/helpers/logger.helper';
 *
 * if (Logger.globalDebugEnabled) {
 *   Logger.debug('Transforming value', MyModel, rawValue);
 * }
 * Logger.warn('Unexpected null in required field', MyModel);
 * ```
 *
 * @internal
 */
export class Logger {
	/**
	 * Cached config reference for fast global-debug check.
	 * When the config reference changes (QConfig.reconfigure()), the cache is invalidated.
	 * @internal
	 */
	private static _cachedConfigRef: unknown = undefined;
	/** Cached value of defaults.enableDebugLogs for the last seen config. @internal */
	private static _cachedGlobalDebug = false;

	/**
	 * Fast inline check: true when global debug logging is enabled.
	 * Callers can gate expensive string-building behind this to avoid allocations in the hot path.
	 */
	public static get globalDebugEnabled(): boolean {
		const cfg = QConfig.get();
		if (cfg !== Logger._cachedConfigRef) {
			Logger._cachedConfigRef = cfg;
			Logger._cachedGlobalDebug = !!cfg.defaults?.enableDebugLogs;
		}
		return Logger._cachedGlobalDebug;
	}

	/**
	 * Logs a debug message if debug mode is enabled globally or for the specific context.
	 *
	 * @param message - The message to log
	 * @param context - Optional context object/class to check for local debug config
	 * @param data - Optional data to log
	 */
	static debug(message: string, context?: any, ...data: any[]): void {
		if (this.isEnabled(context)) {
			const prefix = context
				? `[QuickModel:${this.getName(context)}]`
				: '[QuickModel]';
			console.debug(`${prefix} ${message}`, ...data);
		}
	}

	/**
	 * Emits a warning to `console.warn`, always visible regardless of the
	 * `enableDebugLogs` flag.
	 *
	 * @param message - The warning message to log.
	 * @param context - Optional context object or class instance; its name is
	 * appended to the `[QuickModel:Name]` prefix.
	 * @param data - Additional values to pass to `console.warn`.
	 *
	 * @remarks
	 * Warnings are designed for recoverable anomalies such as deprecated API
	 * usage, unexpected `null` values in non-nullable fields, or version
	 * mismatches. Unlike `debug`, they cannot be silenced via config.
	 */
	static warn(message: string, context?: any, ...data: any[]): void {
		const prefix = context
			? `[QuickModel:${this.getName(context)}]`
			: '[QuickModel]';
		console.warn(`${prefix} WARN: ${message}`, ...data);
	}

	/**
	 * Checks if debug logging is enabled.
	 */
	private static isEnabled(context?: any): boolean {
		// 1. Check global config (cached per config reference to avoid QConfig.get() overhead)
		if (Logger.globalDebugEnabled) return true;

		// 2. Check local config if context is provided
		if (context) {
			// Context could be an instance or a constructor
			const target =
				typeof context === 'function' ? context : context.constructor;
			if (target) {
				const options = Reflect.getMetadata(QUICK_OPTIONS_KEY, target);
				if (options && options.enableDebugLogs) return true;
			}
		}

		return false;
	}

	/**
	 * Extracts a human-readable name string from a logging context.
	 *
	 * @param context - A string name, constructor function, or object with a constructor
	 * @returns Display name for the context, or `'Unknown'` if it cannot be determined
	 */
	private static getName(context: any): string {
		if (typeof context === 'string') return context;
		if (typeof context === 'function') return context.name;
		if (context && context.constructor) return context.constructor.name;
		return 'Unknown';
	}
}
