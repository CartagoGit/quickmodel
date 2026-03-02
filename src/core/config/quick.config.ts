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
 * @see {@link QConfig} — the singleton instance to call `configure()` on
 * @see {@link QModel} — `@Quick({}, advancedOptions)` overrides these defaults per model
 *
 * @example
 * ```typescript
 * const config: IQConfig = {
 *   defaults: {
 *     unknownPropertyPolicy: 'error',
 *     maxArrayLength: 5000
 *   }
 * };
 * QConfig.configure(config);
 * ```
 */
import type { IQSpoofMethod } from '@/core/types/form-data.type';

export interface IQConfig {
	/**
	 * Default options applied to all models decorated with `@Quick`.
	 * Can be overridden by individual `@Quick` decorators.
	 */
	defaults?: {
		/**
		 * Defines behavior when encountering properties in the input payload that are not defined in the model.
		 * - `strip`: Silently removes extra properties (Default).
		 * - `keep`: Preserves extra properties.
		 * - `error`: Throws an error.
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

		/**
		 * HTTP method to spoof via a `_method` field in `toFormData()` output.
		 *
		 * Global fallback — overridden by the decorator-level option and by the
		 * `toFormData({ spoofMethod })` call-time option.
		 *
		 * Supports all RFC 7231 verbs, WebDAV (RFC 4918), DeltaV (RFC 3253),
		 * and any custom string method.
		 *
		 * @see {@link IQSpoofMethod}
		 */
		spoofMethod?: IQSpoofMethod;

		/**
		 * Strategy for reporting integrity errors.
		 * - 'failFast': Throws on first error.
		 * - 'accumulate': Collects all errors (Default).
		 */
		integrityErrorStrategy?: 'failFast' | 'accumulate';

		/**
		 * When to run validation.
		 * - 'manual': Must be called explicitly (Default).
		 * - 'construction': Runs automatically on model creation.
		 */
		validationTrigger?: 'manual' | 'construction';

		/**
		 * Enables internal debug logging (legacy shorthand — equivalent to `trace.verbosity: 'debug'`).
		 * Prefer using `trace` for fine-grained control.
		 */
		enableDebugLogs?: boolean;

		/**
		 * Structured trace / observability configuration for QuickModel.
		 *
		 * Controls which lifecycle events emit console output and at what level of detail.
		 * All settings are **opt-in** — no overhead when omitted.
		 *
		 * @example
		 * ```typescript
		 * QConfig.configure({
		 *   defaults: {
		 *     trace: {
		 *       verbosity: 'verbose',
		 *       prefix: 'MyApp',
		 *       events: ['deserialize', 'rule-fail'],
		 *     }
		 *   }
		 * });
		 * ```
		 */
		trace?: {
			/**
			 * Prefix shown in all console trace messages.
			 *
			 * Useful when embedding QuickModel in a larger application and you want
			 * trace output tagged with your application name.
			 *
			 * @example
			 * ```typescript
			 * QConfig.configure({ defaults: { trace: { prefix: 'MyApp' } } });
			 * // → [MyApp][INFO][UserModel][construction] Instance created...
			 * ```
			 * @default 'QM'
			 */
			prefix?: string;

			/**
			 * Minimum log level to emit.
			 *
			 * - `'silent'`  — no output at all (default when `trace` is omitted)
			 * - `'error'`   — only hard failures (thrown errors)
			 * - `'warn'`    — recoverable anomalies + errors
			 * - `'info'`    — lifecycle milestones (construction, serialize, deserialize)
			 * - `'debug'`   — field-level transformation steps
			 * - `'verbose'` — everything including raw input/output values per field
			 *
			 * @default 'silent'
			 */
			verbosity?: IQTraceVerbosity;

			/**
			 * Filter which lifecycle events to trace.
			 * When omitted, all events matching `verbosity` are traced.
			 *
			 * Available events:
			 * - `'construction'`  — model instance created (`new MyModel(data)`)
			 * - `'serialize'`     — `model.$qSerialize()` called
			 * - `'deserialize'`   — data hydration per field
			 * - `'rule-pass'`     — a `@QRule` predicate returned `true`
			 * - `'rule-fail'`     — a `@QRule` predicate returned `false`
			 * - `'rule-error'`    — a `@QRule` predicate threw an exception
			 * - `'rule-timeout'`  — an async `@QRule` timed out
			 * - `'integrity'`     — `checkIntegrity()` result per field
			 * - `'transformer'`   — which transformer was applied to each field
			 * - `'config-change'` — `QConfig.configure()` called
			 */
			events?: IQTraceEvent[];

			/**
			 * Custom sink for trace entries.
			 * When provided, all trace records are forwarded here **instead of** `console`.
			 * Useful for structured logging, telemetry, or test assertions.
			 *
			 * @param entry - The structured trace record
			 */
			sink?: (entry: IQTraceEntry) => void;

			/**
			 * Whether to colorize console output using ANSI escape codes.
			 *
			 * Each log level gets a distinct color:
			 * - `error`   → red
			 * - `warn`    → bright yellow (orange-ish)
			 * - `info`    → light blue
			 * - `debug`   → purple / magenta
			 * - `verbose` → gray
			 *
			 * When omitted, colors are **auto-detected** from `process.stdout.isTTY`
			 * (enabled in interactive terminals, disabled in CI/pipes automatically).
			 *
			 * Set `false` to force plain text output, `true` to force colors even
			 * in non-TTY environments.
			 *
			 * @example
			 * ```typescript
			 * QConfig.configure({ defaults: { trace: { verbosity: 'info', colors: false } } });
			 * ```
			 */
			colors?: boolean;

			/**
			 * Controls which segments of the log line receive color when `colors` is active.
			 *
			 * The line format is: `[QM][WARN][UserModel:field][rule-fail] message`
			 *
			 * - `'level'` *(default)* — only `[LEVEL]` is colored:
			 *   `[QM]`**`[WARN]`**`[UserModel][rule-fail]`
			 * - `'line'`  — the full prefix in one color block:
			 *   **`[QM][WARN][UserModel][rule-fail]`**
			 * - `IQTraceColorizeSegment[]` — pick exact segments:
			 *   `['level', 'event']` → `[QM]`**`[WARN]`**`[UserModel]`**`[rule-fail]`**
			 *
			 * @default 'level'
			 * @example
			 * ```typescript
			 * QConfig.configure({ defaults: { trace: { verbosity: 'info', colorize: ['level', 'event'] } } });
			 * ```
			 */
			colorize?: IQTraceColorize;
		};

		/**
		 * If true, undefined/null values are exposed in serialized output.
		 * @default false
		 */
		exposeUnsetFields?: boolean;

		/**
		 * Performance optimization settings.
		 */
		performance?: {
			/**
			 * Disables redundant runtime safety checks (like `Object.freeze`) when data source is trusted.
			 * Use with caution.
			 * @default false
			 */
			disableSafetyChecks?: boolean;
		};
	};

