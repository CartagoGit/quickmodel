import { QModel, QType, QInterface } from '../../../quick.model';
import type {
  CollectionsModelTransforms,
  ICollectionsModel,
} from '../interfaces/collections-model.interface';

/**
 * Model demonstrating collection types: Arrays, Maps, and Sets.
 * 
 * This example shows how QModel automatically handles JavaScript collection types:
 * - **Arrays**: Primitive arrays (string[], number[], boolean[])
 * - **Maps**: Key-value pairs with automatic serialization to plain objects
 * - **Sets**: Unique value collections with automatic serialization to arrays
 * 
 * All collections are automatically transformed during serialization/deserialization.
 * 
 * @example
 * ```typescript
 * const model = new CollectionsModel({
 *   tags: ['typescript', 'nodejs', 'quickmodel'],
 *   scores: [95, 87, 92],
 *   flags: [true, false, true],
 *   metadata: { version: '1.0', author: 'John' }, // Converts to Map
 *   userRoles: { admin: 'John', user: 'Jane' }, // Converts to Map
 *   uniqueTags: ['tag1', 'tag2'], // Converts to Set
 *   uniqueIds: [1, 2, 3] // Converts to Set
 * });
 * 
 * // Serialization
 * const json = model.toJSON();
 * // Maps → objects, Sets → arrays
 * ```
 */

export class CollectionsModel
  extends QModel<ICollectionsModel>
  implements QInterface<ICollectionsModel, CollectionsModelTransforms>
{
  @QType() tags!: string[];
  @QType() scores!: number[];
  @QType() flags!: boolean[];
  @QType() metadata!: Map<string, any>;
  @QType() userRoles!: Map<string, string>;
  @QType() uniqueTags!: Set<string>;
  @QType() uniqueIds!: Set<number>;
}
