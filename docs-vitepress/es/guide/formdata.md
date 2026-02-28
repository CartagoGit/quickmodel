# FormData y Streaming

QuickModel ofrece soporte nativo para `FormData`, `Blob` y `File`, así como streaming
para campos binarios grandes. Esta guía cubre las cuatro capas:

- **Capa 1** — `BlobTransformer` y `FileTransformer`
- **Capa 2** — Auto-detección del formato de origen
- **Capa 3** — API `fromFormData()` y `toFormData()`
- **Capa 4** — `toReadableStream()`, `fromStream()` y `pipeStream()`

---

## Capa 1 — BlobTransformer y FileTransformer

Usa el constructor `Blob` o `File` directamente en `@Quick` para registrar el transformer:

```typescript
import { QModel } from 'quickmodel';

interface IProfileDto {
	name: string;
	avatar: File;
	thumbnail: Blob;
}

@Quick({ avatar: File, thumbnail: Blob })
class ProfileDto extends QModel<IProfileDto> {
	declare name: string;
	declare avatar: File;
	declare thumbnail: Blob;
}
```

También puedes usar los aliases de cadena `'blob'` y `'file'`:

```typescript
@Quick({ avatar: 'file', thumbnail: 'blob' })
class ProfileDto extends QModel<IProfileDto> { ... }
```

### Serialización y deserialización

**BlobTransformer** hace un round-trip de objetos `Blob` mediante un descriptor ligero:

```typescript
// Forma serializada
{ size: 1024, type: 'image/png', _blobRef: true }

// La deserialización acepta:
// - { size, type, _blobRef }       ← descriptor serializado
// - ArrayBuffer / Uint8Array       ← creación programática
// - 'data:image/png;base64,...'    ← data URI
```

**FileTransformer** preserva los metadatos de `File` a través de la serialización:

```typescript
// Forma serializada
{ name: 'foto.jpg', size: 204800, type: 'image/jpeg', lastModified: 1709123456 }

// La deserialización acepta:
// - { name, size, type, lastModified }  ← descriptor serializado
// - instancia de File                   ← pass-through
// - instancia de Blob                   ← se convierte a File (desde streaming)
// - 'data:image/jpeg;base64,...'        ← data URI
```

---

## Capa 2 — Auto-detección

`fromFormData()` inspecciona cada `FormDataEntryValue` en tiempo de ejecución y elige
la estrategia de conversión correcta sin ninguna configuración explícita:

```
¿Qué es el valor?
│
├── instancia de File             → preservar como File          (input de archivo real del navegador)
├── instancia de Blob             → preservar como Blob
├── ArrayBuffer / Uint8Array      → envolver automáticamente en Blob   (programático)
├── string "data:..."             → decodificar base64 → Blob           (JS legacy / APIs)
├── string "https://..."          → mantener como string URL            (referencia CDN)
├── string "/storage/..."         → mantener como string path           (referencia servidor interno)
└── string "foto.jpg"             → mantener como string                (solo nombre de archivo)
```

Esto cubre el **90% de los casos reales** sin ninguna configuración.

---

## Capa 3 — fromFormData() y toFormData()

### fromFormData(fd, opts?)

Método estático. Convierte un `FormData` en una instancia del modelo usando
`coercionStrategy: 'loose'` y auto-detección por defecto.

```typescript
// Default: auto-detección
const dto = UploadDto.fromFormData(formData);

// Forzar todos los campos binarios como referencias de ruta (ej. proxy interno)
const dto = UploadDto.fromFormData(formData, { fileSource: 'reference' });

// Overrides por campo — estrategias mixtas en el mismo formulario
const dto = UploadDto.fromFormData(formData, {
	fields: {
		avatar: 'binary', // upload binario real
		document: 'reference', // ruta del servidor
		thumbnail: 'base64', // data URI
	},
});
```

**Valores de `fileSource`:**

| Valor              | Comportamiento                                                                 |
| ------------------ | ------------------------------------------------------------------------------ |
| `'auto'` (default) | Inspección en runtime — árbol de decisión anterior                             |
| `'binary'`         | Mantener `File`/`Blob` tal cual; envolver `ArrayBuffer`/`Uint8Array` en `Blob` |
| `'reference'`      | Tratar el string como ruta/URL, no deserializar como binario                   |
| `'base64'`         | Esperar prefijo `data:` y decodificar a `Blob`; error si no está presente      |

### toFormData(opts?)

Método de instancia. Construye un `FormData` desde los campos del modelo.

```typescript
// Default: preservar objetos binarios
const fd = await dto.toFormData();

// Proxy / logging — no enviar datos binarios por la red
const fd = await dto.toFormData({ fileMode: 'reference' });

// API legacy que espera base64
const fd = await dto.toFormData({ fileMode: 'base64' });

// Overrides por campo
const fd = await dto.toFormData({
	fields: { avatar: 'binary', signature: 'base64' },
});
```

**Tabla de conversiones por `fileMode`:**

