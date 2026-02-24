import type { IBenchScenario } from '../bench.types';

export const scenario: IBenchScenario = {
	key: 'batch',
	benchNum: 4,
	appTypes: ['all', 'data'],
	values: {
		TypeBox: 7_295,
		valibot: 10_221,
		Zod: 12_082,
		yup: 109,
		arktype: 42_699,
		joi: 256,
		QuickModel: 1_794,
		'Plain JS': null,
		'class-transformer': null,
		'class-validator': null,
		superjson: null,
		vest: null,
		'faker (manual)': null,
		'QuickModel @QAlias': null,
		'Plain JS JSON.stringify': null,
		'QuickModel isDirty': null,
		'yup async': null,
		'joi async': null,
		'QuickModel async': null,
		'QuickModel createMany': null,
	},
};
