/**
 * SOLID - Single Responsibility: Solo se encarga de validar modelos
 * SOLID - Dependency Inversion: Depende de IValidatorRegistry (abstracción)
 */

import 'reflect-metadata';
import { IValidationContext, IValidationResult, IValidatorRegistry } from '../interfaces';

export class ValidationService {
  constructor(private readonly validatorRegistry: IValidatorRegistry) {}

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

  isValid(instance: Record<string, unknown>, modelClass: Function): boolean {
    return this.validate(instance, modelClass).length === 0;
  }
}