	/**
	 * Internationalization (i18n) settings for validation messages.
	 *
	 * When a `resolver` is provided, every validation error message emitted by
	 * `checkRules()` or `checkRulesAsync()` is passed through it before being
	 * returned to the caller. This allows keys like `'validation.name.minLength'`
	 * to be translated to the user's active locale.
	 *
	 * @example
	 * ```typescript
	 * QConfig.configure({
	 *   i18n: {
	 *     resolver: (key) => t(key), // pass to your i18n library
	 *   },
	 * });
	 * ```
	 */
	i18n?: {
		/**
		 * A function that receives a message key (or raw message string) and returns
		 * the translated string for the active locale.
		 *
		 * Called only when a rule **fails** — never called for passing rules.
		 *
		 * @param key - The raw message string or i18n key defined in `@QRule()`.
		 * @returns The translated string (or the original key as fallback).
		 */
		resolver?: (key: string) => string;
	};

	/**
	 * Global history trail defaults.
	 *
	 * Applies to **every** model that does not provide its own `@Quick({}, { history })` config.
	 * Class-level config takes precedence over this global default.
	 *
	 * @example
	 * ```typescript
	 * QConfig.configure({
	 *   history: { enabled: false, maxEntries: 500 },
	 * });
	 * ```
	 */
	history?: {
		/** Whether history recording is active globally. Default: `false`. */
		enabled?: boolean;
		/** Maximum number of history entries to retain per instance. Default: `500`. */
		maxEntries?: number;
		/**
		 * Recording granularity: `'operation'` (one entry per call, default)
		 * or `'field'` (one entry per changed field).
		 */
		recordMode?: 'operation' | 'field';
	};

