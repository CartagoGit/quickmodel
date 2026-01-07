/**
 * Service for validating model instances.
 * 
 * Validates that all fields in a model instance conform to their declared types
 * by using registered validators from the validator registry.
 * 
 * @remarks
 * This class follows SOLID principles:
 * - **Single Responsibility**: Only handles model validation
 * - **Dependency Inversion**: Depends on IValidatorRegistry abstraction
 * 
 * Validation uses reflection metadata to determine field types and find
 * corresponding validators. Only fields with registered validators are validated.
 * 
 * @example
 * ```typescript
 * const service = new ValidationService(validatorRegistry);
 * 
 * class User extends QuickModel<IUser> {
 *   @Field('date') birthDate!: Date;
 * }
 * 
 * const user = new User({ birthDate: "invalid" });
 * const results = service.validate(user, User);
 * 
 * if (results.length > 0) {
 *   console.error('Validation errors:', results);
 * }
 * 
 * // Or use convenience method
 * if (!service.isValid(user, User)) {
 *   console.error('User is invalid');
 * }
 * ```
 */

import 'reflect-metadata';
import { IValidationContext, IValidationResult, IValidatorRegistry } from '../interfaces';

export class ValidationService {
  /**
   * Creates a validation service.
   * 
   * @param validatorRegistry - Registry containing type validators
   */
  constructor(private readonly validatorRegistry: IValidatorRegistry) {}

  /**
   * Validates all fields in a model instance.
   * 
   * @param instance - The model instance to validate
   * @param modelClass - The model class constructor (for metadata access)
   * @returns Array of validation results for failed validations (empty if all valid)
   * 
   * @remarks
   * Only validates fields that have:
   * 1. A `fieldType` metadata entry
   * 2. A corresponding validator in the registry
   */
  validate(instance: Record<string, unknown>, modelClass: Function): IValidationResult[] {
    const results: IValidationResult[] = [];

    for (const [key, value] of Object.entries(instance)) {
      const context: IValidationContext = {
        propertyKey: key,
        className: modelClass.name,
        value,
      };

      const fieldType = Reflect.getMetadata('fieldType', instance, key);
      if (fieldType) {
        const validator = this.validatorRegistry.get(fieldType);
        if (validator) {
          const result = validator.validate(value, context);
          if (!result.isValid) {
            results.push(result);
          }
        }
      }
    }

    return results;
  }

  /**
   * Checks if a model instance is valid.
   * 
   * @param instance - The model instance to check
   * @param modelClass - The model class constructor
   * @returns True if all validations pass, false if any fail
   */
  isValid(instance: Record<string, unknown>, modelClass: Function): boolean {
    return this.validate(instance, modelClass).length === 0;
  }
}
