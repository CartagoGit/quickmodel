import type { IBenchScenario } from '../bench.types';

export const scenario: IBenchScenario = {
	key: 'validation',
	benchNum: 1,
	appTypes: ['all', 'api'],
	values: {
		'Plain JS': 40_899_796,
		TypeBox: 2_072_797,
		valibot: 2_840_264,
		Zod: 1_169_591,
		yup: 78_699,
		arktype: 7_054_176,
		joi: 221_666,
		QuickModel: 118_729,
		'class-transformer': null,
		'class-validator': null,
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
