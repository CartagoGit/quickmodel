import { QConfig } from '../config/quick.config';
import { QUICK_OPTIONS_KEY } from '../constants/metadata-keys';
import type {
	IQTraceEntry,
	IQTraceEvent,
	IQTraceVerbosity,
} from '../config/quick.config';
import 'reflect-metadata';

// ─────────────────────────────────────────────────────────────────────────────
// Verbosity ordering
// ─────────────────────────────────────────────────────────────────────────────

/** @internal Numeric weight for each verbosity level (higher = more verbose). */
const VERBOSITY_WEIGHT: Record<IQTraceVerbosity, number> = {
	silent: 0,
	error: 1,
	warn: 2,
	info: 3,
	debug: 4,
	verbose: 5,
};

// ─────────────────────────────────────────────────────────────────────────────
// Console adapters per level
// ─────────────────────────────────────────────────────────────────────────────

type IConsoleLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

const CONSOLE_FN: Record<IConsoleLevel, (...args: unknown[]) => void> = {
	error: (...args) => console.error(...args),
	warn: (...args) => console.warn(...args),
	info: (...args) => console.info(...args),
	debug: (...args) => console.debug(...args),
	verbose: (...args) => console.debug(...args),
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-model decorator options shape (minimal — avoids circular import)
// ─────────────────────────────────────────────────────────────────────────────

interface IQPerModelTraceOptions {
	trace?: {
		verbosity?: IQTraceVerbosity;
		events?: IQTraceEvent[];
		sink?: (entry: IQTraceEntry) => void;
	};
	enableDebugLogs?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parameter object interfaces for static trace methods
// ─────────────────────────────────────────────────────────────────────────────

/** @internal Parameters for {@link TraceLogger.traceDeserializeField}. */
export interface ITraceDeserializeFieldParams {
	modelName: string;
	modelCtor: Function;
	field: string;
	inputValue: unknown;
	outputValue: unknown;
}

/** @internal Parameters for {@link TraceLogger.traceTransformer}. */
export interface ITraceTransformerParams {
	modelName: string;
	modelCtor: Function;
	field: string;
	transformerName: string;
	inputValue: unknown;
	outputValue: unknown;
}

/** @internal Parameters for {@link TraceLogger.traceRule}. */
export interface ITraceRuleParams {
	event: 'rule-pass' | 'rule-fail' | 'rule-error' | 'rule-timeout';
	modelName: string;
	modelCtor: Function | undefined;
	field: string;
	ruleMessage: string;
	value?: unknown;
	err?: unknown;
	/**
	 * Per-rule trace override from `@QRule(..., ..., { trace: ... })`.
	 * Highest priority in the resolution chain.
	 */
	ruleTrace?: {
		verbosity?: IQTraceVerbosity;
		events?: IQTraceEvent[];
		sink?: (entry: IQTraceEntry) => void;
	};
}

/** @internal Parameters for {@link TraceLogger.traceIntegrity}. */
export interface ITraceIntegrityParams {
	modelName: string;
	modelCtor: Function;
	field: string;
	isValid: boolean;
	errorMsg?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TraceLogger — public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structured trace / observability logger for QuickModel.
 *
 * Resolution order for verbosity & events (most-specific wins):
 * 1. Per-model @Quick({}, { trace: { ... } }) options
 * 2. Global QConfig.configure({ defaults: { trace: { ... } } })
 * 3. Legacy enableDebugLogs flag (mapped to verbosity: 'debug')
 * 4. Default: 'silent' — no output
 *
 * @see {@link Logger} — simpler debug logger without structured trace events
 * @see {@link QConfig} — global configuration including `trace` settings
 * @see {@link IQTraceEntry} — shape of each emitted trace entry
 * @internal
 */
export class TraceLogger {
	// ── cache ──────────────────────────────────────────────────────────────────

	/** @internal Last QConfig reference seen — invalidates cache when changed. */
	private static _configRef: unknown = undefined;
	/** @internal Cached global verbosity level. */
	private static _globalVerbosity: IQTraceVerbosity = 'silent';
	/** @internal Cached global event filter (undefined = all events). */
	private static _globalEvents: IQTraceEvent[] | undefined = undefined;
	/** @internal Cached global sink function. */
	private static _globalSink: ((entry: IQTraceEntry) => void) | undefined =
		undefined;
	/** @internal Cached log prefix (default: 'QuickModel', configurable via `trace.prefix`). */
	private static _globalPrefix: string = 'QM';

	// ── cache refresh ──────────────────────────────────────────────────────────

	/** @internal Guard to prevent re-entrant _refreshCache() calls. */
	private static _inRefresh = false;

	/** @internal Refresh cached globals if QConfig reference changed. */
	private static _refreshCache(): void {
		if (TraceLogger._inRefresh) return;
		const cfg = QConfig.get();
		if (cfg === TraceLogger._configRef) return;

		const prevRef = TraceLogger._configRef;
		TraceLogger._configRef = cfg;
		const traceCfg = cfg.defaults?.trace;

		if (traceCfg?.verbosity) {
			TraceLogger._globalVerbosity = traceCfg.verbosity;
		} else if (cfg.defaults?.enableDebugLogs) {
			TraceLogger._globalVerbosity = 'debug';
		} else {
			TraceLogger._globalVerbosity = 'silent';
		}

		TraceLogger._globalEvents = traceCfg?.events;
		TraceLogger._globalSink = traceCfg?.sink;
		TraceLogger._globalPrefix = traceCfg?.prefix ?? 'QM';

		// Emit config-change only after a real re-configure (not initial load).
		if (prevRef !== undefined) {
			TraceLogger._inRefresh = true;
			try {
				TraceLogger.traceConfigChange('QConfig updated');
			} finally {
				TraceLogger._inRefresh = false;
			}
		}
	}

	// ── resolution helpers ─────────────────────────────────────────────────────

	/**
	 * Resolves the effective verbosity for a given model class.
	 * Per-model options override globals.
	 * @see {@link TraceLogger.isEnabled} — uses resolved verbosity to check if a level is active
	 * @see {@link QConfig} — source of global trace verbosity
	 */
	public static resolveVerbosity(modelCtor?: Function): IQTraceVerbosity {
		TraceLogger._refreshCache();

		if (modelCtor) {
			const perModel = Reflect.getMetadata(
				QUICK_OPTIONS_KEY,
				modelCtor
			) as IQPerModelTraceOptions | undefined;

			if (perModel?.trace?.verbosity) return perModel.trace.verbosity;
			if (perModel?.enableDebugLogs) return 'debug';
		}

		return TraceLogger._globalVerbosity;
	}

	/**
	 * Returns true when at least one of the specified levels would be emitted.
	 * @see {@link TraceLogger.resolveVerbosity} — determines the effective verbosity level
	 * @see {@link TraceLogger.emit} — respects this check before writing output
	 */
	public static isEnabled(
		level: Exclude<IQTraceVerbosity, 'silent'>,
		modelCtor?: Function
	): boolean {
		const effective = TraceLogger.resolveVerbosity(modelCtor);
		if (effective === 'silent') return false;
		return VERBOSITY_WEIGHT[level] <= VERBOSITY_WEIGHT[effective];
	}

	/** @internal */
	private static _isEventAllowed(
		event: IQTraceEvent,
		modelCtor?: Function
	): boolean {
		if (modelCtor) {
			const perModel = Reflect.getMetadata(
				QUICK_OPTIONS_KEY,
				modelCtor
			) as IQPerModelTraceOptions | undefined;
			if (perModel?.trace?.events) {
				return perModel.trace.events.includes(event);
			}
		}
		if (TraceLogger._globalEvents) {
			return TraceLogger._globalEvents.includes(event);
		}
		return true;
	}

	// ── emit ───────────────────────────────────────────────────────────────────

	/**
	 * Emits a structured trace entry.
	 *
	 * Resolution order (highest priority first):
	 * 1. `ruleOverride` — from `@QRule(..., ..., { trace: ... })`
	 * 2. Per-model — from `@Quick({}, { trace: ... })`
	 * 3. Global — from `QConfig.configure({ defaults: { trace: ... } })`
	 * @see {@link TraceLogger.isEnabled} — guards emission by verbosity
	 * @see {@link IQTraceEntry} — shape of the emitted entry
	 * @see {@link QConfig} — global trace sink and verbosity configuration
	 */
	public static emit(
		params: Omit<IQTraceEntry, 'timestamp'>,
		modelCtor?: Function,
		ruleOverride?: {
			verbosity?: IQTraceVerbosity;
			events?: IQTraceEvent[];
			sink?: (entry: IQTraceEntry) => void;
		}
	): void {
		TraceLogger._refreshCache();

		// 1. Verbosity: per-rule > per-model > global
		if (ruleOverride?.verbosity !== undefined) {
			if (ruleOverride.verbosity === 'silent') return;
			if (
				VERBOSITY_WEIGHT[params.level as IQTraceVerbosity] >
				VERBOSITY_WEIGHT[ruleOverride.verbosity]
			)
				return;
		} else if (!TraceLogger.isEnabled(params.level, modelCtor)) {
			return;
		}

		// 2. Event filter: per-rule > per-model > global
		if (ruleOverride?.events !== undefined) {
			if (!ruleOverride.events.includes(params.event)) return;
		} else if (!TraceLogger._isEventAllowed(params.event, modelCtor)) {
			return;
		}

		const entry: IQTraceEntry = { ...params, timestamp: Date.now() };

		const perModelSink = modelCtor
			? (
					Reflect.getMetadata(QUICK_OPTIONS_KEY, modelCtor) as
						| IQPerModelTraceOptions
						| undefined
				)?.trace?.sink
			: undefined;

		// 3. Sink: per-rule > per-model > global
		const sink =
			ruleOverride?.sink ?? perModelSink ?? TraceLogger._globalSink;

		if (sink) {
			sink(entry);
			return;
		}

		const modelPart = entry.field
			? `${entry.model}:${entry.field}`
			: entry.model;
		const prefix = `[${TraceLogger._globalPrefix}][${params.level.toUpperCase()}][${modelPart}][${entry.event}]`;
		const consoleFn =
			CONSOLE_FN[params.level as IConsoleLevel] ?? console.debug;

		if (
			params.level === 'verbose' &&
			(entry.inputValue !== undefined || entry.outputValue !== undefined)
		) {
			consoleFn(prefix, entry.message, {
				in: entry.inputValue,
				out: entry.outputValue,
				...(entry.transformer
					? { transformer: entry.transformer }
					: {}),
				...(entry.ruleMessage ? { rule: entry.ruleMessage } : {}),
				...(entry.meta ?? {}),
			});
		} else {
			const extras: string[] = [];
			if (entry.transformer)
				extras.push(`transformer=${entry.transformer}`);
			if (entry.ruleMessage) extras.push(`rule="${entry.ruleMessage}"`);
			consoleFn(prefix, entry.message, ...(extras.length ? extras : []));
		}
	}

	// ── convenience factories ─────────────────────────────────────────────────

	/**
	 * Emits a construction lifecycle trace.
	 * @see {@link TraceLogger.emit} — internal emitter used by this helper
	 * @see {@link TraceLogger.traceSerialize} — sibling trace for serialization
	 */
	public static traceConstruction(
		modelName: string,
		modelCtor: Function,
		fieldCount: number
	): void {
		TraceLogger.emit(
			{
				level: 'info',
				event: 'construction',
				model: modelName,
				message: `Instance created (${fieldCount} fields populated)`,
				meta: { fieldCount },
			},
			modelCtor
		);
	}

	/**
	 * Emits a serialize lifecycle trace.
	 * @see {@link TraceLogger.emit} — internal emitter used by this helper
	 * @see {@link TraceLogger.traceConstruction} — sibling trace for construction
	 */
	public static traceSerialize(modelName: string, modelCtor: Function): void {
		TraceLogger.emit(
			{
				level: 'info',
				event: 'serialize',
				model: modelName,
				message: 'Serialization started',
			},
			modelCtor
		);
	}

	/**
	 * Emits a deserialize field trace.
	 * @see {@link ITraceDeserializeFieldParams} — shape of the params object
	 * @see {@link TraceLogger.emit} — internal emitter used by this helper
	 */
	public static traceDeserializeField(
		params: ITraceDeserializeFieldParams
	): void {
		const { modelName, modelCtor, field, inputValue, outputValue } = params;
		TraceLogger.emit(
			{
				level: 'verbose',
				event: 'deserialize',
				model: modelName,
				field,
				message: 'Field deserialized',
				inputValue,
				outputValue,
			},
			modelCtor
		);
	}

	/**
	 * Emits a transformer trace.
	 * @see {@link ITraceTransformerParams} — shape of the params object
	 * @see {@link TraceLogger.emit} — internal emitter used by this helper
	 */
	public static traceTransformer(params: ITraceTransformerParams): void {
		const {
			modelName,
			modelCtor,
			field,
			transformerName,
			inputValue,
			outputValue,
		} = params;
		TraceLogger.emit(
			{
				level: 'debug',
				event: 'transformer',
				model: modelName,
				field,
				transformer: transformerName,
				message: `Applied transformer "${transformerName}"`,
				inputValue,
				outputValue,
			},
			modelCtor
		);
	}

	/**
	 * Emits a rule lifecycle trace.
	 * @see {@link ITraceRuleParams} — shape of the params object
	 * @see {@link TraceLogger.emit} — internal emitter used by this helper
	 * @see {@link TraceLogger.traceIntegrity} — sibling trace for integrity checks
	 */
	public static traceRule(params: ITraceRuleParams): void {
		const { event, modelName, modelCtor, field, ruleMessage, value, err } =
			params;
		const level: Exclude<IQTraceVerbosity, 'silent'> =
			event === 'rule-pass'
				? 'verbose'
				: event === 'rule-fail'
					? 'warn'
					: 'error';

		const message =
			event === 'rule-pass'
				? `Rule passed on "${field}"`
				: event === 'rule-fail'
					? `Rule failed on "${field}": ${ruleMessage}`
					: event === 'rule-error'
						? `Rule threw on "${field}": ${String(err)}`
						: /* rule-timeout */ `Rule timed out on "${field}"`;

		TraceLogger.emit(
			{
				level,
				event,
				model: modelName,
				field,
				ruleMessage,
				message,
				...(value !== undefined ? { inputValue: value } : {}),
				...(err !== undefined ? { meta: { error: String(err) } } : {}),
			},
			modelCtor,
			params.ruleTrace
		);
	}

	/**
	 * Emits an integrity trace.
	 * @see {@link ITraceIntegrityParams} — shape of the params object
	 * @see {@link TraceLogger.traceRule} — sibling trace for rule evaluation
	 * @see {@link IntegrityService} — calls this trace when checking field integrity
	 */
	public static traceIntegrity(params: ITraceIntegrityParams): void {
		const { modelName, modelCtor, field, isValid, errorMsg } = params;
		TraceLogger.emit(
			{
				level: isValid ? 'debug' : 'warn',
				event: 'integrity',
				model: modelName,
				field,
				message: isValid
					? `Integrity OK on "${field}"`
					: `Integrity FAILED on "${field}": ${errorMsg ?? ''}`,
				...(errorMsg ? { meta: { error: errorMsg } } : {}),
			},
			modelCtor
		);
	}

	/**
	 * Emits a config-change trace. Always global.
	 * @see {@link TraceLogger.emit} — routed through the shared emitter
	 * @see {@link QConfig} — triggers this event on reconfiguration
	 */
	public static traceConfigChange(summary: string): void {
		TraceLogger._refreshCache();

		if (!TraceLogger.isEnabled('info')) return;
		if (!TraceLogger._isEventAllowed('config-change')) return;

		const entry: IQTraceEntry = {
			timestamp: Date.now(),
			level: 'info',
			event: 'config-change',
			model: 'QConfig',
			message: summary,
		};

		if (TraceLogger._globalSink) {
			TraceLogger._globalSink(entry);
			return;
		}

		console.info(
			`[${TraceLogger._globalPrefix}][INFO][QConfig][config-change]`,
			summary
		);
	}

	/** @internal Legacy Logger.debug() bridge. */
	public static legacyDebug(
		message: string,
		modelCtor?: Function,
		...data: unknown[]
	): void {
		if (!TraceLogger.isEnabled('debug', modelCtor)) return;

		const modelName =
			typeof modelCtor === 'function' ? modelCtor.name : 'Unknown';

		TraceLogger.emit(
			{
				level: 'debug',
				event: 'deserialize',
				model: modelName,
				message,
				...(data.length ? { meta: { extra: data } } : {}),
			},
			typeof modelCtor === 'function' ? modelCtor : undefined
		);
	}
}
