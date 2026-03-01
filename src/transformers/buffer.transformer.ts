// @quickmodel-rule-ignore: no-console — console.log appears only in @example JSDoc blocks
// to demonstrate usage; no actual console.log calls in production code.
/**
 * @fileoverview Buffer transformers for QuickModel.
 *
 * Handles round-trip serialization/deserialization of binary data types:
 *
 * | Class                       | Runtime type  | JSON representation |
 * |-----------------------------|---------------|---------------------|
 * | `ArrayBufferTransformer`    | `ArrayBuffer` | `number[]`          |
 * | `DataViewTransformer`       | `DataView`    | `number[]`          |
 * | `SharedArrayBufferTransformer` | `SharedArrayBuffer` | `number[]` |
 *
 * @see {@link QModel.serialize} — triggers these transformers for binary-buffer fields
 * @see {@link Quick} — use `@Quick({ field: ArrayBuffer })` / `{ field: DataView }` to activate
 * @module transformers/buffer
 */
import { BaseTransformer } from '../core/bases/base-transformer';
import { QModelError } from '../core/errors/quickmodel.error';
import {
	IQTransformContext,
	IQIntegrityContext,
	IQIntegrityResult,
	IQIntegrityChecker,
} from '../core/interfaces/transformer.interface';

/**
 * Transformer for ArrayBuffer: converts between byte array and ArrayBuffer.
 *
 * **Serialization**: `ArrayBuffer` → `number[]` (byte array)
 * **Deserialization**: `number[]` → `ArrayBuffer`
 *
 * @remarks
 * Each number in the array represents a single byte (0-255).
 * Values outside this range will be clamped.
 *
 * @example
 * ```typescript
 * @Quick({ data: ArrayBuffer })
 * class FileModel extends QuickModel<IFileModel> {
 *   declare data: ArrayBuffer;
 * }
 *
 * const file = new FileModel({
 *   data: [72, 101, 108, 108, 111] // "Hello" in bytes
 * });
 * file.data instanceof ArrayBuffer; // → true
 * file.data.byteLength; // → 5
 *
 * const json = file.$qm.serialize();
 * json.data; // → [72, 101, 108, 108, 111]
 * ```
 *
 * @see {@link BaseTransformer} — abstract base this class extends
 * @see {@link DataViewTransformer} — related transformer for DataView
 * @see {@link QTransformerRegistry} — register custom transformers alongside this one
 */
export class ArrayBufferTransformer
	extends BaseTransformer<number[], ArrayBuffer>
	implements IQIntegrityChecker
{
	/**
	 * Converts a byte array to ArrayBuffer.
	 *
	 * @param value - The value to convert (number array or ArrayBuffer)
	 * @param propertyKey - The property name (for error messages)
	 * @param className - The class name (for error messages)
	 * @returns An ArrayBuffer instance
	 * @throws {Error} If the value is not an array or ArrayBuffer
	 */
	deserialize(
		value: number[] | ArrayBuffer | null | undefined,
		propertyKey: string,
		className: string,
		context?: IQTransformContext
	): ArrayBuffer | null {
		if (value === null || value === undefined) return null;

		if (value instanceof ArrayBuffer) {
			return value;
		}

		if (!Array.isArray(value)) {
			throw new QModelError(
				`${className}.${propertyKey}: Expected array for ArrayBuffer, got ${typeof value}`,
				{
					className,
					propertyKey,
					value,
					expectedType: 'number[] | ArrayBuffer',
				}
			);
		}

		// SECURITY: Prevent Memory Exhaustion
		// Allow overriding maxBytes via transformerOptions
		const maxBytes = (
			context?.metadata?.transformerOptions as { maxBytes?: number }
		)?.maxBytes;
		const MAX_ITEMS = maxBytes || 1_000_000;
		if (value.length > MAX_ITEMS) {
			throw new QModelError(
				`${className}.${propertyKey}: ArrayBuffer input too large (> ${MAX_ITEMS} bytes).`,
				{
					className,
					propertyKey,
					value: 'TRUNCATED',
					expectedType: `Small ArrayBuffer (< ${MAX_ITEMS} bytes)`,
				}
			);
		}

		const buffer = new ArrayBuffer(value.length);
		const view = new Uint8Array(buffer);
		view.set(value);
		return buffer;
	}

	/**
	 * Converts an ArrayBuffer to byte array.
	 *
	 * @param value - The ArrayBuffer to serialize
	 * @returns Array of bytes (0-255)
	 */
	serialize(value: ArrayBuffer): number[] {
		return Array.from(new Uint8Array(value));
	}

	/**
	 * Validates that `value` is a valid `ArrayBuffer` representation.
	 *
	 * Accepts: an `ArrayBuffer` instance, or a plain `number[]` (byte array).
	 *
	 * @param value   - Runtime value to validate.
	 * @param context - Context providing `className` and `propertyKey` for error messages.
	 * @returns `{ isValid: true }` for `ArrayBuffer` instances and byte arrays;
	 *          `{ isValid: false, error }` for all other types.
	 */
	checkIntegrity(
		value: unknown,
		context: IQIntegrityContext
	): IQIntegrityResult {
		if (value instanceof ArrayBuffer || Array.isArray(value)) {
			return { isValid: true };
		}

		return {
			isValid: false,
			error: `${context.className}.${context.propertyKey}: Expected ArrayBuffer or number[], got ${typeof value}`,
		};
	}
}

