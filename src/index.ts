/**
 * @cartago-git/quickmodel
 *
 * TypeScript model serialization/deserialization system
 * with SOLID architecture
 *
 * @example
 * ```typescript
 * import { QModel, QType, QInterface, QBigInt } from '@cartago-git/quickmodel';
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
 * class User extends QModel<IUser> implements QInterface<IUser, UserTransforms> {
 *   @QType() id!: string;
 *   @QType(QBigInt) balance!: bigint;
 *   @QType() createdAt!: Date;
 * }
 *
 * const user = new User({ id: '1', balance: '999999', createdAt: '2024-01-01T00:00:00.000Z' });
 * const json = user.toJSON();
 * const user2 = User.fromJSON(json);
 * ```
 */

// ============================================================================
// MAIN EXPORTS
// ============================================================================

// QModel (SOLID architecture)
export { QType, QModel } from './quick.model';
export type { QInterface } from './quick.model';

// ============================================================================
// CORE (Interfaces, Services, Registries, Bases)
// ============================================================================

export * from './core';

// ============================================================================
// TRANSFORMERS
// ============================================================================

export * from './transformers';

// ============================================================================
// EXAMPLE MODELS (Optional - for reference)
// ============================================================================

export * from './examples/qtype-decorator/models';
