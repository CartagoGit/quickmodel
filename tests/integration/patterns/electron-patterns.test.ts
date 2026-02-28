// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * Electron IPC Integration Patterns — QuickModel
 *
 * Covers: IPC boundary serialize/populate, unknownPropertyPolicy strip for
 *         cross-process safety, checkRules() in main before persist,
 *         contextBridge shared types, createMany() for local file loading,
 *         isDirty() in renderer for unsaved-changes confirmation
 *
 * No electron packages imported — pure QModel logic simulating IPC context.
 * serialize() simulates renderer→main; JSON.parse/stringify simulates IPC wire.
 */
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QField, QComputed } from '@/decorators';
import { qCheckRules } from '@/core/helpers/q-check-rules';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

interface IUserPrefs {
	theme: string;
	language: string;
	fontSize: number;
	notifications: boolean;
	autoSave: boolean;
}

interface IFileRecord {
	name: string;
	path: string;
	size: number;
	mimeType: string;
	modifiedAt: Date;
}

interface IAppConfig {
	apiUrl: string;
	timeout: number;
	debug: boolean;
	version: string;
}

@Quick(
	{
		theme: 'string',
		language: 'string',
		fontSize: 'number',
		notifications: 'boolean',
		autoSave: 'boolean',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserPrefsDto extends QModel<IUserPrefs> {
	@QField({ widget: 'input', label: 'Theme', required: true })
	@QRule(
		(val: string) => ['light', 'dark', 'system'].includes(val),
		'Invalid theme'
	)
	declare theme: string;

	@QField({ widget: 'input', label: 'Language', required: true })
	@QRule(
		(val: string) => val.length === 2 || val.length === 5,
		'Invalid locale'
	)
	declare language: string;

	@QField({ widget: 'input', label: 'Font Size' })
	@QRule((val: number) => val >= 10 && val <= 32, 'Font size out of range')
	declare fontSize: number;

	@QField({ label: 'Notifications', widget: 'checkbox' })
	declare notifications: boolean;

	@QField({ label: 'Auto Save', widget: 'checkbox' })
	declare autoSave: boolean;

	@QComputed()
	get themeClass(): string {
		return `theme-${this.theme}`;
	}
}

@Quick(
	{
		name: 'string',
		path: 'string',
		size: 'number',
		mimeType: 'string',
		modifiedAt: Date,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class FileRecordDto extends QModel<IFileRecord> {
	@QField({ widget: 'input', label: 'Name', required: true })
	@QRule((val: string) => val.length > 0, 'File name cannot be empty')
	declare name: string;

	@QField({ widget: 'input', label: 'Path', required: true })
	@QRule(
		(val: string) => val.startsWith('/') || val[1] === ':',
		'Invalid path'
	)
	declare path: string;

	@QField({ widget: 'input', label: 'Size' })
	@QRule((val: number) => val >= 0, 'Size cannot be negative')
	declare size: number;

	@QField({ widget: 'input', label: 'MIME Type' })
	declare mimeType: string;

	declare modifiedAt: Date;

	@QComputed()
	get sizeKb(): number {
		return Math.round(this.size / 1024);
	}

	@QComputed()
	get isImage(): boolean {
		return this.mimeType.startsWith('image/');
	}
}

@Quick(
	{
		apiUrl: 'string',
		timeout: 'number',
		debug: 'boolean',
		version: 'string',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class AppConfigDto extends QModel<IAppConfig> {
	@QField({ widget: 'input', label: 'API URL', required: true })
	@QRule(
		(val: string) => val.startsWith('http'),
		'API URL must use http/https'
	)
	declare apiUrl: string;

	@QField({ widget: 'input', label: 'Timeout' })
	@QRule(
		(val: number) => val > 0 && val <= 60000,
		'Timeout must be 1–60000ms'
	)
	declare timeout: number;

	@QField({ label: 'Debug Mode', widget: 'checkbox' })
	declare debug: boolean;

	@QField({ widget: 'input', label: 'Version', required: true })
	declare version: string;
}

// ---------------------------------------------------------------------------
// IPC wire simulation helpers
// ---------------------------------------------------------------------------

/** Simulates the IPC wire: JSON-clones the payload (like ipcRenderer.invoke) */
function simulateIpcWire<T>(data: T): T {
	return JSON.parse(JSON.stringify(data)) as T;
}

// ---------------------------------------------------------------------------
// 1. IPC boundary — serialize() in renderer, populate() in main
// ---------------------------------------------------------------------------

describe('IPC boundary — serialize/populate', () => {
	test('serialize() in renderer produces JSON-safe payload for ipcRenderer.invoke', () => {
		const dto = new UserPrefsDto({
			theme: 'dark',
			language: 'en',
			fontSize: 14,
			notifications: true,
			autoSave: true,
		});
		const payload = dto.serialize();
		expect(typeof payload).toBe('object');
		expect(payload).not.toBeInstanceOf(QModel);
		// JSON roundtrip (IPC wire)
		const transmitted = JSON.parse(JSON.stringify(payload));
		expect(transmitted.theme).toBe('dark');
	});

	test('populate() in main reconstructs QModel from IPC JSON payload', () => {
		const original = new UserPrefsDto({
			theme: 'light',
			language: 'fr',
			fontSize: 16,
			notifications: false,
			autoSave: true,
		});
		const wirePayload = simulateIpcWire(original.serialize());
		const reconstructed = new UserPrefsDto(wirePayload as IUserPrefs);
		expect(reconstructed.theme).toBe('light');
		expect(reconstructed.language).toBe('fr');
		expect(reconstructed.fontSize).toBe(16);
	});

	test('IPC roundtrip preserves all scalar values', () => {
		const dto = new AppConfigDto({
			apiUrl: 'https://api.example.com',
			timeout: 5000,
			debug: false,
			version: '1.2.3',
		});
		const wire = simulateIpcWire(dto.serialize());
		const restored = new AppConfigDto(wire as IAppConfig);
		expect(restored.apiUrl).toBe('https://api.example.com');
		expect(restored.timeout).toBe(5000);
		expect(restored.debug).toBe(false);
		expect(restored.version).toBe('1.2.3');
	});

	test('Date fields survive IPC JSON serialization as ISO string', () => {
		const dto = new FileRecordDto({
			name: 'report.pdf',
			path: '/home/user/report.pdf',
			size: 204800,
			mimeType: 'application/pdf',
			modifiedAt: new Date('2025-06-01T10:00:00.000Z'),
		});
		const wire = simulateIpcWire(dto.serialize());
		const restored = new FileRecordDto(wire as unknown as IFileRecord);
		// After IPC, Date was ISO string — QModel loose coercion restores Date
		expect(restored.modifiedAt).toBeInstanceOf(Date);
		expect(restored.modifiedAt.getFullYear()).toBe(2025);
	});
});

// ---------------------------------------------------------------------------
// 2. unknownPropertyPolicy: 'strip' — cross-context security
// ---------------------------------------------------------------------------

describe('unknownPropertyPolicy: strip — cross-process security', () => {
	test('strips __proto__ pollution attempts from IPC payload', () => {
		const malicious = {
			theme: 'dark',
			language: 'en',
			fontSize: 14,
			notifications: true,
			autoSave: false,
			__proto__: { polluted: true },
			constructor: { prototype: { polluted: true } },
		};
		const dto = new UserPrefsDto(malicious as IUserPrefs);
		expect(
			(dto as unknown as Record<string, unknown>)['polluted']
		).toBeUndefined();
	});

	test('strips extra injected fields from malicious renderer payload', () => {
		const payload = {
			theme: 'light',
			language: 'en',
			fontSize: 12,
			notifications: true,
			autoSave: true,
			adminOverride: true,
			_internalToken: 'secret',
		};
		const dto = new UserPrefsDto(payload as IUserPrefs);
		expect(
			(dto as unknown as Record<string, unknown>)['adminOverride']
		).toBeUndefined();
		expect(
			(dto as unknown as Record<string, unknown>)['_internalToken']
		).toBeUndefined();
	});

	test('valid fields are preserved after strip', () => {
		const dto = new UserPrefsDto({
			theme: 'system',
			language: 'es',
			fontSize: 18,
			notifications: false,
			autoSave: true,
		} as IUserPrefs);
		expect(dto.theme).toBe('system');
		expect(dto.fontSize).toBe(18);
	});
});

// ---------------------------------------------------------------------------
// 3. checkRules() in main before persist
// ---------------------------------------------------------------------------

describe('checkRules() in main process before persisting', () => {
	test('valid prefs pass checkRules() in main process handler', () => {
		const wirePayload = simulateIpcWire({
			theme: 'dark',
			language: 'en',
			fontSize: 14,
			notifications: true,
			autoSave: false,
		});
		const dto = new UserPrefsDto(wirePayload);
		const { valid } = qCheckRules(dto);
		expect(valid).toBe(true);
	});

	test('invalid theme from renderer fails validation in main', () => {
		const wirePayload = simulateIpcWire({
			theme: 'rainbow',
			language: 'en',
			fontSize: 14,
			notifications: true,
			autoSave: false,
		});
		const dto = new UserPrefsDto(wirePayload);
		const { valid, errors } = qCheckRules(dto);
		expect(valid).toBe(false);
		expect(errors.some((err) => err.field === 'theme')).toBe(true);
	});

	test('out-of-range fontSize rejected in main', () => {
		const dto = new UserPrefsDto({
			theme: 'light',
			language: 'en',
			fontSize: 100,
			notifications: false,
			autoSave: false,
		});
		const { valid, errors } = qCheckRules(dto);
		expect(valid).toBe(false);
		expect(errors.some((err) => err.field === 'fontSize')).toBe(true);
	});

	test('invalid API URL in AppConfig rejected in main', () => {
		const dto = new AppConfigDto({
			apiUrl: 'ftp://insecure',
			timeout: 5000,
			debug: false,
			version: '1.0.0',
		});
		const { valid, errors } = qCheckRules(dto);
		expect(valid).toBe(false);
		expect(errors.some((err) => err.field === 'apiUrl')).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 4. contextBridge.exposeInMainWorld — shared type usage
// ---------------------------------------------------------------------------

describe('contextBridge shared types and preload API', () => {
	test('preload API can build DTO from contextBridge-exposed interface', () => {
		// Simulates: window.electron.getUserPrefs() → IUserPrefs from main
		const fromMain: IUserPrefs = {
			theme: 'dark',
			language: 'en',
			fontSize: 16,
			notifications: true,
			autoSave: true,
		};
		const dto = new UserPrefsDto(fromMain);
		expect(dto.themeClass).toBe('theme-dark');
	});

	test('renderer can validate before sending to main via contextBridge', () => {
		const userChanges: IUserPrefs = {
			theme: 'dark',
			language: 'es',
			fontSize: 14,
			notifications: false,
			autoSave: true,
		};
		const dto = new UserPrefsDto(userChanges);
		const { valid } = qCheckRules(dto);
		if (valid) {
			// window.electron.savePrefs(dto.serialize())
			const payload = dto.serialize();
			expect(payload).toBeDefined();
		}
		expect(valid).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 5. createMany() for loading CSV/JSON local files
// ---------------------------------------------------------------------------

describe('createMany() for local file loading (CSV/JSON import)', () => {
	test('createMany() coerces JSON file rows loaded in renderer', () => {
		const jsonFileRows: IFileRecord[] = [
			{
				name: 'a.png',
				path: '/home/user/a.png',
				size: 10240,
				mimeType: 'image/png',
				modifiedAt: new Date(),
			},
			{
				name: 'b.pdf',
				path: '/home/user/b.pdf',
				size: 204800,
				mimeType: 'application/pdf',
				modifiedAt: new Date(),
			},
			{
				name: 'c.mp4',
				path: '/home/user/c.mp4',
				size: 5242880,
				mimeType: 'video/mp4',
				modifiedAt: new Date(),
			},
		];
		const { instances, errors } = FileRecordDto.createMany(
			jsonFileRows as any[]
		);
		expect(instances.length).toBe(3);
		expect(errors.length).toBe(0);
	});

	test('@QComputed sizeKb available on all instances', () => {
		const rows: IFileRecord[] = [
			{
				name: 'file.zip',
				path: '/tmp/file.zip',
				size: 2048,
				mimeType: 'application/zip',
				modifiedAt: new Date(),
			},
		];
		const { instances } = FileRecordDto.createMany(rows as any[]);
		expect(instances[0]?.sizeKb).toBe(2);
	});

	test('@QComputed isImage filters image files from list', () => {
		const rows: IFileRecord[] = [
			{
				name: 'photo.jpg',
				path: '/p.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				modifiedAt: new Date(),
			},
			{
				name: 'doc.docx',
				path: '/d.docx',
				size: 512,
				mimeType:
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				modifiedAt: new Date(),
			},
			{
				name: 'icon.png',
				path: '/i.png',
				size: 256,
				mimeType: 'image/png',
				modifiedAt: new Date(),
			},
		];
		const { instances } = FileRecordDto.createMany(rows as any[]);
		const images = instances.filter((dto) => dto.isImage);
		expect(images.length).toBe(2);
	});

	test('Date string from JSON file is coerced to Date', () => {
		const rows = [
			{
				name: 'x.txt',
				path: '/x.txt',
				size: 100,
				mimeType: 'text/plain',
				modifiedAt: '2025-04-01T00:00:00.000Z',
			},
		];
		const { instances } = FileRecordDto.createMany(
			rows as unknown as IFileRecord[]
		);
		expect(instances[0]?.modifiedAt).toBeInstanceOf(Date);
	});
});

// ---------------------------------------------------------------------------
// 6. isDirty() in renderer — unsaved-changes confirmation
// ---------------------------------------------------------------------------

describe('isDirty() in renderer — unsaved-changes guard', () => {
	test('isDirty() is false on freshly loaded prefs (no changes)', () => {
		const dto = new UserPrefsDto({
			theme: 'light',
			language: 'en',
			fontSize: 14,
			notifications: true,
			autoSave: false,
		});
		expect(dto.isDirty()).toBe(false);
	});

	test('isDirty() is true after user changes a field', () => {
		const dto = new UserPrefsDto({
			theme: 'light',
			language: 'en',
			fontSize: 14,
			notifications: true,
			autoSave: false,
		});
		dto.theme = 'dark';
		expect(dto.isDirty()).toBe(true);
	});

	test('isDirty() is false after copy() (simulates save → reset)', () => {
		const dto = new UserPrefsDto({
			theme: 'light',
			language: 'en',
			fontSize: 14,
			notifications: true,
			autoSave: false,
		});
		dto.theme = 'dark';
		const saved = dto.copy({ theme: 'dark' });
		expect(saved.isDirty()).toBe(false);
	});

	test('multiple field changes still report isDirty() = true', () => {
		const dto = new UserPrefsDto({
			theme: 'light',
			language: 'en',
			fontSize: 14,
			notifications: true,
			autoSave: false,
		});
		dto.theme = 'dark';
		dto.fontSize = 20;
		dto.autoSave = true;
		expect(dto.isDirty()).toBe(true);
	});
});