/**
 * Transformer for DataView: converts between byte array and DataView.
 *
 * **Serialization**: `DataView` → `number[]` (byte array)
 * **Deserialization**: `number[]` | `ArrayBuffer` → `DataView`
 *
 * @remarks
 * DataView provides a low-level interface for reading/writing multiple number types.
 * The underlying buffer is IQSerialized as a byte array.
 *
 * @example
 * ```typescript
 * @Quick({ view: DataView })
 * class BinaryData extends QuickModel<IBinaryData> {
 *   declare view: DataView;
 * }
 *
 * const data = new BinaryData({
 *   view: [0, 255, 128] // byte array
 * });
 * data.view instanceof DataView; // → true
 * data.view.byteLength; // → 3
 *
 * const json = data.$qm.serialize();
 * json.view; // → [0, 255, 128]
 * ```
 *
 * @see {@link BaseTransformer} — abstract base this class extends
 * @see {@link ArrayBufferTransformer} — related transformer for raw ArrayBuffer
 * @see {@link QTransformerRegistry} — register custom transformers alongside this one
 */
export class DataViewTransformer
	extends BaseTransformer<number[], DataView>
	implements IQIntegrityChecker
{
	/**
	 * Converts a byte array or ArrayBuffer to DataView.
	 *
	 * @param value - The value to convert (number array, DataView, or ArrayBuffer)
	 * @param propertyKey - The property name (for error messages)
	 * @param className - The class name (for error messages)
	 * @returns A DataView instance
	 * @throws {Error} If the value is not an array, DataView, or ArrayBuffer
	 */
	deserialize(
		value: number[] | DataView | ArrayBuffer | null | undefined,
		propertyKey: string,
		className: string,
		context?: IQTransformContext
	): DataView | null {
		if (value === null || value === undefined) return null;

		if (value instanceof DataView) {
			return value;
		}

		if (value instanceof ArrayBuffer) {
			return new DataView(value);
		}

		if (!Array.isArray(value)) {
			throw new QModelError(
				`${className}.${propertyKey}: Expected array for DataView, got ${typeof value}`,
				{
					className,
					propertyKey,
					value,
					expectedType: 'number[] | ArrayBuffer | DataView',
				}
			);
		}

		// SECURITY: Prevent Memory Exhaustion
		const maxBytes =
			(context?.metadata?.transformerOptions as { maxBytes?: number })
				?.maxBytes || 1_000_000;

		if (value.length > maxBytes) {
			throw new QModelError(
				`${className}.${propertyKey}: DataView input too large (> ${maxBytes} bytes).`,
				{
					className,
					propertyKey,
					value: 'TRUNCATED',
					expectedType: `Small DataView (< ${maxBytes} bytes)`,
				}
			);
		}

		const buffer = new ArrayBuffer(value.length);
		const view = new Uint8Array(buffer);
		view.set(value);
		return new DataView(buffer);
	}

	/**
	 * Converts a DataView to byte array.
	 *
	 * @param value - The DataView to serialize
	 * @returns Array of bytes from the underlying buffer
	 */
	serialize(value: DataView): number[] {
		return Array.from(new Uint8Array(value.buffer));
	}

	/**
	 * Validates that `value` is a valid `DataView` representation.
	 *
	 * Accepts: a `DataView` instance, an `ArrayBuffer`, or a plain `number[]` (byte array).
	 *
	 * @param value   - Runtime value to validate.
	 * @param context - Context providing `className` and `propertyKey` for error messages.
	 * @returns `{ isValid: true }` for `DataView`, `ArrayBuffer`, and byte arrays;
	 *          `{ isValid: false, error }` for all other types.
	 */
	checkIntegrity(
		value: unknown,
		context: IQIntegrityContext
	): IQIntegrityResult {
		if (
			value instanceof DataView ||
			value instanceof ArrayBuffer ||
			Array.isArray(value)
		) {
			return { isValid: true };
		}

		return {
			isValid: false,
			error: `${context.className}.${context.propertyKey}: Expected DataView, ArrayBuffer or number[], got ${typeof value}`,
		};
	}
}

