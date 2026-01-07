/**
 * SOLID - Single Responsibility: Solo valida tipos
 * SOLID - Open/Closed: Permite agregar nuevos validadores sin modificar el código
 */

import { IValidator, IValidatorRegistry } from '../interfaces';

export class ValidatorRegistry implements IValidatorRegistry {
  private readonly validators = new Map<string | symbol, IValidator>();

  register(typeKey: string | symbol, validator: IValidator): void {
    this.validators.set(typeKey, validator);
  }

  get(typeKey: string | symbol): IValidator | undefined {
    return this.validators.get(typeKey);
  }

  has(typeKey: string | symbol): boolean {
    return this.validators.has(typeKey);
  }

  unregister(typeKey: string | symbol): void {
    this.validators.delete(typeKey);
  }

  clear(): void {
    this.validators.clear();
  }

  getAll(): Map<string | symbol, IValidator> {
    return new Map(this.validators);
  }
}

// Singleton global para el registro
export const validatorRegistry = new ValidatorRegistry();
