import { BigIntField, SymbolField } from '../../core/interfaces';
import { Field, QuickModel, QuickType } from '../../quick.model';
import type { ISimpleModel, SimpleModelTransforms } from '../interfaces/simple-model.interface';

/**
 * Modelo simple con tipos primitivos
 */

// Re-exportar interfaces para compatibilidad
export type { ISimpleModel, SimpleModelTransforms };

export class SimpleModel
  extends QuickModel<ISimpleModel>
  implements QuickType<ISimpleModel, SimpleModelTransforms>
{
  @Field() id!: string;
  @Field() name!: string;
  @Field() age!: number;
  @Field() isActive!: boolean;
  @Field() score!: number;
  @Field() optionalField!: string | null;
  @Field() maybeUndefined!: number | undefined;
  @Field(BigIntField) largeNumber!: bigint;
  @Field(SymbolField) uniqueKey!: symbol;
}
