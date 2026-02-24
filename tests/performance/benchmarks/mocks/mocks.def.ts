import type { IBenchScenario } from '../bench.types';

export const scenario: IBenchScenario = {
	key: 'mocks',
	benchNum: 5,
	appTypes: ['all', 'testing', 'mock'],
	values: {
		'Plain JS': 2_004_008,
		QuickModel: 103_659,
		'faker (manual)': 28_577,
		TypeBox: null,
		valibot: null,
		Zod: null,
		'class-transformer': null,
		yup: null,
		arktype: null,
		joi: null,
		superjson: null,
		'class-validator': null,
		vest: null,
		'QuickModel @QAlias': null,
		'Plain JS JSON.stringify': null,
		'QuickModel isDirty': null,
		'yup async': null,
		'joi async': null,
		'QuickModel async': null,
		'QuickModel createMany': null,
	},
};
