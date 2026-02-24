import type { IBenchScenario } from '../bench.types';

export const scenario: IBenchScenario = {
	key: 'isDirty',
	benchNum: 10,
	appTypes: ['all', 'ddd'],
	values: {
		QuickModel: 900_000,
		'Plain JS': 250_000,
		'Plain JS JSON.stringify': null, // stringify es una op diferente, no es competidor de isDirty
		'QuickModel isDirty': 99_664,
		TypeBox: null,
		valibot: null,
		Zod: null,
		'class-transformer': null,
		yup: null,
		anktype: null,
		superjson: null,
		'class-validator': null,
		vest: null,
		joi: null,
		'faker (manual)': null,
		'QuickModel @QAlias': null,
		'yup async': null,
		'joi async': null,
		'QuickModel async': null,
		'QuickModel createMany': null,
	},
};
