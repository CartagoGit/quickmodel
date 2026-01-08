import { BaseTransformer } from '../core/bases/base-transformer';

/**
 * Transformer for URL type: converts between string and URL object.
 * 
 * **Serialization**: `URL` → `string`
 * **Deserialization**: `string` → `URL`
 */
export class URLTransformer extends BaseTransformer<string, URL> {
  deserialize(value: string | URL, propertyKey: string, className: string): URL {
    if (value instanceof URL) {
      return value;
    }

    if (typeof value !== 'string') {
      throw new Error(
        `${className}.${propertyKey}: URL transformer accepts string (e.g., "https://example.com") ` +
        `or URL instance. Got ${typeof value}`
      );
    }

    try {
      return new URL(value);
    } catch (error) {
      throw new Error(
        `${className}.${propertyKey}: Invalid URL value "${value}". ` +
        `Expected a valid URL string (e.g., "https://example.com/path")`
      );
    }
  }

  serialize(value: URL): string {
    return value.toString();
  }
}

/**
 * Transformer for URLSearchParams type: converts between string/object and URLSearchParams.
 * 
 * **Serialization**: `URLSearchParams` → `string`
 * **Deserialization**: `string | object` → `URLSearchParams`
 */
export class URLSearchParamsTransformer extends BaseTransformer<string | Record<string, string>, URLSearchParams> {
  deserialize(value: string | Record<string, string> | URLSearchParams, propertyKey: string, className: string): URLSearchParams {
    if (value instanceof URLSearchParams) {
      return value;
    }

    if (typeof value === 'string') {
      return new URLSearchParams(value);
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return new URLSearchParams(value as Record<string, string>);
    }

    throw new Error(
      `${className}.${propertyKey}: URLSearchParams transformer accepts string (e.g., "key=value&foo=bar"), ` +
      `object (e.g., {key: "value"}), or URLSearchParams instance. Got ${typeof value}`
    );
  }

  serialize(value: URLSearchParams): string {
    return value.toString();
  }
}

/**
 * Transformer for TextEncoder: converts plain object to TextEncoder.
 * 
 * **Note**: TextEncoder has no state, so serialization returns empty object.
 */
export class TextEncoderTransformer extends BaseTransformer<Record<string, never>, TextEncoder> {
  deserialize(value: any, propertyKey: string, className: string): TextEncoder {
    if (value instanceof TextEncoder) {
      return value;
    }

    // TextEncoder has no constructor arguments, just create new instance
    if (value === null || value === undefined || (typeof value === 'object' && Object.keys(value).length === 0)) {
      return new TextEncoder();
    }

    throw new Error(
      `${className}.${propertyKey}: TextEncoder transformer accepts null, undefined, ` +
      `empty object {}, or TextEncoder instance. Got ${typeof value}`
    );
  }

  serialize(value: TextEncoder): Record<string, never> {
    return {}; // TextEncoder has no serializable state
  }
}

/**
 * Transformer for TextDecoder: converts string/object to TextDecoder.
 * 
 * **Serialization**: `TextDecoder` → `{ encoding: string }`
 * **Deserialization**: `string | { encoding: string }` → `TextDecoder`
 */
export class TextDecoderTransformer extends BaseTransformer<string | { encoding: string }, TextDecoder> {
  deserialize(value: string | { encoding?: string } | TextDecoder, propertyKey: string, className: string): TextDecoder {
    if (value instanceof TextDecoder) {
      return value;
    }

    if (typeof value === 'string') {
      try {
        return new TextDecoder(value);
      } catch (error) {
        throw new Error(
          `${className}.${propertyKey}: Invalid encoding "${value}". ` +
          `Valid encodings include: utf-8, utf-16, iso-8859-1, etc.`
        );
      }
    }

    if (typeof value === 'object' && value !== null) {
      const encoding = (value as any).encoding || 'utf-8';
      try {
        return new TextDecoder(encoding);
      } catch (error) {
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
