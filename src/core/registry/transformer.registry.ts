/**
 * SOLID - Single Responsibility: Solo gestiona el registro de transformers
 * SOLID - Open/Closed: Permite agregar nuevos transformers sin modificar el código
 */

import { ITransformer, ITransformerRegistry } from '../interfaces';

type TypeKey = string | symbol | Function;

export class TransformerRegistry implements ITransformerRegistry {
  private readonly transformers = new Map<TypeKey, ITransformer>();

  register(typeKey: TypeKey, transformer: ITransformer): void {
    this.transformers.set(typeKey, transformer);
  }

  get(typeKey: TypeKey): ITransformer | undefined {
    return this.transformers.get(typeKey);
  }

  has(typeKey: TypeKey): boolean {
    return this.transformers.has(typeKey);
  }

  unregister(typeKey: TypeKey): void {
    this.transformers.delete(typeKey);
  }

  clear(): void {
    this.transformers.clear();
  }

  getAll(): Map<TypeKey, ITransformer> {
    return new Map(this.transformers);
  }
}

// Singleton global para el registro
export const transformerRegistry = new TransformerRegistry();
