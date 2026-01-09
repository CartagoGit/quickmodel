/**
 * Options for @Quick() decorator to handle advanced scenarios.
 * 
 * These options extend the basic transformation mapping with advanced features
 * like discriminated unions for polymorphic arrays.
 */

/**
 * Type guard function for custom discriminator logic.
 * 
 * Receives the data object and should return the correct constructor to use.
 * 
 * @param data - Raw data object to check
 * @returns The constructor that matches the data type
 * 
 * @example
 * ```typescript
 * const guard = (data) => {
 *   if ('text' in data) return Content;
 *   if ('tags' in data) return Metadata;
 *   return Content;  // fallback
 * };
 * ```
 */
export type TypeGuardFunction<T = any> = (data: any) => (new (...args: any[]) => T) | undefined;

/**
 * Discriminator configuration for a property with union types.
 * 
 * **Simple form** - Just the field name:
 * ```typescript
 * discriminators: {
 *   items: 'type'  // Uses data.type to match constructor name
 * }
 * ```
 * 
 * **With explicit mapping**:
 * ```typescript
 * discriminators: {
 *   items: {
 *     field: 'type',
 *     mapping: {
 *       'content': Content,
 *       'metadata': Metadata
 *     }
 *   }
 * }
 * ```
 * 
 * **With custom function**:
 * ```typescript
 * discriminators: {
 *   items: (data) => 'text' in data ? Content : Metadata
 * }
 * ```
 */
export type DiscriminatorConfig = 
  | string  // Field name (e.g., 'type')
  | TypeGuardFunction  // Custom function
  | {
      /** Field name to use as discriminator */
      field: string;
      /** Optional mapping from discriminator value to constructor */
      mapping?: Record<string, new (...args: any[]) => any>;
    };

/**
 * Advanced options for @Quick() decorator (second parameter).
 * 
 * @example
 * **Simple discriminator by field name**:
 * ```typescript
 * interface IContent { type: 'content'; text: string; }
 * interface IMetadata { type: 'metadata'; tags: string[]; }
 * 
 * @Quick({
 *   items: [Content, Metadata]
 * }, {
 *   discriminators: {
 *     items: 'type'  // Uses data.type value
 *   }
 * })
 * class Data extends QModel<IData> {
 *   declare items: (Content | Metadata)[];
 * }
 * ```
 * 
 * @example
 * **With explicit mapping**:
 * ```typescript
 * @Quick({
 *   items: [Content, Metadata]
 * }, {
 *   discriminators: {
 *     items: {
 *       field: 'type',
 *       mapping: {
 *         'content': Content,
 *         'metadata': Metadata
 *       }
 *     }
 *   }
 * })
 * ```
 * 
 * @example
 * **With custom type guard function**:
 * ```typescript
 * @Quick({
 *   items: [Content, Metadata]
 * }, {
 *   discriminators: {
 *     items: (data) => {
 *       if ('text' in data) return Content;
 *       if ('tags' in data) return Metadata;
 *     }
 *   }
 * })
 * ```
 */
export interface IQuickAdvancedOptions {
	/**
	 * Discriminator configuration for union type properties.
	 * 
	 * Maps property names to their discriminator configuration.
	 * 
	 * - **string**: Field name to use as discriminator (simple case)
	 * - **function**: Custom type guard function
	 * - **object**: Full configuration with field and mapping
	 */
	discriminators?: Record<string, DiscriminatorConfig>;
}
