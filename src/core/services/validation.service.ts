/**
 * Service for validating model instances.
 * 
 * NOTE: Validation is currently disabled after removing the validator registry system.
 * This service is kept for future implementation of inline validation.
 * 
 * @remarks
 * This class follows SOLID principles:
 * - **Single Responsibility**: Only handles model validation
 * 
 * @example
 * ```typescript
 * const service = new ValidationService();
 * 
 * class User extends QuickModel<IUser> {
 *   @QType('date') birthDate!: Date;
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
import { IQValidationContext, IQValidationResult } from '../interfaces/transformer.interface';

export class ValidationService {
  /**
   * Creates a validation service.
   * Validation is currently disabled as the validator registry was removed.
   */
  constructor() {}

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
  validate(instance: Record<string, unknown>, modelClass: Function): IQValidationResult[] {
    const results: IQValidationResult[] = [];

    for (const [key, value] of Object.entries(instance)) {
      const context: IQValidationContext = {
        propertyKey: key,
        className: modelClass.name,
        value,
      };

      const fieldType = Reflect.getMetadata('fieldType', instance, key);
      if (fieldType) {
        // Validator registry was removed - validation is currently disabled
        // TODO: Implement inline validation or restore validator system
        // const validator = this.qValidatorRegistry.get(fieldType);
        // if (validator) {
        //   const result = validator.validate(value, context);
        //   if (!result.isValid) {
        //     results.push(result);
        //   }
        // }
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