| Tipo runtime del campo          | `'auto'` / `'binary'`                     | `'reference'`            | `'base64'`            |
| ------------------------------- | ----------------------------------------- | ------------------------ | --------------------- |
| `File`                          | `.append(k, file)`                        | `.append(k, file.name)`  | `.append(k, dataURI)` |
| `Blob`                          | `.append(k, blob, 'file')`                | `.append(k, '[Blob]')`   | `.append(k, dataURI)` |
| `ArrayBuffer`                   | auto-wrap en `Blob` + append              | `.append(k, '[binary]')` | `.append(k, dataURI)` |
| `Uint8Array`                    | auto-wrap en `Blob` + append              | `.append(k, '[binary]')` | `.append(k, dataURI)` |
| `string` / `number` / `boolean` | `.append(k, String(v))` — todos los modos |

### spoofMethod — tunelización de métodos HTTP

Algunos backends (**Laravel**, **Symfony**, **Rails**) solo aceptan `multipart/form-data`
con `POST`. Para trabajar con esas APIs, puedes inyectar un campo `_method` como la
**primera** entrada del `FormData` — el backend lo lee y enruta la petición como si
fuera `PUT`, `PATCH` o `DELETE`.

```typescript
// Opción de llamada puntual
const fd = await dto.toFormData({ spoofMethod: 'PUT' });
// FormData: _method=PUT, name=Alice, avatar=<File>
```

#### Cascada de tres niveles (menor → mayor prioridad)

| Nivel                 | Dónde                         | Ejemplo                                             |
| --------------------- | ----------------------------- | --------------------------------------------------- |
| **Global**            | `QConfig.defaults`            | `QConfig.set({ defaults: { spoofMethod: 'PUT' } })` |
| **Decorador**         | `@Quick({}, { spoofMethod })` | `@Quick({}, { spoofMethod: 'PATCH' })`              |
| **Opción de llamada** | `toFormData({ spoofMethod })` | `toFormData({ spoofMethod: 'DELETE' })`             |

Un nivel superior siempre gana. Si `spoofMethod` es `undefined` en todos los niveles,
no se añade ningún campo `_method`.

```typescript
// 1. Global — aplica a todos los modelos a menos que se sobreescriba
QConfig.set({ defaults: { spoofMethod: 'PUT' } });

// 2. Decorador — sobreescribe el global para un modelo concreto
@Quick({}, { spoofMethod: 'PATCH' })
class UploadDto extends QModel<IUploadDto> { ... }

// 3. Opción de llamada — mayor prioridad, sobreescribe todo
const fd = await dto.toFormData({ spoofMethod: 'DELETE' });
// → _method=DELETE (ignora el PUT global y el PATCH del decorador)
```

#### Valores con seguridad de tipos — `IQSpoofMethod`

La opción `spoofMethod` está tipada como `IQSpoofMethod`, que proporciona autocompletado
para todos los métodos HTTP estándar (RFC 7231, WebDAV, DeltaV) más un comodín
`string & {}` para métodos personalizados:

```typescript
import type { IQSpoofMethod } from 'quickmodel';

const methods: IQSpoofMethod[] = ['PUT', 'PATCH', 'DELETE', 'PURGE', 'SEARCH'];
```

### fileMode por campo — `@QType({ fileMode })`

Cuando un campo _siempre_ necesita una estrategia de serialización concreta
independientemente del punto de llamada, decláralo directamente en la propiedad con
`@QType`. Así evitas repetir el override en cada llamada a `toFormData()`.

```typescript
class UploadDto extends QModel<IUploadDto> {
	declare name: string;

	// Siempre serializar como base64 — consumidor de API legacy
	@QType(File, { fileMode: 'base64' })
	declare signature: File;

	// Siempre mantener referencia de ruta — asset gestionado por CDN
	@QType(File, { fileMode: 'reference' })
	declare thumbnail: File;
}
```

**Orden de prioridad (menor → mayor):**

| Nivel                           | Dónde                                 | Se aplica a                      |
| ------------------------------- | ------------------------------------- | -------------------------------- |
| **Decorador**                   | `@QType({ fileMode })`                | ese campo en todas las llamadas  |
| **Opción de llamada**           | `toFormData({ fileMode })`            | todos los campos en esta llamada |
| **Opción de llamada por campo** | `toFormData({ fields: { k: mode } })` | ese campo en esta llamada        |

Una opción de llamada por campo siempre gana. Si no se proporciona ninguna opción de
llamada, se aplica el valor del decorador. Si el decorador no tiene `fileMode`, el
campo vuelve a `'auto'` por defecto.

### serialize({ fileMode }) — campos binarios en JSON plano

`serialize()` también acepta `fileMode` para controlar cómo se representan los campos
`File`/`Blob` en la salida de objeto plano / JSON — útil para logging, caché o
transporte por una API que no usa multipart.

