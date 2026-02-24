import type { IBenchScenario } from '../bench.types';

export const scenario: IBenchScenario = {
	key: 'coercion',
	benchNum: 2,
	appTypes: ['all', 'ddd'],
	values: {
		valibot: 469_991,
		Zod: 228_901,
		'class-transformer': 72_726,
		'class-validator': 795_608,
		QuickModel: 37_849,
		'Plain JS': null,
		TypeBox: null,
		yup: null,
		arktype: null,
		joi: null,
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
