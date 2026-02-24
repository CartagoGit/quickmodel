import type { IBenchScenario } from '../bench.types';

export const scenario: IBenchScenario = {
	key: 'serialization',
	benchNum: 3,
	appTypes: ['all', 'data'],
	values: {
		'Plain JS': 1_788_269,
		superjson: 51_459,
		'class-transformer': 56_124,
		QuickModel: 58_245,
		TypeBox: null,
		valibot: null,
		Zod: null,
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
