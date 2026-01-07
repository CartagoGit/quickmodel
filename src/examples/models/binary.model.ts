import {
	QArrayBuffer,
	QBigInt64Array,
	QBigUint64Array,
	QDataView,
	QFloat32Array,
	QFloat64Array,
	QInt16Array,
	QInt32Array,
	QInt8Array,
	QInterface,
	QUint16Array,
	QUint32Array,
	QUint8Array,
} from '../../core/interfaces';
import { QModel, QType } from '../../quick.model';
import type {
	BinaryModelTransforms,
	IBinaryModel,
} from '../interfaces/binary-model.interface';

/**
 * Model demonstrating binary data handling with TypedArrays and buffers.
 *
 * This example shows how QModel handles low-level binary data types:
 * - **Signed TypedArrays**: Int8Array, Int16Array, Int32Array, BigInt64Array
 * - **Unsigned TypedArrays**: Uint8Array, Uint16Array, Uint32Array, BigUint64Array
 * - **Float TypedArrays**: Float32Array, Float64Array
 * - **Raw buffers**: ArrayBuffer, DataView
 *
 * All typed arrays are serialized to number[] (or string[] for BigInt variants)
 * and automatically deserialized back to their typed array forms.
 *
 * @example
 * ```typescript
 * const binary = new BinaryModel({
 *   int8Data: [1, -128, 127],
 *   uint8Data: [0, 255],
 *   float32Data: [3.14, 2.71],
 *   rawBuffer: [0, 1, 2, 3, 4],
 *   dataView: [255, 128, 64, 32]
 *   // ... more binary fields
 * });
 * ```
 */

export class BinaryModel
	extends QModel<IBinaryModel, BinaryModelTransforms>
	implements QInterface<IBinaryModel, BinaryModelTransforms>
{
	@QType(QInt8Array) int8Data!: Int8Array;
	@QType(QInt16Array) int16Data!: Int16Array;
	@QType(QInt32Array) int32Data!: Int32Array;
	@QType(QBigInt64Array) int64Data!: BigInt64Array;
	@QType(QUint8Array) uint8Data!: Uint8Array;
	@QType(QUint16Array) uint16Data!: Uint16Array;
	@QType(QUint32Array) uint32Data!: Uint32Array;
	@QType(QBigUint64Array) uint64Data!: BigUint64Array;
	@QType(QFloat32Array) float32Data!: Float32Array;
	@QType(QFloat64Array) float64Data!: Float64Array;
	@QType(QArrayBuffer) rawBuffer!: ArrayBuffer;
	@QType(QDataView) dataView!: DataView;
}

