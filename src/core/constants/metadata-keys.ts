/**
 * Metadata keys used throughout the QuickModel system.
 * Centralized to avoid duplication and ensure consistency.
 *
 * @see {@link Quick} — decorator that writes most of these keys at class definition time
 * @see {@link QType} — decorator that writes field-level type metadata
 */

/**
 * Key for storing the @Quick() decorator marker on classes.
 * Indicates that a class uses @Quick() for auto-registration.
 * @see {@link Quick} — decorator that writes this key
 * @see {@link isQuickDecorated} — reads this key to check class decoration
 */
export const QUICK_DECORATOR_KEY = '__quickDecorator__';

/**
 * Key for storing the type map passed to @Quick() decorator.
 * Example: @Quick({ posts: Post, tags: Set }) stores { posts: Post, tags: Set }
 * @see {@link Quick} — decorator that writes this metadata key
 * @see {@link PropertyTransformer} — reads this to resolve per-property transformers
 */
export const QUICK_TYPE_MAP_KEY = '__quickTypeMap__';

/**
 * Key for storing captured design:type metadata before TypeScript field initialization.
 * Used by @Quick() to preserve TypeScript's emitted metadata.
 */
export const QUICK_DESIGN_TYPES_KEY = '__quickDesignTypes__';

/**
 * Key for the backup storage object that holds property values.
 * Used in quick.model.ts as a fallback storage: (this as any)[QUICK_VALUES_KEY][propertyKey]
 * @see {@link QModel} — writes property values under this key in getters/setters
 */
export const QUICK_VALUES_KEY = '__quickValues__';

/**
 * Prefix for storage keys created by @QType() decorator.
 * Properties are stored as: `${QUICK_PROPERTY_KEYS}${propertyName}`
 * Example: '__quickmodel_id', '__quickmodel_name'
 */
export const QUICK_PROPERTY_KEYS = '__quickPropertyKeys__';

/**
 * Prefix for default value storage in @Quick() decorator.
 * Used to store default values for properties with explicit defaults.
 */
export const QUICK_DEFAULT_KEYS = '__quickDefaultKey__';

/**
 * Key for storing discriminator configuration for union types.
 * Used by @Quick() second parameter to handle polymorphic arrays.
 * @see {@link IQDiscriminatorConfig} — shape of the stored value
 * @see {@link PopulationService} — reads this to resolve polymorphic types at runtime
 */
export const QUICK_DISCRIMINATORS_KEY = '__quickDiscriminators__';

/**
 * Key for storing advanced options (discriminators, strict mode, etc).
 * Used by @Quick() second parameter.
 */
export const QUICK_OPTIONS_KEY = '__quickOptions__';

/**
 * Key for the internal force hydration method in `QModel`.
 * This symbol hides the method from the public API while allowing the `@Quick` decorator to access it.
 *
 * **Purpose:**
 * Handles the restoration of deserialized values that might be overwritten by
 * TypeScript/ES2022 class property initializers running after the parent constructor.
 *
 * @internal
 */
export const FORCE_HYDRATION_KEY = Symbol('__forceHydration__');

/**
 * Metadata key applied by `@QComputed()` to getter properties.
 * Getters marked with this key are included in `serialize()` and `toJSON()` output.
 * Unmarked prototype getters are excluded by default.
 * @see {@link QComputed} — decorator that writes this key
 * @see {@link Serializer} — reads this key to include computed getters in output
 */
export const QCOMPUTED_METADATA_KEY = '__qComputed__';
