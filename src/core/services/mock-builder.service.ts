import type { MockGenerator } from './mock-generator.service';
import type { MockType } from './mock-generator.service';

/**
 * Constructor de mocks con tipado estricto.
 * Cada instancia está especializada para una clase específica.
 */
export class MockBuilder<TInstance, TInterface> {
	constructor(
		private readonly modelClass: new (data: TInterface) => TInstance,
		private readonly mockGenerator: MockGenerator
	) {}

	empty(overrides?: Partial<TInterface>): TInstance {
		const data = this.mockGenerator.generate(
			this.modelClass,
			'empty',
			overrides
		);
		return new this.modelClass(data);
	}

	random(overrides?: Partial<TInterface>): TInstance {
		const data = this.mockGenerator.generate(
			this.modelClass,
			'random',
			overrides
		);
		return new this.modelClass(data);
	}

	sample(overrides?: Partial<TInterface>): TInstance {
		const data = this.mockGenerator.generate(
			this.modelClass,
			'sample',
			overrides
		);
		return new this.modelClass(data);
	}

	minimal(overrides?: Partial<TInterface>): TInstance {
		const data = this.mockGenerator.generate(
			this.modelClass,
			'minimal',
			overrides
		);
		return new this.modelClass(data);
	}

	full(overrides?: Partial<TInterface>): TInstance {
		const data = this.mockGenerator.generate(
			this.modelClass,
			'full',
			overrides
		);
		return new this.modelClass(data);
	}

	interfaceEmpty(overrides?: Partial<TInterface>): TInterface {
		return this.mockGenerator.generate(this.modelClass, 'empty', overrides);
	}

	interfaceRandom(overrides?: Partial<TInterface>): TInterface {
		return this.mockGenerator.generate(
			this.modelClass,
			'random',
			overrides
		);
	}

	interfaceSample(overrides?: Partial<TInterface>): TInterface {
		return this.mockGenerator.generate(
			this.modelClass,
			'sample',
			overrides
		);
	}

	interfaceMinimal(overrides?: Partial<TInterface>): TInterface {
		return this.mockGenerator.generate(
			this.modelClass,
			'minimal',
			overrides
		);
	}

	interfaceFull(overrides?: Partial<TInterface>): TInterface {
		return this.mockGenerator.generate(this.modelClass, 'full', overrides);
	}

	array(
		count: number,
		type: MockType = 'random',
		overrides?: (index: number) => Partial<TInterface>
	): TInstance[] {
		if (count < 0) {
			throw new Error(`Count must be non-negative, got ${count}`);
		}
		if (count === 0) {
			return [];
		}
		const dataArray = this.mockGenerator.generateArray(
			this.modelClass,
			count,
			type,
			overrides
		);
		return dataArray.map((data) => new this.modelClass(data));
	}

	interfaceArray(
		count: number,
		type: MockType = 'random',
		overrides?: (index: number) => Partial<TInterface>
	): TInterface[] {
		if (count < 0) {
			throw new Error(`Count must be non-negative, got ${count}`);
		}
		if (count === 0) {
			return [];
		}
		return this.mockGenerator.generateArray(
			this.modelClass,
			count,
			type,
			overrides
		);
	}
}
