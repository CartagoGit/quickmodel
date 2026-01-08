import { QInterface } from '../../core/interfaces';
import { QModel } from '../../quick.model';
import type {
	BinaryModelTransforms,
	IBinaryModel,
} from '../interfaces/binary-model.interface';

/**
 * Modelo con datos binarios: TypedArrays, ArrayBuffer, DataView
 */

// Re-exportar interfaces para compatibilidad
export type { BinaryModelTransforms, IBinaryModel };

export class BinaryModel
	extends QModel<IBinaryModel>
	implements QInterface<IBinaryModel, BinaryModelTransforms>
{
	int8Data!: Int8Array;
	int16Data!: Int16Array;
	int32Data!: Int32Array;
	int64Data!: BigInt64Array;
	uint8Data!: Uint8Array;
	uint16Data!: Uint16Array;
	uint32Data!: Uint32Array;
	uint64Data!: BigUint64Array;
	float32Data!: Float32Array;
	float64Data!: Float64Array;
	rawBuffer!: ArrayBuffer;
	dataView!: DataView;
}
