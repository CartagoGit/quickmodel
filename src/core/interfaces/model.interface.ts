/**
 * Tipos públicos para modelos QuickModel
 */

/**
 * Tipo helper para definir transformaciones de tipos en modelos
 * 
 * @template TInterface - Interfaz base del modelo (datos JSON)
 * @template TTransforms - Objeto con las transformaciones de tipos específicos
 * 
 * @example
 * ```typescript
 * interface IUser {
 *   id: string;
 *   balance: string;      // En JSON es string
 *   createdAt: string;    // En JSON es string
 * }
 * 
 * type UserTransforms = {
 *   balance: bigint;      // En memoria es bigint
 *   createdAt: Date;      // En memoria es Date
 * };
 * 
 * class User extends QuickModel<IUser, UserTransforms> 
 *   implements QuickType<IUser, UserTransforms> {
 *   @Field() id!: string;
 *   @Field(BigIntField) balance!: bigint;
 *   @Field() createdAt!: Date;
 * }
 * ```
 */
export type QuickType<
  TInterface,
  TTransforms extends Partial<Record<keyof TInterface, unknown>> = {},
> = Omit<TInterface, keyof TTransforms> & TTransforms;
