# Propuesta G — FormData ↔ QModel

> **Estado:** Propuesta de diseño
> **Prioridad:** 🟡 Media
> **Esfuerzo estimado:** 11-13 horas | **Tests estimados:** ~45
> **Backlog:** [TASKS.md](../TASKS.md#propuesta-g)

---

## Contexto y motivación

`blob`, `file` y `formdata` están declarados en `IQAliasType` como tipos reconocidos,
pero **ninguno tiene un transformer implementado** en `web-apis.transformer.ts`. La intención
de soporte existe; esta propuesta la completa.

`Object.fromEntries(formData)` — el workaround habitual — aplana **todo** a `string`,
perdiendo los objetos `File` con sus metadatos (`name`, `size`, `type`, `lastModified`).
Un campo `<input type="file">` llega como `File` (subclase de `Blob`); convertirlo a string
lo destruye irreversiblemente.

La dirección inversa (`toFormData()`) tampoco es trivial: construir un `FormData` correcto
desde un modelo con campos `ArrayBuffer`, `Uint8Array`, `Blob` o `File` requiere lógica
de wrapping que hoy cada usuario implementa a mano — con errores.

---

## Capa 1 — Transformers `BlobTransformer` y `FileTransformer`

Son la base de todo lo demás. Sin ellos el resto de la API no puede existir.

### `BlobTransformer`

```
Serialización:   Blob → { size: number, type: string, _blobRef: true }
Deserialización: { size, type } | ArrayBuffer | Uint8Array | string(base64) → Blob
```

```typescript
@Quick({ thumbnail: Blob })
class ArticleDto extends QModel<IArticleDto> {
	declare thumbnail: Blob;
}

const dto = new ArticleDto({ thumbnail: 'data:image/png;base64,iVBOR...' });
// dto.thumbnail → Blob { size: 1024, type: 'image/png' }

dto.serialize();
// → { thumbnail: { size: 1024, type: 'image/png', _blobRef: true } }
```

### `FileTransformer`

```
Serialización:   File → { name: string, size: number, type: string, lastModified: number }
Deserialización: { name, size, type, lastModified } | File | Blob+name | string → File
```

```typescript
@Quick({ avatar: File })
class ProfileDto extends QModel<IProfileDto> {
	declare avatar: File;
}

const dto = new ProfileDto({ avatar: fileInputRef.files[0] });
// dto.avatar → File { name: 'foto.jpg', size: 204800, type: 'image/jpeg' }

dto.serialize();
// → { avatar: { name: 'foto.jpg', size: 204800, type: 'image/jpeg', lastModified: 1709123456 } }
```

---

## Capa 2 — Auto-detección de formato (`'auto'`)

El transformer usa modo `'auto'` por defecto. Al recibir un valor desconocido,
inspecciona su forma en runtime sin necesitar opciones explícitas:

```
¿Qué hay en el campo?
│
├── File instance             → preservar como File          (upload real de navegador)
├── Blob instance             → preservar como Blob
├── ArrayBuffer / Uint8Array  → wrap automático en Blob       (envío programático)
├── string "data:..."         → decodificar base64 → Blob     (cliente JS / legacy API)
├── string "https://..."      → URL object                    (referencia CDN)
├── string "/storage/..."     → string path                   (referencia interna de servidor)
└── string "foto.jpg"         → string filename               (solo nombre)
```

Este árbol de decisión cubre el **90% de los casos reales** sin ninguna configuración.

---

## Capa 3 — API pública: `fromFormData()` y `toFormData()`

### `QModel.fromFormData(fd, opts?)`

Método estático. Convierte un `FormData` en una instancia del modelo con
`coercionStrategy: 'loose'` implícito y auto-detección de campos File/Blob.

```typescript
// Caso 1: auto-detección (default) — cubre el 90% de los casos
const dto = UploadDto.fromFormData(formData);

// Caso 2: forzar todos los campos binarios como rutas (proxy interno)
const dto = UploadDto.fromFormData(formData, { fileSource: 'reference' });

// Caso 3: override por campo — cuando el mismo form mezcla estrategias
const dto = UploadDto.fromFormData(formData, {
	fields: {
		avatar: 'binary', // campo binario real
		document: 'reference', // campo con path del servidor
		thumbnail: 'base64', // campo con data URI
	},
});
```

**Valores de `fileSource`:**

| Valor              | Comportamiento                                                        |
| ------------------ | --------------------------------------------------------------------- |
| `'auto'` (default) | Inspección del valor en runtime — árbol de decisión anterior          |
| `'binary'`         | Preservar `File`/`Blob` tal cual; `ArrayBuffer`/`Uint8Array` → `Blob` |
| `'reference'`      | Tratar el string como ruta/URL, no deserializar como binario          |
| `'base64'`         | Detectar prefijo `data:` y convertir a `Blob`; error si no lo tiene   |

---

### `dto.toFormData(opts?)`

Método de instancia. Construye un `FormData` desde los campos del modelo.

```typescript
// Caso 1: default — preservar binarios
const fd = dto.toFormData();

// Caso 2: proxy/log — no enviar datos binarios en red
const fd = dto.toFormData({ fileMode: 'reference' });

// Caso 3: API legacy que espera base64
const fd = dto.toFormData({ fileMode: 'base64' });

// Caso 4: override por campo
const fd = dto.toFormData({
	fields: { avatar: 'binary', signature: 'base64' },
});
```

**Tabla de conversiones por `fileMode`:**

| Tipo runtime del campo          | `'auto'`/`'binary'`                                | `'reference'`            | `'base64'`            |
| ------------------------------- | -------------------------------------------------- | ------------------------ | --------------------- |
| `File`                          | `.append(k, file)`                                 | `.append(k, file.name)`  | `.append(k, dataURI)` |
| `Blob`                          | `.append(k, blob, 'file')`                         | `.append(k, '[Blob]')`   | `.append(k, dataURI)` |
| `ArrayBuffer`                   | auto-wrap en `Blob` + append                       | `.append(k, '[binary]')` | `.append(k, dataURI)` |
| `Uint8Array`                    | auto-wrap en `Blob` + append                       | `.append(k, '[binary]')` | `.append(k, dataURI)` |
| `string` / `number` / `boolean` | `.append(k, String(v))` — igual en todos los modos |

---

### Config permanente en el decorador

Para campos que **siempre** deben serializarse de la misma forma:

```typescript
@Quick({ avatar: File, signature: Blob })
class ProfileDto extends QModel<IProfileDto> {
	declare name: string;

	@Quick({ fileMode: 'reference' }) // nunca enviar el binario en serialize()
	declare avatar: File;

	@Quick({ fileMode: 'base64' }) // siempre base64 en JSON
	declare signature: Blob;
}

dto.serialize();
// → { name: 'Alice', avatar: '/cdn/42.jpg', signature: 'data:image/png;base64,...' }
```

**Precedencia de opciones** (de menor a mayor):

```
Decorador @Quick({ fileMode })
  < opción global de llamada { fileMode }
    < opción por campo { fields: { avatar: 'binary' } }
```

Mismo patrón que `transformCase` / `dateStrategy` en `serialize()` — consistencia garantizada.

---

## Capa 4 — Streaming: `toReadableStream()` y `fromStream()`

### El problema con archivos grandes

Cargar un vídeo de 500 MB en un `ArrayBuffer` antes de enviarlo bloquea el hilo
y puede causar OOM en servidores con alta concurrencia. La solución estándar
de la Web Platform es `ReadableStream<Uint8Array>`.

### `dto.toReadableStream(opts?)`

Emite los bytes de un campo binario del modelo como secuencia de chunks `Uint8Array`.
El archivo **nunca está completo en memoria** — se lee y emite trozo a trozo.

```typescript
// Emitir campo binario como stream de chunks (64 KB cada uno)
const stream = dto.toReadableStream({
	field: 'video',
	chunkSize: 64 * 1024, // default: 256 KB
});

// Subir a S3 sin cargar el archivo entero en memoria
await s3.putObject({
	Bucket: 'uploads',
	Key: 'video.mp4',
	Body: stream, // el SDK de S3 acepta ReadableStream
	ContentType: dto.video.type,
});

// O devolver directamente como respuesta HTTP
return new Response(stream, {
	headers: { 'Content-Type': dto.video.type },
});
```

**Con progreso:**

```typescript
let emitted = 0;
const stream = dto.toReadableStream({
	field: 'video',
	chunkSize: 64 * 1024,
	onChunk: (chunk, total) => {
		emitted += chunk.byteLength;
		socket.emit('upload-progress', Math.round((emitted / total) * 100));
	},
});
```

**Streamear múltiples campos como multipart completo:**

```typescript
// Genera un stream multipart/form-data completo, campo a campo, sin cargar nada en memoria
const stream = dto.toReadableStream({ multipart: true });

await fetch('/api/upload', {
	method: 'POST',
	// Content-Type con boundary se calcula automáticamente
	body: stream,
});
```

---

### `QModel.fromStream(stream, opts?)`

Reconstruye un campo binario acumulando los chunks de un `ReadableStream` entrante.
Útil en servidor para recibir uploads sin tener el archivo completo en memoria
hasta que sea necesario.

```typescript
async function handleUpload(req: Request) {
	const dto = await UploadDto.fromStream(req.body, {
		field: 'video', // en qué campo del modelo acumular los chunks
		maxBytes: 500 * 1024 * 1024, // límite de seguridad: 500 MB
		onProgress: (received, total) => {
			console.log(`${received}/${total} bytes recibidos`);
		},
	});

	// dto.video → Blob con todos los chunks acumulados
	await saveToStorage(dto.video);
}
```

---

### `QModel.pipeStream(src, dst, opts?)` — modo sin memoria

Conecta directamente el stream de entrada con un stream de escritura sin acumular
nada en el proceso. El servidor actúa como conductor puro de bytes.

```typescript
// Pipe directo de la request al S3 — cero bytes en memoria en el servidor
await UploadDto.pipeStream(req.body, s3UploadStream, {
	maxBytes: 500 * 1024 * 1024,
	onProgress: (bytes) => socket.emit('progress', bytes),
});
// s3UploadStream puede ser: S3 multipart upload, fs.WriteStream, otro fetch body...
```

---

### Árbol de decisión — cuándo usar qué

```
¿El archivo cabe cómodamente en memoria? (< ~50 MB)
│
├── SÍ → fromFormData() / toFormData()
│        ├── Quiero el binario real          → fileMode/fileSource: 'auto' (default)
│        ├── Solo necesito la referencia     → fileMode/fileSource: 'reference'
│        └── API legacy / JSON con base64    → fileMode/fileSource: 'base64'
│
└── NO → toReadableStream() / fromStream() / pipeStream()
         ├── Subir a S3/CDN                  → toReadableStream({ field }) → S3 body
         ├── Recibir upload grande           → fromStream(req.body, { field })
         ├── Pipe directo sin memoria        → pipeStream(src, dst)
         └── Con progreso en tiempo real     → callbacks onChunk / onProgress
```

---

## Escenarios de uso completos

### Escenario 1 — Frontend envía formulario con archivo → Backend lo recibe

```typescript
// FRONTEND
const fd = new FormData(formEl); // avatar: File object del input
const dto = UploadDto.fromFormData(fd);
// dto.avatar → File { name: 'foto.jpg', size: 204800, type: 'image/jpeg' }
// dto.userId → 42   (number, coerción automática desde string '42')

const { valid, rules } = dto.validate();
if (!valid) {
	showErrors(rules);
	return;
}

// Archivo pequeño — envío directo
await fetch('/api/upload', { method: 'POST', body: dto.toFormData() });

// Archivo grande — envío streaming con progreso
const stream = dto.toReadableStream({
	multipart: true,
	onChunk: (chunk, total) => updateProgressBar(chunk.byteLength, total),
});
await fetch('/api/upload', { method: 'POST', body: stream });
```

```typescript
// BACKEND — recibir, validar y procesar
async function handleUpload(req: Request) {
	const fd = await req.formData();
	const dto = UploadDto.fromFormData(fd);

	const { valid, rules } = dto.validate();
	if (!valid) return Response.json({ errors: rules }, { status: 422 });

	// Subir a S3 sin cargar en memoria — pipe directo
	const uploadStream = s3.createUploadStream({
		Bucket: 'uploads',
		Key: dto.avatar.name,
	});
	await UploadDto.pipeStream(dto.avatar.stream(), uploadStream);

	return Response.json({ url: cdnUrl });
}
```

---

### Escenario 2 — Backend → Frontend: metadatos, no el binario

```typescript
// BACKEND — respuesta con URL resuelta, no el binario
@Quick({ uploadedAt: Date })
class UploadResponseDto extends QModel<IUploadResponse> {
	declare avatarUrl: string; // URL del CDN
	declare uploadedAt: Date;
}

const response = new UploadResponseDto({
	avatarUrl: cdnUrl,
	uploadedAt: new Date(),
});
return Response.json(response.serialize());
// → { avatarUrl: 'https://cdn.../42.jpg', uploadedAt: '2026-02-28T...' }
```

```typescript
// FRONTEND — hidratar respuesta
const dto = new UploadResponseDto(await resp.json());
// dto.uploadedAt → Date object (string ISO → Date automático)
```

---

### Escenario 3 — Microservicio interno sin binarios

```typescript
// FormData { avatar: '/storage/users/42/foto.jpg', ... }
const dto = UploadDto.fromFormData(fd, { fileSource: 'reference' });
// dto.avatar → '/storage/users/42/foto.jpg'  (string, cero bytes en memoria)
```

---

### Escenario 4 — Round-trip base64 con API legacy

```typescript
// Recibir: "data:image/jpeg;base64,/9j/..."
const dto = UploadDto.fromFormData(fd, { fileSource: 'base64' });
// dto.avatar → Blob { type: 'image/jpeg' }

// Reenviar en el mismo formato
const outFd = dto.toFormData({ fileMode: 'base64' });
// outFd.get('avatar') → 'data:image/jpeg;base64,/9j/...'  — round-trip exacto
```

---

## Archivos a crear / modificar

| Archivo                                          | Acción    | Descripción                                                            |
| ------------------------------------------------ | --------- | ---------------------------------------------------------------------- |
| `src/transformers/web-apis.transformer.ts`       | Modificar | Añadir `BlobTransformer`, `FileTransformer`                            |
| `src/core/interfaces/serializer.interface.ts`    | Modificar | Añadir `fileMode` a `IQSerializationOptions`                           |
| `src/core/interfaces/quick-options.interface.ts` | Modificar | Añadir `fileSource`, `fields` a opciones de `fromFormData`             |
| `src/core/models/quick.model.ts`                 | Modificar | `fromFormData()`, `toFormData()`, `toReadableStream()`, `fromStream()` |
| `src/core/helpers/form-data.helpers.ts`          | Nuevo     | Auto-detección y conversiones por modo                                 |
| `src/core/helpers/stream.helpers.ts`             | Nuevo     | `toReadableStream`, `fromStream`, `pipeStream`                         |
| `src/core/types/q-alias.type.ts`                 | Verificar | `blob`, `file`, `formdata` ya declarados — sin cambios                 |
| `tests/unit/core/models/form-data.test.ts`       | Nuevo     | ~25 tests (fromFormData, toFormData, todos los modos)                  |
| `tests/unit/core/models/stream.test.ts`          | Nuevo     | ~10 tests (toReadableStream, fromStream, pipeStream)                   |
| `tests/unit/core/transformers/blob-file.test.ts` | Nuevo     | ~10 tests (BlobTransformer, FileTransformer)                           |
| `docs-vitepress/en/guide/formdata.md`            | Nuevo     | Guía EN                                                                |
| `docs-vitepress/es/guide/formdata.md`            | Nuevo     | Guía ES                                                                |

**Esfuerzo desglosado:**

| Componente                                             | Horas      |
| ------------------------------------------------------ | ---------- |
| `BlobTransformer` + `FileTransformer`                  | 2h         |
| `fromFormData()` + auto-detect                         | 2h         |
| `toFormData()` + modos                                 | 2h         |
| `toReadableStream()` + `fromStream()` + `pipeStream()` | 3-4h       |
| Tests (~45 tests)                                      | 2-3h       |
| Documentación EN+ES                                    | 1h         |
| **Total**                                              | **12-14h** |
