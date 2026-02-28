// @quickmodel-rule-ignore: prefer-quick
// This file tests @QType directly — opt-out from the prefer-quick rule.
/**
 * Test: BigInt WITHOUT QBigInt symbol
 *
 * Verificar qué pasa cuando NO usas @QType(QBigInt)
 */

import { describe, test, expect } from 'bun:test';
import { QModel, IQImplements } from '@/index';
import { QType } from '@/decorators';

// ============================================================================
// Test Models
// ============================================================================

interface IAccountWithSymbol {
	id: string;
	balance: string;
}

type IAccountWithSymbolTransforms = {
	balance: bigint;
};

// ✅ CON BigInt symbol
class AccountWithSymbol
	extends QModel<IAccountWithSymbol>
	implements IQImplements<IAccountWithSymbol, IAccountWithSymbolTransforms>
{
	@QType() id!: string;
	@QType(BigInt) balance!: bigint; // 👈 CON symbol
}

// ❌ SIN QBigInt symbol (solo @QType())
class AccountWithoutSymbol
	extends QModel<IAccountWithSymbol>
	implements IQImplements<IAccountWithSymbol, IAccountWithSymbolTransforms>
{
	@QType() id!: string;
	@QType() balance!: bigint; // 👈 SIN symbol
}

// ============================================================================
// Tests
// ============================================================================

describe('BigInt WITHOUT QBigInt symbol', () => {
	const testData: IAccountWithSymbol = {
		id: 'acc-1',
		balance: '999999999999999999', // string en JSON
	};

	test('CON @QType(QBigInt) - funciona correctamente', () => {
		const account = new AccountWithSymbol(testData);

		console.log('CON symbol:', {
			balance: account.balance,
			type: typeof account.balance,
			isBigInt: typeof account.balance === 'bigint',
		});

		expect(typeof account.balance).toBe('bigint');
		expect(account.balance).toBe(999999999999999999n);
	});

	test('SIN @QType(QBigInt) - AHORA SÍ convierte a bigint automáticamente!', () => {
		const account = new AccountWithoutSymbol(testData);

		console.log('SIN symbol:', {
			balance: account.balance,
			type: typeof account.balance,
			isBigInt: typeof account.balance === 'bigint',
		});

		// ✅ Ahora SÍ convierte a bigint automáticamente!
		expect(typeof account.balance).toBe('bigint');
		expect(account.balance).toBe(999999999999999999n);
	});

	test('Verificar metadata de TypeScript - SÍ emite BigInt', () => {
		// TypeScript metadata para bigint
		const metadataWith = Reflect.getMetadata(
			'design:type',
			AccountWithSymbol.prototype,
			'balance'
		);
		const metadataWithout = Reflect.getMetadata(
			'design:type',
			AccountWithoutSymbol.prototype,
			'balance'
		);

		console.log('Metadata CON symbol:', metadataWith?.name);
		console.log('Metadata SIN symbol:', metadataWithout?.name);

		// ✅ TypeScript SÍ emite "BigInt" en metadata (con TypeScript 5.x+)
		expect(metadataWith).toBe(BigInt);
		expect(metadataWithout).toBe(BigInt);

		// Ambos funcionan ahora!
		console.log('\n✅ TypeScript emite BigInt correctamente');
		console.log('✅ El deserializador lo detecta automáticamente');
		console.log('✅ Ya NO necesitas @QType(QBigInt) obligatoriamente\n');
	});
});
