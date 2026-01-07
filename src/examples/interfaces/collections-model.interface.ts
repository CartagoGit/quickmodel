/**
 * @file collections-model.interface.ts
 * @description Interfaces y tipos para CollectionsModel - Arrays, Maps, Sets
 */

/**
 * Interfaz para modelo con colecciones
 */
export interface ICollectionsModel {
  // Arrays
  tags: string[];
  scores: number[];
  flags: boolean[];

  // Map
  metadata: Record<string, any>;
  userRoles: Record<string, string>;

  // Set
  uniqueTags: string[];
  uniqueIds: number[];
}

/**
 * Transformaciones aplicadas a ICollectionsModel
 */
export type CollectionsModelTransforms = {
  metadata: Map<string, any>;
  userRoles: Map<string, string>;
  uniqueTags: Set<string>;
  uniqueIds: Set<number>;
};
