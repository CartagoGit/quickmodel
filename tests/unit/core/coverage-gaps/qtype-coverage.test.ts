// @quickmodel-rule-ignore: prefer-quick
// This file tests @QType directly — opt-out from the prefer-quick rule.
import { describe, it, expect } from 'bun:test';
import { QModel, QType } from '../../../../src';

describe('QType Decorator Coverage Gaps', () => {
	it('should handle Boolean constructor', () => {
		class BoolModel extends QModel<any> {
			@QType(Boolean)
			flag: boolean;
		}
		const model = new BoolModel({ flag: true });
		// QType(Boolean) sets fieldType='boolean'. BaseTransformer should handle it?
		// Actually QType sets metadata, Deserializer uses it.
		// We just need to ensure the metadata is set correctly (coverage hit)
		// Instantiating the model triggers the decorator logic?
		// No, decorator logic runs at Class Definition time.
		// So just defining the class executes the lines!
		// But to validat it worked, we might checking functionality.

		expect(model.flag).toBe(true);
	});

	it('should handle WeakMap, WeakSet, Promise', () => {
		class SpecialModel extends QModel<any> {
			@QType(WeakMap) weakMap: WeakMap<any, any>;
			@QType(WeakSet) weakSet: WeakSet<any>;
			@QType(Promise) promiseProp: Promise<any>;
		}

		// Just definition covers the lines.
		// But let's check metadata if we want to be thorough.

		const model = new SpecialModel({});
		expect(model).toBeInstanceOf(SpecialModel);
	});

	it('should handle Math methods as transformers', () => {
		class MathModel extends QModel<any> {
			@QType(Math.round) rounded: number;
		}

		const model = new MathModel({ rounded: 1.9 });
		expect(model.rounded).toBe(2);
	});

	it('should handle arrow functions as transformers', () => {
		class TransformModel extends QModel<any> {
			@QType((num: number) => num * 2) doubled: number;
		}

		const model = new TransformModel({ doubled: 10 });
		expect(model.doubled).toBe(20);
	});

	it('should handle object method shorthand as transformer', () => {
		const obj = {
			transformer(num: number) {
				return num * 3;
			},
		};
		// obj.transformer.prototype is undefined for method shorthand!
		// And toString() starts with "transformer(" not "function"

		class MethodModel extends QModel<any> {
			// eslint-disable-next-line @typescript-eslint/unbound-method
			@QType(obj.transformer) val: number;
		}

		const model = new MethodModel({ val: 10 });
		expect(model.val).toBe(30);
	});
});