/**
 * Transformer for SharedArrayBuffer: converts between byte array and SharedArrayBuffer.
 *
 * **Serialization**: `SharedArrayBuffer` → `number[]` (byte array)
 * **Deserialization**: `number[]` → `SharedArrayBuffer`
 *
 * @remarks
 * SharedArrayBuffer allows sharing memory between different execution contexts.
 * IQSerialized as a byte array for JSON compatibility.
 *
 * @see {@link BaseTransformer} — abstract base this class extends
 * @see {@link ArrayBufferTransformer} — standard single-context buffer equivalent
 * @see {@link QTransformerRegistry} — register custom transformers alongside this one
 */
export class SharedArrayBufferTransformer
	extends BaseTransformer<number[], SharedArrayBuffer>
	implements IQIntegrityChecker
{
	deserialize(
		value: number[] | SharedArrayBuffer | null | undefined,
		propertyKey: string,
		className: string,
		context?: IQTransformContext
	): SharedArrayBuffer | null {
		if (value === null || value === undefined) return null;

		if (value instanceof SharedArrayBuffer) {
			return value;
		}

		if (!Array.isArray(value)) {
			throw new QModelError(
				`${className}.${propertyKey}: SharedArrayBuffer transformer accepts number array or SharedArrayBuffer instance. ` +
					`Got ${typeof value}`,
				{
					className,
					propertyKey,
					value,
					expectedType: 'number[] | SharedArrayBuffer',
				}
			);
		}

		// SECURITY: Prevent Memory Exhaustion
		const maxBytes =
			(context?.metadata?.transformerOptions as { maxBytes?: number })
				?.maxBytes || 1_000_000;

		if (value.length > maxBytes) {
			throw new QModelError(
				`${className}.${propertyKey}: SharedArrayBuffer input too large (> ${maxBytes} bytes).`,
				{
					className,
					propertyKey,
					value: 'TRUNCATED',
					expectedType: `Small SharedArrayBuffer (< ${maxBytes} bytes)`,
				}
			);
		}

		const buffer = new SharedArrayBuffer(value.length);
		const view = new Uint8Array(buffer);
		view.set(value);
		return buffer;
	}

	serialize(value: SharedArrayBuffer): number[] {
		return Array.from(new Uint8Array(value));
	}

	/**
	 * Validates that `value` is a valid `SharedArrayBuffer` representation.
	 *
	 * Accepts: a `SharedArrayBuffer` instance, or a plain `number[]` (byte array).
	 *
	 * @param value   - Runtime value to validate.
	 * @param context - Context providing `className` and `propertyKey` for error messages.
	 * @returns `{ isValid: true }` for `SharedArrayBuffer` instances and byte arrays;
	 *          `{ isValid: false, error }` for all other types.
	 */
	checkIntegrity(
		value: unknown,
		context: IQIntegrityContext
	): IQIntegrityResult {
		if (value instanceof SharedArrayBuffer || Array.isArray(value)) {
			return { isValid: true };
		}

		return {
			isValid: false,
			error: `${context.className}.${context.propertyKey}: Expected SharedArrayBuffer or number[], got ${typeof value}`,
		};
	}
}

/** Pre-registered singleton instance of {@link ArrayBufferTransformer}. */
export const arrayBufferTransformer = new ArrayBufferTransformer();
/** Pre-registered singleton instance of {@link DataViewTransformer}. */
export const dataViewTransformer = new DataViewTransformer();
/** Pre-registered singleton instance of {@link SharedArrayBufferTransformer}. */
export const sharedArrayBufferTransformer = new SharedArrayBufferTransformer();
