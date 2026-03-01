import type { IQAnyRecord } from '@/core/interfaces/model.interface';
import type { IQSerializationOptions } from '@/core/interfaces/serializer.interface';
import type {
	IQAliasedSerializedInterface,
	IQSerializedInterface,
	IQModelData,
} from '@/core/interfaces/serialization-types.interface';
import type {
	IQRulesResult,
	IQRulesAsyncOptions,
} from '@/core/decorators/qrule.decorator';
import type { IToFormDataOptions } from '@/core/helpers/form-data.helpers';
import type {
	IToReadableStreamMultipart,
	IToReadableStreamSingleField,
	IQMultipartStream,
} from '@/core/helpers/stream.helpers';
import type {
	IQValidationReport,
	IQValidateOptions,
	IQValidateResult,
} from '@/core/types/validation-types';

/**
 * Handle object returned by the `$qm` getter on every `QModel` instance.
 *
 * Groups **all** QuickModel infrastructure methods under a single `$qm`
 * namespace, freeing every other property name for user-defined domain data.
 * This solves the reserved-words collision problem introduced by v1.x, where
 * common field names such as `copy`, `validate`, `diff`, or `history` could
 * silently shadow built-in methods.
 *
 * In v1.x both APIs coexist (root-level methods are `@deprecated`).
 * In v2.0.0 the root-level methods will be removed.
 *
 * @typeParam TInterface  - The plain-data interface the model wraps.
 * @typeParam TAliasMap   - The `@QAlias` mapping for this model class.
 * @typeParam TModel      - The concrete model class (used for `copy` / `diff` / `equals`).
 *
 * @example
 * ```typescript
 * const user = new User({ name: 'Alice', age: 30 });
 *
 * user.$qm.patch({ age: 31 });
 * user.$qm.isDirty('age');         // true
 * const clone = user.$qm.copy({ name: 'Bob' });
 * const result = user.$qm.validate();
 * ```
 *
 * @see {@link QModel} — base class that exposes this handle via `$qm`
 */
export interface IQMHandle<
	TInterface extends IQAnyRecord,
	TAliasMap extends Record<string, string>,
	TModel,
> {
	// ── Serialization ──────────────────────────────────────────────────────────

	/**
	 * Serializes the model to a plain JSON-safe object.
	 *
	 * @see {@link QModel.serialize}
	 */
	serialize(
		options?: IQSerializationOptions
	): IQAliasedSerializedInterface<TInterface, TAliasMap>;

	/**
	 * Converts the model to a `FormData` instance.
	 *
	 * @see {@link QModel.toFormData}
	 */
	toFormData(options?: IToFormDataOptions): Promise<FormData>;

	/**
	 * Streams the model or a single binary field as a `ReadableStream`.
	 * Use `options.multipart: true` to send all fields as multipart/form-data.
	 * Use `options.field` to stream a single `Blob`/`File` field.
	 *
	 * @see {@link QModel.toReadableStream}
	 */
	toReadableStream(
		options: IToReadableStreamMultipart | IToReadableStreamSingleField
	): IQMultipartStream | ReadableStream<Uint8Array>;

	// ── Change tracking ────────────────────────────────────────────────────────

	/**
	 * Returns `true` if any field (or the specified field) has changed since construction.
	 *
	 * @param field - Optional field name; when omitted any change returns `true`.
	 * @see {@link QModel.isDirty}
	 */
	isDirty(field?: string): boolean;

	/**
	 * Returns an object containing only the fields that changed since construction.
	 * Ideal for PATCH requests.
	 *
	 * @see {@link QModel.getChanges}
	 */
	getChanges(): Partial<IQSerializedInterface<TInterface>>;

	// ── Mutation ───────────────────────────────────────────────────────────────

	/**
	 * Applies a partial update in place.
	 *
	 * @param data - Partial object with the fields to update.
	 * @see {@link QModel.patch}
	 */
	patch(data: Partial<IQModelData<TInterface>>): void;

	/**
	 * Returns a **new instance** that is a deep copy, optionally overriding fields.
	 *
	 * @param partial - Optional field overrides.
	 * @see {@link QModel.copy}
	 */
	copy(partial?: Partial<IQModelData<TInterface>>): TModel;

	// ── Comparison ─────────────────────────────────────────────────────────────

	/**
	 * Returns a field-by-field diff between this instance and `other`.
	 * Each key maps to `{ before, after }`.
	 *
	 * @see {@link QModel.diff}
	 */
	diff(other: TModel): Record<string, { before: unknown; after: unknown }>;

	/**
	 * Returns `true` if this instance is deeply equal to `other`.
	 *
	 * @see {@link QModel.equals}
	 */
	equals(other: TModel): boolean;

	// ── Validation ─────────────────────────────────────────────────────────────

	/**
	 * Returns `true` if all transformer-level integrity checks pass.
	 *
	 * @see {@link QModel.hasIntegrity}
	 */
	hasIntegrity(): boolean;

	/**
	 * Returns `true` if both integrity checks and all `@QRule` predicates pass.
	 *
	 * @see {@link QModel.isValid}
	 */
	isValid(): boolean;

	/**
	 * Async version of `isValid()`. Evaluates async `@QRule` predicates.
	 *
	 * @see {@link QModel.isValidAsync}
	 */
	isValidAsync(options?: IQRulesAsyncOptions): Promise<boolean>;

	/**
	 * Evaluates all `@QRule` predicates synchronously.
	 *
	 * @see {@link QModel.checkRules}
	 */
	checkRules(): IQRulesResult;

	/**
	 * Evaluates all `@QRule` predicates, including async ones.
	 *
	 * @see {@link QModel.checkRulesAsync}
	 */
	checkRulesAsync(options?: IQRulesAsyncOptions): Promise<IQRulesResult>;

	/**
	 * Returns a combined report from integrity checks and `@QRule` evaluation.
	 *
	 * @see {@link QModel.validationReport}
	 */
	validationReport(): IQValidationReport;

	/**
	 * Async version of `validationReport()`.
	 *
	 * @see {@link QModel.validationReportAsync}
	 */
	validationReportAsync(
		options?: IQRulesAsyncOptions
	): Promise<IQValidationReport>;

	/**
	 * Unified validation method — sync by default, async when `options.async: true`.
	 * Combines integrity checks and `@QRule` evaluation.
	 *
	 * @see {@link QModel.validate}
	 */
	validate(
		options?: IQValidateOptions
	): IQValidateResult | Promise<IQValidateResult>;
}
