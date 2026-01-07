/**
 * @cartago-git/quickmodel
 *
 * Sistema de serialización/deserialización de modelos TypeScript
 * con arquitectura SOLID
 *
 * @example
 * ```typescript
 * import { QuickModel, Field, QuickType, BigIntField } from '@cartago-git/quickmodel';
 *
 * interface IUser {
 *   id: string;
 *   balance: string;
 *   createdAt: string;
 * }
 *
 * type UserTransforms = {
 *   balance: bigint;
 *   createdAt: Date;
 * };
 *
 * class User extends QuickModel<IUser> implements QuickType<IUser, UserTransforms> {
 *   @Field() id!: string;
 *   @Field(BigIntField) balance!: bigint;
 *   @Field() createdAt!: Date;
 * }
 *
 * const user = new User({ id: '1', balance: '999999', createdAt: '2024-01-01T00:00:00.000Z' });
 * const json = user.toJSON();
 * const user2 = User.fromJSON(json);
 * ```
 */

// ============================================================================
// EXPORTS PRINCIPALES
// ============================================================================

// QuickModel (SOLID)
export { Field, QuickModel } from './quick.model';
export type { QuickType } from './quick.model';

// ============================================================================
// CORE (Interfaces, Servicios, Registries, Bases)
// ============================================================================

export * from './core';

// ============================================================================
// TRANSFORMERS
// ============================================================================

export * from './transformers';

// ============================================================================
// MODELOS DE EJEMPLO (Opcional - para referencia)
// ============================================================================

export * from './examples/models';
