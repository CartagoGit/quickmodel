import type { IBenchScenario } from '../bench.types';

export const scenario: IBenchScenario = {
	key: 'typeSerialization',
	benchNum: 7,
	appTypes: ['all', 'data'],
	values: {
		'Plain JS': 697_496,
		superjson: 40_772,
		QuickModel: 28_157,
		TypeBox: null,
		valibot: null,
		Zod: null,
		'class-transformer': null,
		yup: null,
		arktype: null,
		joi: null,
		'class-validator': null,
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
