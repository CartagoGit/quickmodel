/**
 * @file binary-model.interface.ts
 * @description Interfaces y tipos para BinaryModel - TypedArrays, ArrayBuffer, DataView
 */

/**
 * Interfaz para modelo con datos binarios
 */
export interface IBinaryModel {
  // TypedArrays de enteros con signo
  int8Data: number[];
  int16Data: number[];
  int32Data: number[];
  int64Data: string[];

  // TypedArrays de enteros sin signo
  uint8Data: number[];
  uint16Data: number[];
  uint32Data: number[];
  uint64Data: string[];

  // TypedArrays de punto flotante
  float32Data: number[];
  float64Data: number[];

  // Buffers
  rawBuffer: number[];
  dataView: number[];
}

/**
 * Transformations applied to IBinaryModel
 */
export type BinaryModelTransforms = {
  int8Data: Int8Array;
  int16Data: Int16Array;
  int32Data: Int32Array;
  int64Data: BigInt64Array;
  uint8Data: Uint8Array;
  uint16Data: Uint16Array;
  uint32Data: Uint32Array;
  uint64Data: BigUint64Array;
  float32Data: Float32Array;
  float64Data: Float64Array;
  rawBuffer: ArrayBuffer;
  dataView: DataView;
};