```typescript
// Default: File → { name, size, type, lastModified }
const plain = dto.serialize();

// Solo referencia — sin datos binarios en la salida JSON
const plain = dto.serialize({ fileMode: 'reference' });
// { avatar: 'foto.jpg', ... }

// Base64 — incrustar el binario dentro del JSON
const plain = dto.serialize({ fileMode: 'base64' });
// { avatar: 'data:image/jpeg;base64,/9j/...', ... }
```

**Default global con `QConfig`:**

```typescript
QConfig.set({ defaults: { fileMode: 'reference' } });
// cada llamada a serialize() / toFormData() usará 'reference' por defecto
// salvo que se sobreescriba a nivel de decorador o de llamada
```

---

## Capa 4 — Streaming

Cargar 500 MB en un `ArrayBuffer` antes de enviarlo bloquea el hilo y puede causar OOM
en servidores con alta concurrencia. La solución estándar de la Web Platform es
`ReadableStream<Uint8Array>`.

### toReadableStream(opts)

Emite los bytes de un campo binario como chunks `Uint8Array`. El archivo **nunca está completamente en
memoria**.

```typescript
const stream = dto.toReadableStream({
	field: 'video',
	chunkSize: 64 * 1024, // default: 256 KB
});

// Subir a S3 sin cargar el archivo en memoria
await s3.putObject({
	Bucket: 'uploads',
	Key: 'video.mp4',
	Body: stream,
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

### fromStream(stream, opts)

Reconstruye un campo binario acumulando los chunks de un `ReadableStream` entrante.

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

### pipeStream(src, dst, opts?) — modo sin memoria

Conecta directamente el stream de entrada con un stream de escritura sin acumular nada.
El servidor actúa como conductor puro de bytes.

```typescript
// Pipe directo de la request al S3 — cero bytes en memoria en el servidor
await UploadDto.pipeStream(req.body, s3UploadStream, {
	maxBytes: 500 * 1024 * 1024,
	onProgress: (bytes) => socket.emit('progress', bytes),
});
```

### Árbol de decisión — cuándo usar qué

```
¿El archivo cabe cómodamente en memoria? (< ~50 MB)
│
├── SÍ → fromFormData() / toFormData()
│         ├── Quiero el binario real          → fileMode/fileSource: 'auto' (default)
│         ├── Solo necesito la referencia     → fileMode/fileSource: 'reference'
│         └── API legacy / JSON con base64    → fileMode/fileSource: 'base64'
│
└── NO → toReadableStream() / fromStream() / pipeStream()
         ├── Subir a S3/CDN                   → toReadableStream({ field }) → S3 body
         ├── Recibir upload grande            → fromStream(req.body, { field })
         ├── Pipe directo sin memoria         → pipeStream(src, dst)
         └── Progreso en tiempo real          → callbacks onChunk / onProgress
```

---

## Escenarios de uso completos

### Escenario 1 — Frontend envía formulario con archivo → Backend lo recibe

```typescript
// FRONTEND
const fd = new FormData(formEl); // avatar: File del <input type="file">
const dto = UploadDto.fromFormData(fd);
// dto.avatar → File { name: 'foto.jpg', size: 204800, type: 'image/jpeg' }
// dto.userId → 42   (number, coerción automática desde string '42')

const { valid, rules } = dto.validationReport();
if (!valid) {
	showErrors(rules);
	return;
}

// Archivo pequeño — envío directo
await fetch('/api/upload', { method: 'POST', body: await dto.toFormData() });

// Archivo grande — envío streaming con progreso
const stream = dto.toReadableStream({
	field: 'avatar',
	onChunk: (chunk, total) => updateProgressBar(chunk.byteLength, total),
});
await fetch('/api/upload', { method: 'POST', body: stream });
```

```typescript
// BACKEND — recibir, validar y procesar
async function handleUpload(req: Request) {
	const fd = await req.formData();
	const dto = UploadDto.fromFormData(fd);

	const { valid, rules } = dto.validationReport();
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

### Escenario 2 — Microservicio interno: solo referencias, sin binarios

```typescript
// FormData { avatar: '/storage/users/42/foto.jpg', ... }
const dto = UploadDto.fromFormData(fd, { fileSource: 'reference' });
// dto.avatar → '/storage/users/42/foto.jpg'  (string, cero bytes en memoria)
```

### Escenario 3 — Round-trip con API legacy base64

```typescript
// Recibir: "data:image/jpeg;base64,/9j/..."
const dto = UploadDto.fromFormData(fd, { fileSource: 'base64' });
// dto.avatar → Blob { type: 'image/jpeg' }

// Reenviar en el mismo formato
const outFd = await dto.toFormData({ fileMode: 'base64' });
// outFd.get('avatar') → 'data:image/jpeg;base64,/9j/...' — round-trip exacto
```

## Skill MCP

El skill [`quickmodel_form_data`](/mcp/public/skills#quickmodel_form_data) guía el flujo completo de FormData — generación de código `fromFormData()` / `toFormData()`, elección de la opción correcta de `fileMode`/`fileSource`, y añadir streaming con callbacks de progreso.

```
/mcp quickmodel_form_data intent=fromFormData model_fields="avatar: File, userId: number, tags: string[]"
```
