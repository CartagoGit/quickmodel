import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '../../src/index';

describe('Security: Map Prototype Poisoning', () => {
	test('should prevent Deserialization of __proto__ keys', () => {
		interface IData {
			dict: Map<string, any>;
		}

		@Quick({ dict: Map })
		class Data extends QModel<IData> {
			declare dict: Map<string, any>;
		}

		const payload = {
			dict: [['__proto__', { poisoned: true }]],
		};

		const instance = new Data(payload);

		// Verify Map HAS the key (Safe in Map, dangerous only if converted to Object unchecked)
		expect(instance.dict.has('__proto__')).toBe(true);
	});

	test('should prevent Serialization of __proto__ keys (Defense in Depth)', () => {
		interface IData {
			dict: Map<string, any>;
		}

		@Quick({ dict: Map })
		class Data extends QModel<IData> {
			declare dict: Map<string, any>;
		}

		// Manually inject bad key (bypassing deserializer)
		const instance = new Data({ dict: [] });
		instance.dict.set('__proto__', { poisoned: true });

		// Ensure injection worked manually
		expect(instance.dict.has('__proto__')).toBe(true);

		// Serialize
		const serialized = instance.$qSerialize() as any;

		// Verify key was stripped during serialization
		const proto = Object.getPrototypeOf(serialized.dict);

		// Should be standard Object prototype, NOT the poisoned one
		expect(proto).toBe(Object.prototype);
		expect(proto.poisoned).toBeUndefined();
	});
});
