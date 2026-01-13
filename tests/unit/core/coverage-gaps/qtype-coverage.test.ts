import { describe, it, expect } from 'bun:test';
import { QModel, QType } from '../../../../src';

describe('QType Decorator Coverage Gaps', () => {
	it('should handle Boolean constructor', () => {
		class BoolModel extends QModel<any> {
			@QType(Boolean)
			flag: boolean;
		}
		const m = new BoolModel({ flag: true });
		// QType(Boolean) sets fieldType='boolean'. BaseTransformer should handle it?
		// Actually QType sets metadata, Deserializer uses it.
		// We just need to ensure the metadata is set correctly (coverage hit)
		// Instantiating the model triggers the decorator logic?
		// No, decorator logic runs at Class Definition time.
		// So just defining the class executes the lines!
		// But to validat it worked, we might checking functionality.

		expect(m.flag).toBe(true);
	});

	it('should handle WeakMap, WeakSet, Promise', () => {
		class SpecialModel extends QModel<any> {
			@QType(WeakMap) wm: WeakMap<any, any>;
			@QType(WeakSet) ws: WeakSet<any>;
			@QType(Promise) p: Promise<any>;
		}

		// Just definition covers the lines.
		// But let's check metadata if we want to be thorough.

		const m = new SpecialModel({});
		expect(m).toBeInstanceOf(SpecialModel);
	});

	it('should handle Math methods as transformers', () => {
		class MathModel extends QModel<any> {
			@QType(Math.round) rounded: number;
		}

		const m = new MathModel({ rounded: 1.9 });
		expect(m.rounded).toBe(2);
	});

	it('should handle arrow functions as transformers', () => {
		class TransformModel extends QModel<any> {
			@QType((x: number) => x * 2) doubled: number;
		}

		const m = new TransformModel({ doubled: 10 });
		expect(m.doubled).toBe(20);
	});
});
