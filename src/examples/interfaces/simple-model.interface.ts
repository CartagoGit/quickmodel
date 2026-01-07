/**
 * @file simple-model.interface.ts
 * @description Interfaces and types for SimpleModel - model with primitive types, BigInt and Symbol
 */

/**
 * Interface for simple model with primitive types
 */
export interface ISimpleModel {
  // Basic primitives
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
