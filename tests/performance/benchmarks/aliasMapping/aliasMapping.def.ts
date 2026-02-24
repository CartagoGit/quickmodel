import type { IBenchScenario } from '../bench.types';

export const scenario: IBenchScenario = {
	key: 'aliasMapping',
	benchNum: 9,
	appTypes: ['all', 'api', 'ddd'],
	values: {
		'Plain JS': 35_149_385,
		'class-transformer': 68_334,
		QuickModel: 250_000,
		'QuickModel @QAlias': 111_834,
		TypeBox: null,
		valibot: null,
		Zod: null,
		yup: null,
		arktype: null,
		superjson: null,
		'class-validator': null,
		vest: null,
		joi: null,
		'faker (manual)': null,
		'Plain JS JSON.stringify': null,
		'QuickModel isDirty': null,
		'yup async': null,
		'joi async': null,
		'QuickModel async': null,
		'QuickModel createMany': null,
	},
};
