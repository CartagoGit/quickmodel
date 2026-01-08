/**
 * @cartago-git/quickmodel
 *
 * TypeScript model serialization/deserialization system
 * with SOLID architecture
 *
 * @example
 * ```typescript
 * import { QModel, Quick, QInterface } from '@cartago-git/quickmodel';
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
 * @Quick({
 *   balance: BigInt,
 *   createdAt: Date
 * })
 * class User extends QModel<IUser> implements QInterface<IUser, UserTransforms> {
 *   id!: string;
 *   balance!: bigint;
 *   createdAt!: Date;
 * }
 *
 * const user = new User({ id: '1', balance: '999999', createdAt: '2024-01-01T00:00:00.000Z' });
 * const json = user.toJSON();
 * const user2 = User.fromJSON(json);
 * ```
 */

// ============================================================================
// MAIN EXPORTS (Public API)
// ============================================================================

// Core: QModel + Quick decorator
export { QModel } from './quick.model';
export type { QInterface } from './quick.model';
export { Quick } from './core/decorators/quick.decorator';

// Transformer interfaces (for custom transformers)
export type { 
  IQTransformer,
  IQTransformContext,
  IQSerializedType
} from './core/interfaces/transformer.interface';

// ============================================================================
// TRANSFORMERS (Optional - for custom transformation registration)
// ============================================================================

export * from './transformers';
