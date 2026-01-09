/**
 * Metadata keys used throughout the QuickModel system.
 * Centralized to avoid duplication and ensure consistency.
 */

/**
 * Key for storing the @Quick() decorator marker on classes.
 * Indicates that a class uses @Quick() for auto-registration.
 */
export const QUICK_DECORATOR_KEY = '__quickDecorator__';

/**
 * Key for storing the type map passed to @Quick() decorator.
 * Example: @Quick({ posts: Post, tags: Set }) stores { posts: Post, tags: Set }
 */
export const QUICK_TYPE_MAP_KEY = '__quickTypeMap__';

/**
 * Key for storing captured design:type metadata before TypeScript field initialization.
 * Used by @Quick() to preserve TypeScript's emitted metadata.
 */
export const QUICK_DESIGN_TYPES_KEY = '__quickDesignTypes__';


export const QUICK_VALUES_KEY = '__quickValues__';

export const QUICK_PROPERTY_KEYS = '__quickPropertyKeys__';

export const QUICK_DEFAULT_KEYS = '__quickDevaultKey__';