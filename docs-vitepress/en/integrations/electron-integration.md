# Electron IPC Integration

QuickModel provides a secure, typed data layer for Electron applications. It handles **serialization across the IPC boundary**, strips untrusted fields from renderer payloads, validates in the main process before writing to disk, and tracks unsaved changes in the renderer.

## Architecture

```
Renderer (untrusted)                     Main (trusted)
  QModel DTO  ──► serialize() ──► IPC ──► new Dto(payload)
                                           checkRules()
                                           persist to disk/DB
```

## IPC boundary — serialize() / populate()

```typescript
import { QModel, Quick, QRule, QField } from 'quickmodel';

interface IUserPrefs {
	theme: string;
	language: string;
	fontSize: number;
	notifications: boolean;
	autoSave: boolean;
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
	@QField({ label: 'Theme', required: true })
	@QRule(
		(val: string) => ['light', 'dark', 'system'].includes(val),
		'Invalid theme'
	)
	declare theme: string;

	@QField({ label: 'Language', required: true })
	declare language: string;

	@QField({ label: 'Font Size' })
	@QRule((val: number) => val >= 10 && val <= 32, 'Font size out of range')
	declare fontSize: number;

	@QField({ label: 'Notifications', widget: 'checkbox' })
	declare notifications: boolean;

	@QField({ label: 'Auto Save', widget: 'checkbox' })
	declare autoSave: boolean;
}

// ── Renderer process (preload/renderer.ts) ──────────────────────────────────

const dto = new UserPrefsDto(currentPrefs);
// Send clean JSON over IPC:
await window.electron.savePrefs(dto.$qSerialize());

// ── Main process (main.ts) ──────────────────────────────────────────────────

ipcMain.handle('save-prefs', async (_, payload: unknown) => {
	// Reconstruct DTO in main — unknown fields stripped automatically
	const dto = new UserPrefsDto(payload as IUserPrefs);
	const { valid, errors } = qCheckRules(dto);

	if (!valid) {
		return { success: false, errors };
	}

	await fs.writeFile(prefsPath, JSON.stringify(dto.toInterface(), null, 2));
	return { success: true };
});
```

## Security — unknownPropertyPolicy: 'strip'

Always use `unknownPropertyPolicy: 'strip'` for payloads coming from the renderer. This protects against malicious data injected through the IPC channel:

```typescript
// Renderer sends a malicious payload:
const maliciousPayload = {
	theme: 'dark',
	language: 'en',
	fontSize: 14,
	notifications: true,
	autoSave: false,
	// Injected fields — stripped automatically:
	adminOverride: true,
	__proto__: { polluted: true },
	_internalToken: 'secret',
};

// In main:
const dto = new UserPrefsDto(maliciousPayload as IUserPrefs);
// dto.adminOverride → undefined ✅
// dto._internalToken → undefined ✅
// dto.theme → 'dark' ✅
```

## Date fields across IPC

Dates become ISO strings during JSON serialization. QuickModel's loose coercion restores them on the other side:

```typescript
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
	declare name: string;
	declare path: string;
	declare size: number;
	declare mimeType: string;
	declare modifiedAt: Date; // ← restored from ISO string after IPC
}

// Main → Renderer:
const dto = new FileRecordDto(fileFromDisk);
ipcRenderer.send('file-loaded', dto.$qSerialize()); // Date → ISO string

// Renderer receives:
ipcMain.on('file-loaded', (_, payload) => {
	const restored = new FileRecordDto(payload); // ISO string → Date ✅
	console.log(restored.modifiedAt instanceof Date); // true
});
```

## contextBridge.exposeInMainWorld — shared types

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
	savePrefs: (prefs: IUserPrefs) => ipcRenderer.invoke('save-prefs', prefs),
	loadPrefs: (): Promise<IUserPrefs> => ipcRenderer.invoke('load-prefs'),
});

// renderer.ts — validate before sending to main
const dto = new UserPrefsDto(userChanges);
const { valid, errors } = qCheckRules(dto);
if (valid) {
	await window.electron.savePrefs(dto.$qSerialize() as IUserPrefs);
} else {
	showErrors(errors);
}
```

## createMany() for local file loading (CSV/JSON import)

```typescript
// Main reads a JSON file and sends parsed rows to renderer
ipcMain.handle('import-files', async () => {
	const raw = JSON.parse(
		await fs.readFile(importPath, 'utf8')
	) as IFileRecord[];
	const { instances, errors } = FileRecordDto.createMany(raw);
	if (errors.length > 0) console.warn('Skipped invalid rows:', errors.length);
	return instances.map((dto) => dto.$qSerialize());
});

// Renderer:
const files = await window.electron.importFiles();
const { instances } = FileRecordDto.createMany(files as IFileRecord[]);
const images = instances.filter((f) => f.isImage); // @QComputed
```

## isDirty() — unsaved-changes confirmation dialog

Use `isDirty()` in the renderer to prompt the user before closing a window with unsaved changes:

```typescript
// renderer.ts

const prefs = new UserPrefsDto(await window.electron.loadPrefs());
// User edits a setting:
prefs.theme = 'dark';
prefs.fontSize = 18;

console.log(prefs.$qIsDirty()); // true → show save dialog

window.addEventListener('beforeunload', (e) => {
	if (prefs.$qIsDirty()) {
		e.preventDefault();
		e.returnValue = ''; // Electron shows "Leave page?" dialog
	}
});

// After saving:
const saved = prefs.$qCopy({ theme: 'dark', fontSize: 18 });
console.log(saved.$qIsDirty()); // false — fresh snapshot
```

## @QComputed fields in Electron

Computed fields are useful for UI display without persisting to disk:

```typescript
@Quick(
	{
		name: 'string',
		path: 'string',
		size: 'number',
		mimeType: 'string',
		modifiedAt: Date,
	},
	{}
)
class FileRecordDto extends QModel<IFileRecord> {
	declare name: string;
	declare path: string;
	declare size: number;
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

// In renderer UI (React/Vue/vanilla):
const dto = new FileRecordDto(file);
// dto.sizeKb → displayed in table column
// dto.isImage → shown in thumbnail view
// Neither is persisted via toInterface()
```
