import type { IBenchScenario } from '../bench.types';

export const scenario: IBenchScenario = {
	key: 'rules',
	benchNum: 8,
	appTypes: ['all', 'api'],
	values: {
		QuickModel: 1_123_343,
		'class-validator': 131_689,
		joi: 105_696,
		vest: 8_916,
		'Plain JS': null,
		TypeBox: null,
		valibot: null,
		Zod: null,
		'class-transformer': null,
		yup: null,
		arktype: null,
		superjson: null,
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
