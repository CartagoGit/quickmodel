/**
 * TDD tests — @QType({ fileMode }) per-field decorator
 *
 * Propuesta G: FormData ↔ QModel — Tarea 3
 * `@QType({ fileMode })` configura el modo de serialización de un campo binario
 * de forma permanente en el decorador.
 *
 * Precedencia (mayor → menor):
 *   serialize({ fileMode }) — global call option
 *     < @QType({ fileMode })   — per-field decorator default
 */

import { describe, test, expect } from 'bun:test';
import { QModel } from '@/core/models/quick.model';
import { Quick } from '@/core/decorators/quick.decorator';
import { QType } from '@/core/decorators/qtype.decorator';

// =========================================================================
// Modelos de prueba
// =========================================================================

interface IProfileDto {
	name: string;
	avatar: File | null;
	signature: Blob | null;
	raw: ArrayBuffer | null;
}

// Modelo con fileMode 'reference' en el decorador (forma options-only)
@Quick(
	{ name: String, avatar: File, signature: Blob, raw: ArrayBuffer },
	{ unknownPropertyPolicy: 'strip' }
)
class ProfileDto extends QModel<IProfileDto> {
	declare name: string;

	@QType({ fileMode: 'reference' })
	declare avatar: File | null;

	@QType({ fileMode: 'reference' })
	declare signature: Blob | null;

	@QType({ fileMode: 'reference' })
	declare raw: ArrayBuffer | null;
}

// Modelo con fileMode 'reference' en la forma explícita @QType(File, { fileMode })
@Quick(
	{ name: String, avatar: File, signature: Blob },
	{ unknownPropertyPolicy: 'strip' }
)
class ProfileExplicitDto extends QModel<{
	name: string;
	avatar: File | null;
	signature: Blob | null;
}> {
	declare name: string;

	@QType(File, { fileMode: 'reference' })
	declare avatar: File | null;

	@QType(Blob, { fileMode: 'reference' })
	declare signature: Blob | null;
}

// Modelo con campos mixtos — solo algunos con fileMode en decorador
interface IMixedDto {
	name: string;
	decoratedAvatar: File | null;
	rawAvatar: File | null;
}

@Quick(
	{ name: String, decoratedAvatar: File, rawAvatar: File },
	{ unknownPropertyPolicy: 'strip' }
)
class MixedDto extends QModel<IMixedDto> {
	declare name: string;

	@QType({ fileMode: 'reference' })
	declare decoratedAvatar: File | null;

	declare rawAvatar: File | null; // sin fileMode en decorador
}

// =========================================================================
// Helpers
// =========================================================================

function makeFile(name = 'foto.jpg', type = 'image/jpeg', size = 1024): File {
	const buf = new Uint8Array(size).fill(0);
	return new File([buf], name, { type, lastModified: 1709123456000 });
}

function makeBlob(type = 'image/png', size = 512): Blob {
	const buf = new Uint8Array(size).fill(0);
	return new Blob([buf], { type });
}

// =========================================================================
// Tests — forma options-only: @QType({ fileMode })
// =========================================================================

describe("@QType({ fileMode: 'reference' }) — forma options-only", () => {
	test('File se serializa como su nombre cuando el decorador es @QType({ fileMode: reference })', () => {
		const dto = new ProfileDto({
			name: 'Alice',
			avatar: makeFile('profile.png'),
			signature: null,
			raw: null,
		});
		const result = dto.serialize();
		expect(result.avatar).toBe('profile.png');
	});

	test("Blob se serializa como '[Blob]' cuando el decorador es @QType({ fileMode: reference })", () => {
		const dto = new ProfileDto({
			name: 'Alice',
			avatar: null,
			signature: makeBlob(),
			raw: null,
		});
		const result = dto.serialize();
		expect(result.signature).toBe('[Blob]');
	});

	test("ArrayBuffer se serializa como '[binary]' cuando el decorador es @QType({ fileMode: reference })", () => {
		const dto = new ProfileDto({
			name: 'Alice',
			avatar: null,
			signature: null,
			raw: new ArrayBuffer(64),
		});
		const result = dto.serialize();
		expect(result.raw).toBe('[binary]');
	});

	test('los campos string no se ven afectados por los decoradores @QType en otros campos', () => {
		const dto = new ProfileDto({
			name: 'Alice',
			avatar: makeFile(),
			signature: null,
			raw: null,
		});
		const result = dto.serialize();
		expect(result.name).toBe('Alice');
	});
});

// =========================================================================
// Tests — forma explícita: @QType(File, { fileMode })
// =========================================================================

describe("@QType(File, { fileMode: 'reference' }) — forma explícita con tipo", () => {
	test('File se serializa como nombre de archivo en la forma explícita', () => {
		const dto = new ProfileExplicitDto({
			name: 'Bob',
			avatar: makeFile('doc.pdf', 'application/pdf'),
			signature: null,
		});
		const result = dto.serialize();
		expect(result.avatar).toBe('doc.pdf');
	});

	test("Blob se serializa como '[Blob]' en la forma explícita @QType(Blob, { fileMode })", () => {
		const dto = new ProfileExplicitDto({
			name: 'Bob',
			avatar: null,
			signature: makeBlob('image/gif', 256),
		});
		const result = dto.serialize();
		expect(result.signature).toBe('[Blob]');
	});
});

// =========================================================================
// Tests — precedencia: call option > decorador
// =========================================================================

describe('precedencia: serialize({ fileMode }) sobreescribe el decorador', () => {
	test("call option 'binary' revierte al POJO de metadatos aunque el decorador diga 'reference'", () => {
		const dto = new ProfileDto({
			name: 'Alice',
			avatar: makeFile('img.jpg', 'image/jpeg', 1024),
			signature: null,
			raw: null,
		});
		const result = dto.serialize({ fileMode: 'binary' });
		// call option 'binary' gana sobre el decorador 'reference'
		expect(typeof result.avatar).toBe('object');
		expect((result.avatar as Record<string, unknown>)?.name).toBe(
			'img.jpg'
		);
	});

	test("sin call option, el decorador 'reference' se aplica", () => {
		const dto = new ProfileDto({
			name: 'Alice',
			avatar: makeFile('img.jpg'),
			signature: null,
			raw: null,
		});
		const result = dto.serialize(); // sin call option
		expect(result.avatar).toBe('img.jpg');
	});
});

// =========================================================================
// Tests — campos mixtos: solo los campos decorados se ven afectados
// =========================================================================

describe('@QType({ fileMode }) solo afecta al campo decorado', () => {
	test('el campo con decorador se serializa como reference, el otro como POJO', () => {
		const dto = new MixedDto({
			name: 'Test',
			decoratedAvatar: makeFile('decorated.jpg'),
			rawAvatar: makeFile('raw.jpg'),
		});
		const result = dto.serialize();

		// Con decorador → reference
		expect(result.decoratedAvatar).toBe('decorated.jpg');
		// Sin decorador → POJO de metadatos (comportamiento por defecto)
		expect(typeof result.rawAvatar).toBe('object');
		expect((result.rawAvatar as Record<string, unknown>)?.name).toBe(
			'raw.jpg'
		);
	});
});
