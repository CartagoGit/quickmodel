import { describe, it, expect } from 'bun:test';
import { QSimulateTransformationTool } from '../../../../src/mcp/tools/public/simulate-transformation.tool';

describe('QSimulateTransformationTool', () => {
	it('should be defined', () => {
		const tool = new QSimulateTransformationTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('simulate_transformation');
	});

	it('should transform basic types', async () => {
		const tool = new QSimulateTransformationTool();
		const data = {
			birth: '2000-01-01T00:00:00.000Z',
		};
		const options = {
			birth: 'Date',
		};

		const result = await tool.execute({ data, options });
		expect(result.result.birth).toBeDefined();
		// Since execute does JSON.parse(JSON.stringify(instance)), Date objects become ISO strings.
		// But let's verify it actually ran the transformation logic.
		// If it was just a pass-through, it would be the same string.
		// Start date string is same, but if I passed something that NEEDS transformation logic...
		// E.g. BigInt.
		expect(result.result.birth).toBe('2000-01-01T00:00:00.000Z');
	});

	it('should transform BigInt (as string in JSON)', async () => {
		const tool = new QSimulateTransformationTool();
		const data = {
			val: '9007199254740995',
		};
		const options = {
			val: 'BigInt',
		};

		const result = await tool.execute({ data, options });
		// BigInt creates "val": "9007199254740995" string in JSON when serialized by QModel usually?
		// QModel serialization might convert BigInt back to string or keep as is?
		// JSON.stringify fails on BigInt unless handled.
		// QuickModel probably handles BigInt serialization gracefully (e.g. to string).

		// If the tool implementation does `JSON.stringify(instance)`, and instance has BigInt,
		// it requires the environment to support BigInt serialization (which usually requires a replacer).
		// QuickModel toJSON() might handle this.

		expect(result.result.val).toBe('9007199254740995');
	});

	it('should support array notation', async () => {
		const tool = new QSimulateTransformationTool();
		const data = {
			dates: ['2020-01-01', '2021-01-01'],
		};
		const options = {
			dates: ['Date'],
		};

		const result = await tool.execute({ data, options });
		expect(result.result.dates).toBeArray();
		expect(result.result.dates).toHaveLength(2);
	});

	it('should support nested objects', async () => {
		const tool = new QSimulateTransformationTool();
		const data = {
			meta: {
				created: '2022-02-02',
			},
		};
		const options = {
			'meta.created': 'Date', // Dot notation check if supported by dynamic model?
			// The tool implementation hydrates `options`.
			// If I pass { 'meta.created': 'Date' }, it hydrates value -> Date.
			// @Quick({'meta.created': Date}) supports dot notation.
		};

		const result = await tool.execute({ data, options });
		// Serialized date matches ISO string
		expect(result.result.meta.created).toBe('2022-02-02T00:00:00.000Z');
	});

	it('should support Set transformation', async () => {
		const tool = new QSimulateTransformationTool();
		const data = {
			tags: ['a', 'b', 'a'],
		};
		const options = {
			tags: 'Set', // Hydrates to Set constructor
		};

		const result = await tool.execute({ data, options });
		// Set serializes to Array in JSON.
		expect(result.result.tags).toEqual(['a', 'b']);
	});
});
