/**
 * SOLID - Single Responsibility: Separar serialización de la lógica del modelo
 * SOLID - Dependency Inversion: Depender de abstracciones (interfaces)
 */

export interface ISerializer<TModel, TInterface> {
  /**
   * Serializa un modelo a su representación de interfaz
   */
  serialize(model: TModel): TInterface;

  /**
   * Serializa a JSON string
   */
  serializeToJson(model: TModel): string;
}

export interface IDeserializer<TInterface, TModel> {
  /**
   * Deserializa una interfaz a un modelo
   */
  deserialize(data: TInterface, modelClass: new (data: TInterface) => TModel): TModel;

  /**
   * Deserializa desde JSON string
   */
  deserializeFromJson(json: string, modelClass: new (data: any) => TModel): TModel;
}
