// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * TDD tests — Capa 2/3: fromFormData() y toFormData()
 *
 * Propuesta G: FormData ↔ QModel
 *
 * Fase:  🔴 RED (estos tests deben fallar antes de la implementación)
 */

import { describe, test, expect } from 'bun:test';
import { QModel } from '@/core/models/quick.model';
import { Quick } from '@/core/decorators/quick.decorator';
import type {
	IFileSerialized,
	IBlobSerialized,
} from '@/transformers/web-apis.transformer';

// =========================================================================
// Modelos de prueba
// =========================================================================

interface IUploadForm {
	userId: string;
	title: string;
	avatar: IFileSerialized | null;
	thumbnail: IBlobSerialized | null;
}

@Quick(
	{ userId: String, title: String, avatar: File, thumbnail: Blob },
	{ unknownPropertyPolicy: 'strip' }
)
class UploadForm extends QModel<IUploadForm> {
	declare userId: string;
	declare title: string;
	declare avatar: File | null;
	declare thumbnail: Blob | null;
}

interface ISimpleForm {
	name: string;
	age: string;
}

@Quick({ name: String, age: String }, { unknownPropertyPolicy: 'strip' })
class SimpleForm extends QModel<ISimpleForm> {
	declare name: string;
	declare age: string;
}

// =========================================================================
// fromFormData — primitivos y coerción
// =========================================================================

describe('fromFormData: primitivos y coerción loose', () => {
	test('extrae string del FormData', () => {
		const formData = new FormData();
		formData.append('name', 'Alice');
		formData.append('age', '30');

		const dto = SimpleForm.fromFormData(formData);

		expect(dto.name).toBe('Alice');
		expect(dto.age).toBe('30');
	});

	test('campo ausente → undefined/null en el modelo', () => {
		const formData = new FormData();
		formData.append('name', 'Bob');
		// age no aparece en el FormData

		const dto = SimpleForm.fromFormData(formData);

		expect(dto.name).toBe('Bob');
	});

	test('retorna instancia del modelo correcto', () => {
		const formData = new FormData();
		formData.append('name', 'Celia');
		formData.append('age', '25');

		const dto = SimpleForm.fromFormData(formData);

		expect(dto).toBeInstanceOf(SimpleForm);
	});
});

// =========================================================================
// fromFormData — auto-detección de File/Blob
// =========================================================================

describe('fromFormData: auto-detección File/Blob (fileSource: auto)', () => {
	test('File object en FormData → File en modelo', () => {
		const formData = new FormData();
		formData.append('userId', '42');
		formData.append('title', 'Mi foto');
		const file = new File(['bytes'], 'avatar.jpg', { type: 'image/jpeg' });
		formData.append('avatar', file);

		const dto = UploadForm.fromFormData(formData);

		expect(dto.avatar).toBeInstanceOf(File);
		expect((dto.avatar as File).name).toBe('avatar.jpg');
	});

	test('Blob object en FormData → Blob en modelo', () => {
		const formData = new FormData();
		formData.append('userId', '1');
		formData.append('title', 'test');
		const blob = new Blob(['img data'], { type: 'image/png' });
		formData.append('thumbnail', blob);

		const dto = UploadForm.fromFormData(formData);

		expect(dto.thumbnail).toBeInstanceOf(Blob);
	});

	test('string data:URI en FormData → Blob en modelo (fileSource: base64)', () => {
		const formData = new FormData();
		formData.append('userId', '1');
		formData.append('title', 'test');
		formData.append('thumbnail', 'data:image/png;base64,aGVsbG8=');

		const dto = UploadForm.fromFormData(formData, { fileSource: 'base64' });

		expect(dto.thumbnail).toBeInstanceOf(Blob);
	});

	test('string ruta en FormData con fileSource: reference → string en modelo', () => {
		// Modelo que acepta string como avatar (referencia al recurso)
		interface IRefForm {
			userId: string;
			title: string;
			avatar: string | null;
		}

		@Quick(
			{ userId: String, title: String, avatar: String },
			{ unknownPropertyPolicy: 'strip' }
		)
		class RefForm extends QModel<IRefForm> {
			declare userId: string;
			declare title: string;
			declare avatar: string | null;
		}

		const formData = new FormData();
		formData.append('userId', '5');
		formData.append('title', 'remote');
		formData.append('avatar', '/storage/users/42/foto.jpg');

		// Con fileSource 'reference', el string queda como string (sin deserializar como binario)
		const dto = RefForm.fromFormData(formData, { fileSource: 'reference' });

		expect(typeof dto.avatar).toBe('string');
		expect(dto.avatar).toBe('/storage/users/42/foto.jpg');
	});
});

// =========================================================================
// fromFormData — override por campo (fields)
// =========================================================================

describe('fromFormData: override por campo (fields)', () => {
	test('fields override individual: avatar binary, thumbnail base64', () => {
		const formData = new FormData();
		formData.append('userId', '10');
		formData.append('title', 'test');
		const file = new File(['bytes'], 'doc.pdf', {
			type: 'application/pdf',
		});
		formData.append('avatar', file);
		formData.append('thumbnail', 'data:image/png;base64,aGVsbG8=');

		const dto = UploadForm.fromFormData(formData, {
			fields: {
				avatar: 'binary',
				thumbnail: 'base64',
			},
		});

		expect(dto.avatar).toBeInstanceOf(File);
		expect(dto.thumbnail).toBeInstanceOf(Blob);
	});
});

