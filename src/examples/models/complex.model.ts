import { QBigInt, QError, QRegExp, QSymbol } from '../../core/interfaces';
import { QModel, QType, QInterface } from '../../quick.model';
import type { IComplexModelTransforms, IComplexModel } from '../interfaces/complex-model.interface';
import { Address } from './nested.model';
import { SimpleModel } from './simple.model';

/**
 * Complex model demonstrating the full range of QuickModel capabilities.
 * 
 * This comprehensive example includes:
 * - **Primitives**: string, number, boolean
 * - **Special types**: Date, RegExp, Error, BigInt, Symbol
 * - **Collections**: Arrays, Maps, Sets
 * - **Binary data**: TypedArrays (Uint8Array), ArrayBuffer
 * - **Nested models**: SimpleModel, Address[]
 * - **Complex objects**: Plain objects, inline type definitions
 * 
 * Perfect reference for understanding all type transformation capabilities.
 * 
 * @example
 * ```typescript
 * const complex = new ComplexModel({
 *   id: '123',
 *   uuid: 'abc-def-ghi',
 *   name: 'Complex Entity',
 *   version: 2,
 *   enabled: true,
 *   pattern: { source: '^test$', flags: 'i' },
 *   lastError: { message: 'Error occurred', name: 'CustomError' },
 *   bigId: '9007199254740991',
 *   token: 'unique-token',
 *   createdAt: '2024-01-01T00:00:00.000Z',
 *   // ... more fields
 * });
 * ```
 */

export class ComplexModel
  extends QModel<IComplexModel>
  implements QInterface<IComplexModel, IComplexModelTransforms>
{
  @QType() id!: string;
  @QType() uuid!: string;
  @QType() name!: string;
  @QType() version!: number;
  @QType() enabled!: boolean;
  @QType(QRegExp) pattern!: RegExp;
  @QType(QError) lastError!: Error | null;
  @QType(QBigInt) bigId!: bigint;
  @QType(QSymbol) token!: symbol;
  @QType() createdAt!: Date;
  @QType() updatedAt!: Date;
  @QType() deletedAt!: Date | null;
  @QType() tags!: string[];
  @QType() scores!: number[];
  @QType() metadata!: Map<string, any>;
  @QType() permissions!: Set<string>;
  @QType() owner!: SimpleModel;
  @QType(Address) addresses!: Address[];
  @QType() thumbnail!: Uint8Array;
  @QType() signature!: ArrayBuffer;
  @QType() config!: Record<string, any>;
  @QType() stats!: { views: number; likes: number; shares: number };
}