	/**
	 * Global audit trail defaults.
	 *
	 * Applies to **every** model that does not provide its own `@Quick({}, { audit })` config.
	 * Class-level config takes precedence over this global default.
	 *
	 * @example
	 * ```typescript
	 * QConfig.configure({
	 *   audit: { enabled: false, maxEntries: 500 },
	 * });
	 * ```
	 */
	audit?: {
		/** Whether audit recording is active globally. Default: `false`. */
		enabled?: boolean;
		/** Maximum number of audit entries to retain per instance. Default: `500`. */
		maxEntries?: number;
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Trace types (declared outside IQConfig so they can be imported independently)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Controls which parts of the console log line are colorized.
 *
/**
 * Individual segments of a console log line that can be colorized independently.
 *
 * The line format is: `[prefix][LEVEL][model:field][event]`
 *
 * - `'prefix'` — the app-name tag: `[QM]`
 * - `'level'`  — the verbosity tag:  `[WARN]`
 * - `'model'`  — the model/field tag: `[UserModel:amount]`
 * - `'event'`  — the lifecycle tag:  `[rule-fail]`
 *
 * @group Configuration
 * @see {@link IQTraceColorize}
 */
export type IQTraceColorizeSegment = 'prefix' | 'level' | 'model' | 'event';

/**
 * Controls which parts of the console log line are colorized.
 *
 * - `'level'` *(default)* — shorthand: only the `[LEVEL]` tag is colored.
 * - `'line'`  — shorthand: the entire prefix (`[prefix][LEVEL][model][event]`) is colored in one block.
 * - `IQTraceColorizeSegment[]` — explicit list of segments to colorize individually:
 *   e.g. `['level', 'event']` colors `[WARN]` and `[rule-fail]` but leaves `[QM]` and `[UserModel]` plain.
 *
 * @group Configuration
 * @see {@link IQTraceColorizeSegment} — individual segment names
 * @see {@link IQConfig} — configure via `defaults.trace.colorize`
 */
export type IQTraceColorize = 'level' | 'line' | IQTraceColorizeSegment[];

/**
 * Verbosity levels for the QuickModel trace system (ordered from least to most verbose).
 *
 * @group Configuration
 * @see {@link IQTraceEvent} — events that can be emitted at each verbosity level
 * @see {@link IQConfig} — configure `defaults.trace.verbosity` to activate tracing
 * @see {@link TraceLogger} — internal service that emits trace records
 */
export type IQTraceVerbosity =
	| 'silent'
	| 'error'
	| 'warn'
	| 'success'
	| 'info'
	| 'debug'
	| 'verbose';

/**
 * Lifecycle events that can be traced by the QuickModel trace system.
 *
 * @group Configuration
 * @see {@link IQTraceVerbosity} — minimum verbosity level required to emit each event
 * @see {@link IQTraceEntry} — structured trace record produced for each event
 * @see {@link IQConfig} — configure `defaults.trace.events` to filter events
 */
export type IQTraceEvent =
	| 'construction'
	| 'serialize'
	| 'deserialize'
	| 'rule-pass'
	| 'rule-fail'
	| 'rule-error'
	| 'rule-timeout'
	| 'integrity'
	| 'transformer'
	| 'config-change';

/**
 * A single structured trace record emitted by the QuickModel trace system.
 *
 * @group Configuration
 * @see {@link IQTraceVerbosity} — controls when records are emitted
 * @see {@link IQTraceEvent} — event field values
 * @see {@link TraceLogger} — internal service that builds and emits these records
 * @see {@link IQConfig} — configure `defaults.trace.sink` to receive these records
 */
export interface IQTraceEntry {
	/** UTC timestamp (ms since epoch). */
	timestamp: number;
	/** Log level of this entry. */
	level: Exclude<IQTraceVerbosity, 'silent'>;
	/** Lifecycle event that produced this entry. */
	event: IQTraceEvent;
	/** Model class name (e.g. `'UserModel'`). */
	model: string;
	/** Property name when the event is field-scoped, `undefined` otherwise. */
	field?: string;
	/** Human-readable description of what happened. */
	message: string;
	/** Raw input value (only present at `'verbose'` verbosity, field-scoped events). */
	inputValue?: unknown;
	/** Transformed output value (only present at `'verbose'` verbosity, field-scoped events). */
	outputValue?: unknown;
	/** Name of the transformer applied (only for `'transformer'` events). */
	transformer?: string;
	/** Rule message when the event is rule-scoped. */
	ruleMessage?: string;
	/** Additional arbitrary metadata. */
	meta?: Record<string, unknown>;
}

/**
 * Global configuration service for QuickModel.
 *
 * Allows setting default behaviors for the entire application,
 * such as enabling Strict Mode globally.
 *
 * @see {@link QConfig} — singleton instance (use this instead of instantiating directly)
 * @see {@link IQConfig} — shape of the configuration object
 * @see {@link QModel} — per-model `@Quick({}, advancedOptions)` overrides global defaults
 */
export class QModelConfigService {
	/** @internal Current global configuration. Modified by `configure()` and reset by `reset()`. */
	private config: IQConfig = {};

	/**
	 * Updates the global configuration.
	 * Merges the provided config with the existing one.
	 *
	 * @param config - The configuration object to apply.
	 *
	 * @see {@link QModelConfigService.get} — retrieve the active config
	 * @see {@link QModelConfigService.reset} — clear all configuration
	 *
	 * @example
	 * ```typescript
	 * QConfig.configure({
	 *   defaults: {
	 *     unknownPropertyPolicy: 'error'
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
	 * @returns The current `IQConfig` object (same reference held internally — do not mutate).
	 *
	 * @see {@link QModelConfigService.configure} — update the configuration
	 * @see IQConfig
	 */
	public get(): IQConfig {
		return this.config;
	}

	/**
	 * Resets the configuration to the initial empty state.
	 *
	 * Clears all defaults previously set via `configure()`. Useful in unit tests
	 * to prevent configuration leakage between test cases.
	 *
	 * @see {@link QModelConfigService.configure} — set configuration
	 * @internal
	 * @see QConfig
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
 * - 🌍 **Global Defaults**: Set `unknownPropertyPolicy: 'error'` once for the whole app.
 * - 🛡️ **Security Limits**: Configure `maxArrayLength` to prevent DoS attacks.
 * - ⚙️ **Hot Reload**: Configuration can be updated at runtime (though usually done at startup).
 *
 * @group Configuration
 *
 * @example
 * **1. Enable Strict Mode Globally**
 * ```typescript
 * // Reject any property not defined in the model
 * QConfig.configure({
 *   defaults: {
 *     unknownPropertyPolicy: 'error'
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
 *
 * @see {@link QModelConfigService} — the class this singleton is an instance of
 * @see {@link QModelConfigService.configure} — configure global defaults on this instance
 */
export const QConfig = new QModelConfigService();
