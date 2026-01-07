import {
  ArrayBufferField,
  BigInt64ArrayField,
  BigUint64ArrayField,
  DataViewField,
  Float32ArrayField,
  Float64ArrayField,
  Int16ArrayField,
  Int32ArrayField,
  Int8ArrayField,
  Uint16ArrayField,
  Uint32ArrayField,
  Uint8ArrayField,
} from '../../core/interfaces';
import { Field, QuickModel, type MockAPI } from '../../quick.model';
import type { BinaryModelTransforms, IBinaryModel } from '../interfaces/binary-model.interface';

/**
 * Modelo con datos binarios: TypedArrays, ArrayBuffer, DataView
 */

// Re-exportar interfaces para compatibilidad
export type { BinaryModelTransforms, IBinaryModel };

export class BinaryModel extends QuickModel<IBinaryModel, BinaryModelTransforms> {
  @Field(Int8ArrayField) int8Data!: Int8Array;
  @Field(Int16ArrayField) int16Data!: Int16Array;
  @Field(Int32ArrayField) int32Data!: Int32Array;
  @Field(BigInt64ArrayField) int64Data!: BigInt64Array;
  @Field(Uint8ArrayField) uint8Data!: Uint8Array;
  @Field(Uint16ArrayField) uint16Data!: Uint16Array;
  @Field(Uint32ArrayField) uint32Data!: Uint32Array;
  @Field(BigUint64ArrayField) uint64Data!: BigUint64Array;
  @Field(Float32ArrayField) float32Data!: Float32Array;
  @Field(Float64ArrayField) float64Data!: Float64Array;
  @Field(ArrayBufferField) rawBuffer!: ArrayBuffer;
  @Field(DataViewField) dataView!: DataView;

}

const algo = BinaryModel.mock().array(3)
const algo2 = BinaryModel.mock().interfaceArray(3)
const algo3 = BinaryModel.mock().empty()