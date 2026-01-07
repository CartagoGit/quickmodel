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
{
  @QType() id!: string;
  @QType() uuid!: string;
  @QType() name!: string;
  @QType() version!: number;
  @QType() enabled!: boolean;
  @QType() pattern!: RegExp;
  @QType() lastError!: Error | null;
  @QType() bigId!: bigint;
  @QType() token!: symbol;
  @QType() createdAt!: Date;
  @QType() updatedAt!: Date;
  @QType() deletedAt!: Date | null;
  @QType() tags!: string[];
  @QType() scores!: number[];
  @QType() metadata!: Map<string, any>;
  @QType() permissions!: Set<string>;
  @QType() owner!: SimpleModel;
  @QType() addresses!: Address[];
  @QType() thumbnail!: Uint8Array;
  @QType() signature!: ArrayBuffer;
  @QType() config!: Record<string, any>;
  @QType() stats!: { views: number; likes: number; shares: number };
}

const algo = new ComplexModel({
  id: '123',
  uuid: 'abc-def-ghi',
  name: 'Complex Entity',
  version: 2,
  enabled: true,
  pattern: { source: '^test$', flags: 'i' },
  lastError: { message: 'Error occurred', name: 'CustomError' },
  bigId: '9007199254740991',
  token: 'unique-token',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
  deletedAt: null,
  tags: ['example', 'complex', 'model'],
  scores: [100, 95, 85],
  metadata: { key1: 'value1', key2: 42 },
  permissions: ['read', 'write'],
  owner: {
    id: 'owner-1',
    name: 'Owner Name',
    age: 40,
    isActive: true,
    score: 88.5,
    optionalField: null,
    maybeUndefined: undefined,
    largeNumber: '12345678901234567890',
    uniqueKey: 'owner-unique-key',
  }, 
  addresses: [
    new Address({ street: '123 Main St', city: 'Anytown', country: 'USA', zipCode: '12345' }),
    new Address({ street: '456 Side St', city: 'Othertown', country: 'USA', zipCode: '67890' }),
  ],
  thumbnail: [137, 80, 78, 71],
  signature: [16],
  config: { theme: 'dark', notifications: true },
  stats: { views: 1000, likes: 150, shares: 25 },
});
