/**
 * SOLID - Single Responsibility: Separate serialization from model logic
 * SOLID - Dependency Inversion: Depend on abstractions (interfaces)
 */

export interface ISerializer<TModel extends Record<string, unknown>, TInterface> {
  /**
   * Serializa un modelo a su representación de interfaz
   */
  serialize(model: TModel): TInterface;

  /**
   * Serializa a JSON string
   */
  serializeToJson(model: TModel): string;
}

export interface IDeserializer<TInterface extends Record<string, unknown>, TModel> {
  /**
   * Deserializa una interfaz a un modelo
   */
  deserialize(data: TInterface, modelClass: new (data: TInterface) => TModel): TModel;

  /**
   * Deserializes from JSON string.
   */
  deserializeFromJson(json: string, modelClass: new (data: any) => TModel): TModel;
}
