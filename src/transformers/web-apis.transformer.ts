import { BaseTransformer } from '../core/bases/base-transformer';
import {
	IQValidationContext,
	IQValidationResult,
	IQValidator,
} from '../core/interfaces/transformer.interface';

/**
 * Transformer for URL type: converts between string and URL object.
 *
 * **Serialization**: `URL` → `string`
 * **Deserialization**: `string` → `URL`
 */
export class URLTransformer
	extends BaseTransformer<string, URL>
	implements IQValidator
{
	deserialize(
		value: string | URL | null | undefined,
		propertyKey: string,
		className: string
	): URL | null {
		// Passthrough null/undefined
		if (value === null || value === undefined) {
			return value as null;
		}

		// Already a URL instance - return as-is
		if (value instanceof URL) {
			return value;
		}

		// Must be string, nothing else
		if (typeof value !== 'string') {
			throw new Error(
				`${className}.${propertyKey}: URL transformer ONLY accepts:\n` +
					`  - string (valid URL, e.g., "https://example.com/path?query=1")\n` +
					`  - URL instance\n` +
					`Received: ${typeof value} = ${JSON.stringify(value)}`
			);
		}

		try {
			return new URL(value);
		} catch (error) {
			const errorMsg =
				error instanceof Error ? error.message : String(error);
			throw new Error(
				`${className}.${propertyKey}: Invalid URL string "${value}".\n` +
					`Error: ${errorMsg}\n` +
					`Expected: Valid URL with protocol (e.g., "https://example.com/path")`
			);
		}
	}

	serialize(value: URL): string {
		return value.toString();
	}

	validate(value: unknown, context: IQValidationContext): IQValidationResult {
		if (value instanceof URL) {
			return { isValid: true };
		}

		if (typeof value === 'string') {
			try {
				new URL(value);
				return { isValid: true };
			} catch {
				return {
					isValid: false,
					error: `${context.className}.${context.propertyKey}: Invalid URL value "${value}"`,
				};
			}
		}

		return {
			isValid: false,
			error: `${context.className}.${context.propertyKey}: Expected string/URL, got ${typeof value}`,
		};
	}
}

/**
 * Transformer for URLSearchParams type: converts between string/object and URLSearchParams.
 *
 * **Serialization**: `URLSearchParams` → `string`
 * **Deserialization**: `string | object` → `URLSearchParams`
 */
export class URLSearchParamsTransformer
	extends BaseTransformer<string | Record<string, string>, URLSearchParams>
	implements IQValidator
{
	deserialize(
		value: string | Record<string, string> | URLSearchParams | null | undefined,
		propertyKey: string,
		className: string
	): URLSearchParams | null {
		// Passthrough null/undefined
		if (value === null || value === undefined) {
			return value as null;
		}

		// Already a URLSearchParams instance - return as-is
		if (value instanceof URLSearchParams) {
			return value;
		}

		// Accept string query
		if (typeof value === 'string') {
			return new URLSearchParams(value);
		}

		// Accept plain object (not array, not null)
		if (
			typeof value === 'object' &&
			value !== null &&
			!Array.isArray(value)
		) {
			return new URLSearchParams(value);
		}

		throw new Error(
			`${className}.${propertyKey}: URLSearchParams transformer ONLY accepts:\n` +
				`  - string (query format, e.g., "key=value&foo=bar")\n` +
				`  - object (key-value pairs, e.g., { key: "value", foo: "bar" })\n` +
				`  - URLSearchParams instance\n` +
				`Received: ${typeof value} = ${JSON.stringify(value)}`
		);
	}

	serialize(value: URLSearchParams): string {
		return value.toString();
	}

	validate(value: unknown, context: IQValidationContext): IQValidationResult {
		if (value instanceof URLSearchParams) {
			return { isValid: true };
		}

		if (typeof value === 'string') {
			return { isValid: true };
		}

		if (typeof value === 'object' && value !== null) {
			return { isValid: true };
		}

		return {
			isValid: false,
			error: `${context.className}.${context.propertyKey}: Expected string/object/URLSearchParams, got ${typeof value}`,
		};
	}
}

/**
 * Transformer for TextEncoder: converts plain object to TextEncoder.
 *
 * **Note**: TextEncoder has no state, so serialization returns empty object.
 */
export class TextEncoderTransformer extends BaseTransformer<
	Record<string, never>,
	TextEncoder
> {
	deserialize(
		value: unknown,
		propertyKey: string,
		className: string
	): TextEncoder | null {
		// Already a TextEncoder instance - return as-is
		if (value instanceof TextEncoder) {
			return value;
		}

		// TextEncoder has no state, accept null/undefined/empty object
		if (
			value === null ||
			value === undefined ||
			(typeof value === 'object' && Object.keys(value).length === 0)
		) {
			return new TextEncoder();
		}

		throw new Error(
			`${className}.${propertyKey}: TextEncoder transformer ONLY accepts:\n` +
				`  - null\n` +
				`  - undefined\n` +
				`  - {} (empty object)\n` +
				`  - TextEncoder instance\n` +
				`Note: TextEncoder has no configuration, these values just create a new instance.\n` +
				`Received: ${typeof value} = ${JSON.stringify(value)}`
		);
	}

	serialize(_value: TextEncoder): Record<string, never> {
		return {}; // TextEncoder has no serializable state
	}
}

/**
 * Transformer for TextDecoder: converts string/object to TextDecoder.
 *
 * **Serialization**: `TextDecoder` → `{ encoding: string }`
 * **Deserialization**: `string | { encoding: string }` → `TextDecoder`
 */
export class TextDecoderTransformer extends BaseTransformer<
	string | { encoding: string },
	TextDecoder
> {
	deserialize(
		value: string | { encoding?: string } | TextDecoder | null | undefined,
		propertyKey: string,
		className: string
	): TextDecoder | null {
		if (value === null || value === undefined) return null;

		if (value instanceof TextDecoder) {
			return value;
		}

		if (typeof value === 'string') {
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				return new TextDecoder(value as any);
			} catch (_error) {
				throw new Error(
					`${className}.${propertyKey}: Invalid encoding "${value}". ` +
						`Valid encodings include: utf-8, utf-16, iso-8859-1, etc.`
				);
			}
		}

		if (typeof value === 'object' && value !== null) {
			const encoding =
				(value as { encoding?: string }).encoding || 'utf-8';
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				return new TextDecoder(encoding as any);
			} catch (_error) {
				throw new Error(
					`${className}.${propertyKey}: Invalid encoding "${encoding}". ` +
						`Valid encodings include: utf-8, utf-16, iso-8859-1, etc.`
				);
			}
		}

		if (value === null || value === undefined) {
			return new TextDecoder();
		}

		throw new Error(
			`${className}.${propertyKey}: TextDecoder transformer accepts string (encoding name like "utf-8"), ` +
				`object with encoding property, or TextDecoder instance. Got ${typeof value}`
		);
	}

	serialize(value: TextDecoder): { encoding: string } {
		return { encoding: value.encoding };
	}
}
