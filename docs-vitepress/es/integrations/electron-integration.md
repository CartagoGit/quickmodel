# Integración con Electron IPC

QuickModel proporciona una capa de datos segura y tipada para aplicaciones Electron. Gestiona la **serialización en el límite IPC**, elimina campos no confiables del renderer, valida en el proceso main antes de escribir en disco, y hace seguimiento de cambios no guardados en el renderer.

## Arquitectura

```
Renderer (no confiable)                  Main (confiable)
  DTO QModel  ──► serialize() ──► IPC ──► new Dto(payload)
                                           checkRules()
                                           persistir en disco/DB
```

## Límite IPC — serialize() / populate()

```typescript
import { QModel, Quick, QRule, QField } from 'quickmodel';
import { qCheckRules } from 'quickmodel';

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
	@QField({ label: 'Tema', required: true })
	@QRule(
		(val: string) => ['light', 'dark', 'system'].includes(val),
		'Tema inválido'
	)
	declare theme: string;

	@QField({ label: 'Idioma', required: true })
	declare language: string;

	@QField({ label: 'Tamaño de fuente' })
	@QRule((val: number) => val >= 10 && val <= 32, 'Tamaño fuera de rango')
	declare fontSize: number;

	@QField({ label: 'Notificaciones', widget: 'checkbox' })
	declare notifications: boolean;

	@QField({ label: 'Auto guardado', widget: 'checkbox' })
	declare autoSave: boolean;
}

// ── Proceso renderer (preload/renderer.ts) ──────────────────────────────────

const dto = new UserPrefsDto(currentPrefs);
// Enviar JSON limpio por IPC:
await window.electron.savePrefs(dto.serialize());

// ── Proceso main (main.ts) ──────────────────────────────────────────────────

ipcMain.handle('save-prefs', async (_, payload: unknown) => {
	// Reconstruir DTO en main — campos desconocidos eliminados automáticamente
	const dto = new UserPrefsDto(payload as IUserPrefs);
	const { valid, errors } = qCheckRules(dto);

	if (!valid) {
		return { success: false, errors };
	}

	await fs.writeFile(prefsPath, JSON.stringify(dto.toInterface(), null, 2));
	return { success: true };
});
```

## Seguridad — unknownPropertyPolicy: 'strip'

Usa siempre `unknownPropertyPolicy: 'strip'` para payloads del renderer. Esto protege contra datos maliciosos inyectados por el canal IPC:

```typescript
// El renderer envía un payload malicioso:
const maliciousPayload = {
	theme: 'dark',
	language: 'en',
	fontSize: 14,
	notifications: true,
	autoSave: false,
	// Campos inyectados — eliminados automáticamente:
	adminOverride: true,
	__proto__: { polluted: true },
	_internalToken: 'secret',
};

// En main:
const dto = new UserPrefsDto(maliciousPayload as IUserPrefs);
// dto.adminOverride → undefined ✅
// dto._internalToken → undefined ✅
// dto.theme → 'dark' ✅
```

## Fechas a través del IPC

Las fechas se convierten a ISO strings durante la serialización JSON. La coerción loose de QuickModel las restaura al otro lado:

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
	declare modifiedAt: Date; // ← restaurada desde ISO string tras IPC
}

// Main → Renderer:
const dto = new FileRecordDto(fileFromDisk);
ipcRenderer.send('file-loaded', dto.serialize()); // Date → ISO string

// Renderer recibe:
ipcMain.on('file-loaded', (_, payload) => {
	const restored = new FileRecordDto(payload); // ISO string → Date ✅
	console.log(restored.modifiedAt instanceof Date); // true
});
```

## contextBridge.exposeInMainWorld — tipos compartidos

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
	savePrefs: (prefs: IUserPrefs) => ipcRenderer.invoke('save-prefs', prefs),
	loadPrefs: (): Promise<IUserPrefs> => ipcRenderer.invoke('load-prefs'),
});

// renderer.ts — validar antes de enviar al main
const dto = new UserPrefsDto(userChanges);
const { valid, errors } = qCheckRules(dto);
if (valid) {
	await window.electron.savePrefs(dto.serialize() as IUserPrefs);
} else {
	showErrors(errors);
}
```

## createMany() para importación de archivos CSV/JSON locales

```typescript
// Main lee un archivo JSON y envía las filas al renderer
ipcMain.handle('import-files', async () => {
	const raw = JSON.parse(
		await fs.readFile(importPath, 'utf8')
	) as IFileRecord[];
	const { instances, errors } = FileRecordDto.createMany(raw);
	if (errors.length > 0)
		console.warn('Filas inválidas omitidas:', errors.length);
	return instances.map((dto) => dto.serialize());
});

// Renderer:
const files = await window.electron.importFiles();
const { instances } = FileRecordDto.createMany(files as IFileRecord[]);
const images = instances.filter((f) => f.isImage); // @QComputed
```

## isDirty() — diálogo de confirmación de cambios no guardados

Usa `isDirty()` en el renderer para avisar al usuario antes de cerrar una ventana con cambios pendientes:

```typescript
// renderer.ts

const prefs = new UserPrefsDto(await window.electron.loadPrefs());
// El usuario edita un ajuste:
prefs.theme = 'dark';
prefs.fontSize = 18;

console.log(prefs.isDirty()); // true → mostrar diálogo de guardado

window.addEventListener('beforeunload', (e) => {
	if (prefs.isDirty()) {
		e.preventDefault();
		e.returnValue = ''; // Electron muestra "¿Salir sin guardar?"
	}
});

// Tras guardar:
const saved = prefs.copy({ theme: 'dark', fontSize: 18 });
console.log(saved.isDirty()); // false — snapshot fresco
```
