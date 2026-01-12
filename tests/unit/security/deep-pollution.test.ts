import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';

describe('Security: Advanced Prototype Pollution', () => {
	it('should NOT allow setting __defineGetter__ type properties', () => {
		@Quick()
		class User extends QModel<any> {}

		const payload = {
			__defineGetter__: 'malicious',
		};

		const user = new User(payload);
		// Accessing accessing shouldn't crash or run code
		expect((user as any).__defineGetter__).not.toBe('malicious');
		// Use user explicitly to satisfy linter if strictly configured
		expect(user).toBeDefined();
	});

	it('should handle deep nested prototype pollution attempts in arrays', () => {
		@Quick()
		class Nested extends QModel<any> {
			declare list: any[];
		}

		const payload = JSON.parse(
			'{"list": [{"__proto__": {"polluted": true}}]}'
		);
		const _user = new Nested(payload);

		expect((Object.prototype as any).polluted).toBeUndefined();
	});

	it('should handle pollution attempts in Maps', () => {
		@Quick({
			map: Map,
		})
		class MapModel extends QModel<any> {
			declare map: Map<string, any>;
		}

		// Maps are populated from array of entries
		const payload = {
			map: [['__proto__', { polluted: true }]],
		};

		const instance = new MapModel(payload);
		expect((Object.prototype as any).polluted).toBeUndefined();
		// The key string "__proto__" might be in the map, which is fine for Map,
		// but we want to ensure it didn't pollute Object.prototype via assignment
		expect(instance.map.has('__proto__')).toBe(true);
	});
});
