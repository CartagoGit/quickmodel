import type { IBenchScenario } from '../bench.types';

export const scenario: IBenchScenario = {
	key: 'asyncRules',
	benchNum: 12,
	appTypes: ['all', 'api'],
	values: {
		QuickModel: 127_369, // modo paralelo — comparación justa vs joi async/yup async
		joi: 8_000,
		yup: 4_500,
		'yup async': 62_758,
		'joi async': 135_775,
		'QuickModel async': null, // ya representado en QuickModel (modo paralelo)
		'Plain JS': null,
		TypeBox: null,
		valibot: null,
		Zod: null,
		'class-transformer': null,
		anktype: null,
		superjson: null,
		'class-validator': null,
		vest: null,
		'faker (manual)': null,
		'QuickModel @QAlias': null,
		'Plain JS JSON.stringify': null,
		'QuickModel isDirty': null,
		'QuickModel createMany': null,
	},
};
