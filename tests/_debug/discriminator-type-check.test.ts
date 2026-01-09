/**
 * Test para verificar que TypeGuardFunction ya no permite undefined
 * a menos que esté explícitamente declarado en los tipos
 */
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Discriminator Type Checking', () => {
	interface IContent {
		type: 'content';
		text: string;
	}

	interface IMetadata {
		type: 'metadata';
		tags: string[];
	}

	interface IData {
		items: (IContent | IMetadata)[];
	}

	class Content extends QModel<IContent> {
		declare type: 'content';
		declare text: string;
	}

	class Metadata extends QModel<IMetadata> {
		declare type: 'metadata';
		declare tags: string[];
	}

	test('discriminator function MUST return one of the declared types (no undefined)', () => {
		// ✅ Este código debe compilar sin errores
		@Quick(
			{
				items: [Content, Metadata],
			},
			{
				discriminators: {
					items: (data) => {
						// Debe devolver Content o Metadata, NO undefined
						if (data.type === 'content') return Content;
						if (data.type === 'metadata') return Metadata;
						// Fallback al primer tipo
						return Content; // ✅ OK
					},
				},
			}
		)
		class Data1 extends QModel<IData> {
			declare items: (Content | Metadata)[];
		}

		const data = new Data1({
			items: [
				{ type: 'content', text: 'text' },
				{ type: 'metadata', tags: ['tag1'] },
			],
		});

		expect(data.items[0]).toBeInstanceOf(Content);
		expect(data.items[1]).toBeInstanceOf(Metadata);
	});

	// Este test verifica que TypeScript rechace undefined cuando no está declarado
	// (No se puede hacer en runtime, solo en compile-time)
	test('TypeScript compilation check (manual verification)', () => {
		// ❌ Este código NO debería compilar si descomentas:
		// @Quick(
		//   {
		//     items: [Content, Metadata],
		//   },
		//   {
		//     discriminators: {
		//       items: (data) => {
		//         if (data.type === 'content') return Content;
		//         return undefined;  // ❌ Type error! undefined not in [Content, Metadata]
		//       },
		//     },
		//   }
		// )
		// class Data2 extends QModel<IData> {
		//   declare items: (Content | Metadata)[];
		// }

		expect(true).toBe(true);
	});
});
