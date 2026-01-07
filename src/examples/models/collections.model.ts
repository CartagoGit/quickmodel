import { Field, QuickModel, QuickType } from '../../quick.model';
import type {
  CollectionsModelTransforms,
  ICollectionsModel,
} from '../interfaces/collections-model.interface';

/**
 * Modelo con colecciones: Arrays, Maps, Sets
 */

// Re-exportar interfaces para compatibilidad
export type { CollectionsModelTransforms, ICollectionsModel };

export class CollectionsModel
  extends QuickModel<ICollectionsModel>
  implements QuickType<ICollectionsModel, CollectionsModelTransforms>
{
  @Field() tags!: string[];
  @Field() scores!: number[];
  @Field() flags!: boolean[];
  @Field() metadata!: Map<string, any>;
  @Field() userRoles!: Map<string, string>;
  @Field() uniqueTags!: Set<string>;
  @Field() uniqueIds!: Set<number>;
}
