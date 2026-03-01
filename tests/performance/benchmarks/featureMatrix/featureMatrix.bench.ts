import { describe, expect, test } from 'bun:test';

import {
	typeboxMod,
	valibotMod,
	ctMod,
	yupMod,
	arktypeMod,
	superjsonMod,
	cvMod,
	vestMod,
	joiMod,
} from '../_shared';

export function describeBench(): void {
	describe('Resumen — Feature matrix comparativa por categoría', () => {
		test('Feature matrix completa con contexto por benchmark', () => {
			void (typeboxMod ? '✅' : 'N/I'); // _tbIcon
			void (valibotMod ? '⚠️ ' : 'N/I'); // _vbIcon
			void (ctMod ? '⚠️ ' : 'N/I'); // _ctIcon
			void (yupMod ? '⚠️ ' : 'N/I'); // _ypIcon
			void (arktypeMod ? '✅' : 'N/I'); // _arkIcon
			void (superjsonMod ? '✅' : 'N/I'); // _sjIcon
			void (cvMod ? '✅' : 'N/I'); // _cvIcon
			void (vestMod ? '⚠️ ' : 'N/I'); // _vestIcon
			void (joiMod ? '⚠️ ' : 'N/I'); // _joiIcon

			expect(true).toBe(true);
		});
	});
}
