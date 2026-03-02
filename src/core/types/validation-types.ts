import type { IQIntegrityResult } from '@/core/interfaces/transformer.interface';
import type { IQRulesResult } from '@/core/decorators/qrule.decorator';

/**
 * Combined validation report returned by {@link QModel.$qValidationReport} and
 * {@link QModel.$qValidationReportAsync}.
 *
 * @see {@link QModel.$qValidationReport} — the method that produces this report
 * @see {@link IQRulesResult} — the `rules` field type
 */
export interface IQValidationReport {
	/**
	 * `true` when both integrity checks and all `@QRule` predicates pass.
	 * Equivalent to `$qCheckIntegrity().length === 0 && $qCheckRules().valid`.
	 */
	valid: boolean;
	/** Results from transformer-level integrity checks. Empty array = all pass. */
	integrity: IQIntegrityResult[];
	/** Results from `@QRule` business-logic predicates. */
	rules: IQRulesResult;
}

/**
 * Options accepted by {@link QModel.$qValidate}.
 *
 * @see {@link QModel.$qValidate} — unified validation method
 */
export interface IQValidateOptions {
	/**
	 * When `true`, runs async predicates via `$qCheckRulesAsync()` and returns a
	 * `Promise<IQValidateResult>`. When omitted or `false`, returns `IQValidateResult`
	 * synchronously.
	 */
	async?: boolean;
	/**
	 * When provided, only rules associated with these groups (via `@QGroup`) are
	 * evaluated. Combines results from all listed groups.
	 */
	groups?: string[];
	/**
	 * Maximum time (ms) each async predicate may take before being marked as
	 * timed out. Only meaningful when `async: true`.
	 */
	timeoutMs?: number;
	/**
	 * Custom error message used when a predicate exceeds `timeoutMs`.
	 * Only meaningful when `async: true` and `timeoutMs` is set.
	 */
	timeoutMessage?: string;
	/**
	 * Execution mode for async predicates.
	 * - `'parallel'` *(default)* — all predicates run concurrently.
	 * - `'serial'` — predicates run sequentially in field-declaration order.
	 * Only meaningful when `async: true`.
	 */
	mode?: 'parallel' | 'serial';
}

/**
 * Result returned by {@link QModel.validate}.
 *
 * Has the same shape as {@link IQValidationReport}.
 *
 * @see {@link IQValidationReport} — identical structure
 */
export type IQValidateResult = IQValidationReport;