// =========================================================================
// toFormData — primitivos
// =========================================================================

describe('toFormData: primitivos', () => {
	test('campos string → FormData entries correctas', async () => {
		const dto = new SimpleForm({ name: 'Dave', age: '22' });
		const formData = await dto.$qm.toFormData();

		expect(formData).toBeInstanceOf(FormData);
		expect(formData.get('name')).toBe('Dave');
		expect(formData.get('age')).toBe('22');
	});

	test('campo null → no aparece en FormData (o aparece como vacío)', async () => {
		const dto = new UploadForm({
			userId: '1',
			title: 'test',
			avatar: null,
			thumbnail: null,
		});
		const formData = await dto.$qm.toFormData();

		expect(formData).toBeInstanceOf(FormData);
		// Los campos null/undefined no se incluyen como binarios
		// Pueden no aparecer o aparecer como 'null'
	});
});

// =========================================================================
// toFormData — File y Blob (fileMode: auto/binary)
// =========================================================================

describe('toFormData: File y Blob con fileMode default', () => {
	test('File → append(key, File) en FormData', async () => {
		const file = new File(['photo'], 'foto.jpg', { type: 'image/jpeg' });
		const dto = new UploadForm({
			userId: '1',
			title: 'test',
			avatar: file as unknown as IFileSerialized, // @quickmodel-rule-ignore: no-as-unknown
			thumbnail: null,
		});

		const formData = await dto.$qm.toFormData();
		const entry = formData.get('avatar');

		expect(entry).toBeInstanceOf(File);
		expect((entry as File).name).toBe('foto.jpg');
	});

	test('Blob → append(key, Blob) en FormData', async () => {
		const blob = new Blob(['img'], { type: 'image/png' });
		const dto = new UploadForm({
			userId: '1',
			title: 'test',
			avatar: null,
			thumbnail: blob as unknown as IBlobSerialized, // @quickmodel-rule-ignore: no-as-unknown
		});

		const formData = await dto.$qm.toFormData();
		const entry = formData.get('thumbnail');

		expect(entry).toBeInstanceOf(Blob);
	});
});

// =========================================================================
// toFormData — fileMode: reference
// =========================================================================

describe('toFormData: fileMode reference', () => {
	test('File → append(key, file.name) como string', async () => {
		const file = new File(['bytes'], 'report.pdf', {
			type: 'application/pdf',
		});
		const dto = new UploadForm({
			userId: '1',
			title: 'test',
			avatar: file as unknown as IFileSerialized, // @quickmodel-rule-ignore: no-as-unknown
			thumbnail: null,
		});

		const formData = await dto.$qm.toFormData({ fileMode: 'reference' });
		const entry = formData.get('avatar');

		expect(typeof entry).toBe('string');
		expect(entry).toBe('report.pdf');
	});

	test('Blob sin nombre → append como "[Blob]"', async () => {
		const blob = new Blob(['data'], { type: 'image/png' });
		const dto = new UploadForm({
			userId: '1',
			title: 'test',
			avatar: null,
			thumbnail: blob as unknown as IBlobSerialized, // @quickmodel-rule-ignore: no-as-unknown
		});

		const formData = await dto.$qm.toFormData({ fileMode: 'reference' });
		const entry = formData.get('thumbnail');

		expect(entry).toBe('[Blob]');
	});
});

// =========================================================================
// toFormData — fileMode: base64
// =========================================================================

describe('toFormData: fileMode base64', () => {
	test('Blob → append con data:URI (base64)', async () => {
		const blob = new Blob([Uint8Array.from([104, 101, 108, 108, 111])], {
			type: 'text/plain',
		});
		const dto = new UploadForm({
			userId: '1',
			title: 'test',
			avatar: null,
			thumbnail: blob as unknown as IBlobSerialized, // @quickmodel-rule-ignore: no-as-unknown
		});

		const formData = await dto.$qm.toFormData({ fileMode: 'base64' });
		const entry = formData.get('thumbnail') as string;

		expect(typeof entry).toBe('string');
		expect(entry).toMatch(/^data:text\/plain/);
		expect(entry).toContain(';base64,');
	});
});

// =========================================================================
// Round-trip: fromFormData → toFormData
// =========================================================================

describe('Round-trip: fromFormData → toFormData', () => {
	test('File round-trip (binary)', async () => {
		const formData1 = new FormData();
		formData1.append('userId', '7');
		formData1.append('title', 'profile');
		const file = new File(['byte'], 'profile.png', { type: 'image/png' });
		formData1.append('avatar', file);

		const dto = UploadForm.fromFormData(formData1);
		const formData2 = await dto.$qm.toFormData();

		expect(formData2.get('avatar')).toBeInstanceOf(File);
		expect((formData2.get('avatar') as File).name).toBe('profile.png');
	});

	test('primitivos: userId y title se preservan', async () => {
		const formData1 = new FormData();
		formData1.append('userId', '99');
		formData1.append('title', 'Revisión enero');
		formData1.append('avatar', new File([], 'x.bin'));

		const dto = UploadForm.fromFormData(formData1);
		const formData2 = await dto.$qm.toFormData();

		expect(formData2.get('userId')).toBe('99');
		expect(formData2.get('title')).toBe('Revisión enero');
	});
});
