import { QBigInt, QSymbol } from '../../../core/interfaces';
import { QModel, QType, QInterface } from '../../../quick.model';
import type {
	ISimpleModel,
	SimpleModelTransforms,
} from '../interfaces/simple-model.interface';

/**
 * Simple model demonstrating basic primitive types and type transformations.
 *
 * This example shows how to use @QType() decorator with auto-detection for
 * standard types and explicit type hints for special types like bigint and symbol.
 *
 * @example
 * ```typescript
 * const model = new SimpleModel({
 *   id: '123',
 *   name: 'John Doe',
 *   age: 30,
 *   isActive: true,
 *   score: 95.5,
 *   optionalField: null,
 *   maybeUndefined: undefined,
 *   largeNumber: '9007199254740991', // Will be converted to bigint
 *   uniqueKey: 'unique-key' // Will be converted to symbol
 * });
 * ```
 */

export class SimpleModel
	extends QModel<ISimpleModel>
	implements QInterface<ISimpleModel, SimpleModelTransforms>
{
	@QType() id!: string;
	@QType() name!: string;
	@QType() age!: number;
	@QType() isActive!: boolean;
	@QType() score!: number;
	@QType() optionalField!: string | null;
	@QType() maybeUndefined!: number | undefined;
	@QType(QBigInt) largeNumber!: bigint;
	@QType(QSymbol) uniqueKey!: symbol;
}
