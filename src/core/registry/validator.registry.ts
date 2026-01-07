/**
 * Registry for managing type validators.
 *
 * Centralized storage for validators that check if values conform to
 * expected types before transformation or serialization.
 *
 * @remarks
 * This class follows SOLID principles:
 * - **Single Responsibility**: Only manages validator registration
 * - **Open/Closed**: New validators can be added without modifying this code
 *
 * Validators are typically registered with string or symbol keys that
 * correspond to field type identifiers.
 *
 * @example
 * ```typescript
 * const registry = new ValidatorRegistry();
 *
 * // Register validator
 * registry.register('date', dateValidator);
 *
 * // Use validator
 * const validator = registry.get('date');
 * if (validator) {
 *   const result = validator.validate(value, context);
 *   if (!result.isValid) {
 *     console.error(result.error);
 *   }
 * }
 * ```
 */

import { IQValidator, IQValidatorRegistry } from '../interfaces';

export class ValidatorRegistry implements IQValidatorRegistry {
	private readonly validators = new Map<string | symbol, IQValidator>();

	/**
	 * Registers a validator for a specific type.
	 *
	 * @param typeKey - The type identifier (string or symbol)
	 * @param validator - The validator instance to register
	 */
	register(typeKey: string | symbol, validator: IQValidator): void {
		this.validators.set(typeKey, validator);
	}

	/**
	 * Retrieves a registered validator.
	 *
	 * @param typeKey - The type identifier to look up
	 * @returns The validator if found, undefined otherwise
	 */
	get(typeKey: string | symbol): IQValidator | undefined {
		return this.validators.get(typeKey);
	}

	/**
	 * Checks if a validator is registered for a type.
	 *
	 * @param typeKey - The type identifier to check
	 * @returns True if a validator exists for this type
	 */
	has(typeKey: string | symbol): boolean {
		return this.validators.has(typeKey);
	}

	/**
	 * Removes a validator from the registry.
	 *
	 * @param typeKey - The type identifier to unregister
	 */
	unregister(typeKey: string | symbol): void {
		this.validators.delete(typeKey);
	}

	/**
	 * Removes all validators from the registry.
	 */
	clear(): void {
		this.validators.clear();
	}

	/**
	 * Gets a copy of all registered validators.
	 *
	 * @returns A new Map containing all validator entries
	 */
	getAll(): Map<string | symbol, IQValidator> {
		return new Map(this.validators);
	}
}

/**
 * Global singleton validator registry instance.
 *
 * @remarks
 * Used throughout the library for consistent validator access.
 */
export const qValidatorRegistry = new ValidatorRegistry();
