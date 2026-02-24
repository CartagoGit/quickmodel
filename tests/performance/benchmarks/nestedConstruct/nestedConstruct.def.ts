import type { IBenchScenario } from '../bench.types';

export const scenario: IBenchScenario = {
	key: 'nestedConstruct',
	benchNum: 11,
	appTypes: ['all', 'ddd', 'data'],
	values: {
		'Plain JS': 3_620_565,
		'class-transformer': 68_593,
		QuickModel: 43_943,
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
		'QuickModel @QAlias': null,
		'Plain JS JSON.stringify': null,
		'QuickModel isDirty': null,
		'yup async': null,
		'joi async': null,
		'QuickModel async': null,
		'QuickModel createMany': null,
	},
};
