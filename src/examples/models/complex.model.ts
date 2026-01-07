import { BigIntField, ErrorField, RegExpField, SymbolField } from '../../core/interfaces';
import { Field, QuickModel, QuickType } from '../../quick.model';
import type { ComplexModelTransforms, IComplexModel } from '../interfaces/complex-model.interface';
import { Address } from './nested.model';
import { SimpleModel } from './simple.model';

/**
 * Complex model with combination of all types
 */

// Re-exportar interfaces para compatibilidad
export type { ComplexModelTransforms, IComplexModel };

export class ComplexModel
  extends QuickModel<IComplexModel>
  implements QuickType<IComplexModel, ComplexModelTransforms>
{
  @Field() id!: string;
  @Field() uuid!: string;
  @Field() name!: string;
  @Field() version!: number;
  @Field() enabled!: boolean;
  @Field(RegExpField) pattern!: RegExp;
  @Field(ErrorField) lastError!: Error | null;
  @Field(BigIntField) bigId!: bigint;
  @Field(SymbolField) token!: symbol;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;
  @Field() deletedAt!: Date | null;
  @Field() tags!: string[];
  @Field() scores!: number[];
  @Field() metadata!: Map<string, any>;
  @Field() permissions!: Set<string>;
  @Field() owner!: SimpleModel;
  @Field(Address) addresses!: Address[];
  @Field() thumbnail!: Uint8Array;
  @Field() signature!: ArrayBuffer;
  @Field() config!: Record<string, any>;
  @Field() stats!: { views: number; likes: number; shares: number };
}
