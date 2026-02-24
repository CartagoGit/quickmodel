import type { IBenchScenario } from '../bench.types';

export const scenario: IBenchScenario = {
	key: 'bulkConstruct',
	benchNum: 13,
	appTypes: ['all', 'data'],
	values: {
		'Plain JS': 53_135,
		'class-transformer': 512,
		Zod: 9_181,
		QuickModel: 2_000,
		'QuickModel createMany': 223,
		TypeBox: null,
		valibot: null,
		yup: null,
		arktype: null,
		superjson: null,
		'class-validator': null,
		vest: null,
		joi: null,
		'faker (manual)': null,
		'QuickModel @QAlias': null,
		'Plain JS JSON.stringify': null,
		'QuickModel isDirty': null,
		'yup async': null,
		'joi async': null,
		'QuickModel async': null,
	},
};
