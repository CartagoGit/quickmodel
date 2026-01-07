/**
 * @file simple-model.interface.ts
 * @description Interfaces y tipos para SimpleModel - modelo con tipos primitivos, BigInt y Symbol
 */

/**
 * Interfaz para modelo simple con tipos primitivos
 */
export interface ISimpleModel {
  // Primitivos básicos
  id: string;
  name: string;
  age: number;
  isActive: boolean;
  score: number;

  // null/undefined
  optionalField: string | null;
  maybeUndefined: number | undefined;

  // BigInt
  largeNumber: string;

  // Symbol
  uniqueKey: string;
}

/**
 * Transformations applied to ISimpleModel
 */
export type SimpleModelTransforms = {
  largeNumber: bigint;
  uniqueKey: symbol;
};
