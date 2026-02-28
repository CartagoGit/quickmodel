# FormData & Streaming

QuickModel provides first-class support for `FormData`, `Blob`, and `File` objects,
as well as streaming for large binary fields. This guide covers all four layers:

- **Layer 1** — `BlobTransformer` and `FileTransformer`
- **Layer 2** — Auto-detection of file source format
- **Layer 3** — `fromFormData()` and `toFormData()` API
- **Layer 4** — `toReadableStream()`, `fromStream()`, and `pipeStream()`

---

## Layer 1 — BlobTransformer & FileTransformer

Use the `Blob` or `File` constructor directly in `@Quick` to register the transformer:

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

You can also use the string aliases `'blob'` and `'file'`:

```typescript
@Quick({ avatar: 'file', thumbnail: 'blob' })
class ProfileDto extends QModel<IProfileDto> { ... }
```

### Serialization & deserialization

**BlobTransformer** round-trips `Blob` objects through a lightweight descriptor:

```typescript
// Serialized form
{ size: 1024, type: 'image/png', _blobRef: true }

// Deserialization accepts:
// - { size, type, _blobRef }  ← serialized descriptor
// - ArrayBuffer / Uint8Array  ← programmatic creation
// - 'data:image/png;base64,...' ← data URI
```

**FileTransformer** preserves `File` metadata across serialization:

```typescript
// Serialized form
{ name: 'foto.jpg', size: 204800, type: 'image/jpeg', lastModified: 1709123456 }

// Deserialization accepts:
// - { name, size, type, lastModified }  ← serialized descriptor
// - File instance                       ← pass-through
// - Blob instance                       ← wrapped as File (from streaming)
// - 'data:image/jpeg;base64,...'        ← data URI
```

---

## Layer 2 — Auto-detection

`fromFormData()` inspects each `FormDataEntryValue` at runtime and picks the right
conversion strategy without any explicit configuration:

```
What is the value?
│
├── File instance             → keep as File          (real browser file input)
├── Blob instance             → keep as Blob
├── ArrayBuffer / Uint8Array  → auto-wrap in Blob     (programmatic)
├── string "data:..."         → decode base64 → Blob  (legacy JS / APIs)
├── string "https://..."      → keep as string URL    (CDN reference)
├── string "/storage/..."     → keep as string path   (internal server reference)
└── string "foto.jpg"         → keep as string        (filename only)
```

This covers **90% of real-world cases** with zero configuration.

---

## Layer 3 — fromFormData() & toFormData()

### fromFormData(fd, opts?)

Static method. Converts a `FormData` into a model instance using `coercionStrategy: 'loose'`
and auto-detection by default.

```typescript
// Default: auto-detection
const dto = UploadDto.fromFormData(formData);

// Force all binary fields as path references (e.g. internal proxy)
const dto = UploadDto.fromFormData(formData, { fileSource: 'reference' });

// Per-field overrides — mixed strategies in the same form
const dto = UploadDto.fromFormData(formData, {
	fields: {
		avatar: 'binary', // real binary upload
		document: 'reference', // server-side path
		thumbnail: 'base64', // data URI
	},
});
```

**`fileSource` values:**

| Value              | Behaviour                                                             |
| ------------------ | --------------------------------------------------------------------- |
| `'auto'` (default) | Runtime inspection — decision tree above                              |
| `'binary'`         | Keep `File`/`Blob` as-is; wrap `ArrayBuffer`/`Uint8Array` into `Blob` |
| `'reference'`      | Treat string values as path/URL, do not deserialize as binary         |
| `'base64'`         | Expect `data:` prefix and decode to `Blob`; error if absent           |

### toFormData(opts?)

Instance method. Builds a `FormData` from the model's fields.

```typescript
// Default: preserve binary objects
const fd = await dto.toFormData();

// Proxy / logging — avoid sending binary data over the wire
const fd = await dto.toFormData({ fileMode: 'reference' });

// Legacy API expecting base64
const fd = await dto.toFormData({ fileMode: 'base64' });

// Per-field overrides
const fd = await dto.toFormData({
	fields: { avatar: 'binary', signature: 'base64' },
});
```

**Conversion table by `fileMode`:**

| Field runtime type              | `'auto'` / `'binary'`               | `'reference'`            | `'base64'`            |
| ------------------------------- | ----------------------------------- | ------------------------ | --------------------- |
| `File`                          | `.append(k, file)`                  | `.append(k, file.name)`  | `.append(k, dataURI)` |
| `Blob`                          | `.append(k, blob, 'file')`          | `.append(k, '[Blob]')`   | `.append(k, dataURI)` |
| `ArrayBuffer`                   | auto-wrap in `Blob` + append        | `.append(k, '[binary]')` | `.append(k, dataURI)` |
| `Uint8Array`                    | auto-wrap in `Blob` + append        | `.append(k, '[binary]')` | `.append(k, dataURI)` |
| `string` / `number` / `boolean` | `.append(k, String(v))` — all modes |

### spoofMethod — HTTP method tunneling

Some backends (**Laravel**, **Symfony**, **Rails**) only accept `multipart/form-data`
with `POST`. To work with those APIs you can inject a `_method` field as the **first**
entry in the `FormData` — the backend then reads it and routes the request as if it
were `PUT`, `PATCH`, or `DELETE`.

```typescript
// One-time call option
const fd = await dto.toFormData({ spoofMethod: 'PUT' });
// FormData: _method=PUT, name=Alice, avatar=<File>
```

#### Three-level cascade (lowest → highest priority)

| Level           | Where                         | Example                                             |
| --------------- | ----------------------------- | --------------------------------------------------- |
| **Global**      | `QConfig.defaults`            | `QConfig.set({ defaults: { spoofMethod: 'PUT' } })` |
| **Decorator**   | `@Quick({}, { spoofMethod })` | `@Quick({}, { spoofMethod: 'PATCH' })`              |
| **Call option** | `toFormData({ spoofMethod })` | `toFormData({ spoofMethod: 'DELETE' })`             |

A higher-level value always wins. If `spoofMethod` is `undefined` at all levels, no
`_method` field is added.

```typescript
// 1. Global default — applies to every model unless overridden
QConfig.set({ defaults: { spoofMethod: 'PUT' } });

// 2. Decorator — override the global default for a specific model
@Quick({}, { spoofMethod: 'PATCH' })
class UploadDto extends QModel<IUploadDto> { ... }

// 3. Call option — highest priority, overrides everything
const fd = await dto.toFormData({ spoofMethod: 'DELETE' });
// → _method=DELETE (ignores global PUT and decorator PATCH)
```

#### Type-safe values — `IQSpoofMethod`

The `spoofMethod` option is typed as `IQSpoofMethod`, which provides autocomplete for
all standard HTTP methods (RFC 7231, WebDAV, DeltaV) plus a `string & {}` catch-all
for custom methods:

```typescript
import type { IQSpoofMethod } from 'quickmodel';

const methods: IQSpoofMethod[] = ['PUT', 'PATCH', 'DELETE', 'PURGE', 'SEARCH'];
```

---

## Layer 4 — Streaming

Loading 500 MB into an `ArrayBuffer` before sending blocks the thread and can cause OOM
in high-concurrency servers. The Web Platform solution is `ReadableStream<Uint8Array>`.

### toReadableStream(opts)

Emits bytes from a binary field as `Uint8Array` chunks. The file is **never fully in memory**.

```typescript
const stream = dto.toReadableStream({
	field: 'video',
	chunkSize: 64 * 1024, // default: 256 KB
});

// Upload to S3 without loading the file into memory
await s3.putObject({
	Bucket: 'uploads',
	Key: 'video.mp4',
	Body: stream,
	ContentType: dto.video.type,
});

// Or return directly as an HTTP response
return new Response(stream, {
	headers: { 'Content-Type': dto.video.type },
});
```

**With progress:**

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

Reconstructs a binary field by accumulating chunks from an incoming `ReadableStream`.

```typescript
async function handleUpload(req: Request) {
	const dto = await UploadDto.fromStream(req.body, {
		field: 'video', // which model field to populate
		maxBytes: 500 * 1024 * 1024, // safety limit: 500 MB
		onProgress: (received, total) => {
			console.log(`${received}/${total} bytes received`);
		},
	});

	// dto.video → Blob with all accumulated chunks
	await saveToStorage(dto.video);
}
```

### pipeStream(src, dst, opts?) — zero-memory mode

Connects the input stream directly to a writable stream without accumulation.
The server acts as a pure byte conductor.

```typescript
// Pipe directly from the request to S3 — zero bytes in server memory
await UploadDto.pipeStream(req.body, s3UploadStream, {
	maxBytes: 500 * 1024 * 1024,
	onProgress: (bytes) => socket.emit('progress', bytes),
});
```

### When to use which API

```
Does the file fit comfortably in memory? (< ~50 MB)
│
├── YES → fromFormData() / toFormData()
│         ├── I need the real binary          → fileMode/fileSource: 'auto' (default)
│         ├── I only need the reference       → fileMode/fileSource: 'reference'
│         └── Legacy API / JSON with base64   → fileMode/fileSource: 'base64'
│
└── NO  → toReadableStream() / fromStream() / pipeStream()
          ├── Upload to S3/CDN                → toReadableStream({ field }) → S3 body
          ├── Receive large upload            → fromStream(req.body, { field })
          ├── Zero-memory pipe                → pipeStream(src, dst)
          └── Real-time progress              → onChunk / onProgress callbacks
```

---

## Complete Usage Scenarios

### Scenario 1 — Frontend sends form with file → Backend receives it

```typescript
// FRONTEND
const fd = new FormData(formEl); // avatar: File from <input type="file">
const dto = UploadDto.fromFormData(fd);
// dto.avatar → File { name: 'foto.jpg', size: 204800, type: 'image/jpeg' }
// dto.userId → 42   (number, auto-coerced from string '42')

const { valid, rules } = dto.validationReport();
if (!valid) {
	showErrors(rules);
	return;
}

// Small file — direct upload
await fetch('/api/upload', { method: 'POST', body: await dto.toFormData() });

// Large file — streaming with progress
const stream = dto.toReadableStream({
	field: 'avatar',
	onChunk: (chunk, total) => updateProgressBar(chunk.byteLength, total),
});
await fetch('/api/upload', { method: 'POST', body: stream });
```

```typescript
// BACKEND — receive, validate and process
async function handleUpload(req: Request) {
	const fd = await req.formData();
	const dto = UploadDto.fromFormData(fd);

	const { valid, rules } = dto.validationReport();
	if (!valid) return Response.json({ errors: rules }, { status: 422 });

	// Upload to S3 without loading into memory — direct pipe
	const uploadStream = s3.createUploadStream({
		Bucket: 'uploads',
		Key: dto.avatar.name,
	});
	await UploadDto.pipeStream(dto.avatar.stream(), uploadStream);

	return Response.json({ url: cdnUrl });
}
```

### Scenario 2 — Internal microservice: references only, no binaries

```typescript
// FormData { avatar: '/storage/users/42/foto.jpg', ... }
const dto = UploadDto.fromFormData(fd, { fileSource: 'reference' });
// dto.avatar → '/storage/users/42/foto.jpg'  (string, zero bytes in memory)
```

### Scenario 3 — Round-trip with legacy base64 API

```typescript
// Receive: "data:image/jpeg;base64,/9j/..."
const dto = UploadDto.fromFormData(fd, { fileSource: 'base64' });
// dto.avatar → Blob { type: 'image/jpeg' }

// Re-send in the same format
const outFd = await dto.toFormData({ fileMode: 'base64' });
// outFd.get('avatar') → 'data:image/jpeg;base64,/9j/...' — exact round-trip
```

## MCP Skill

The [`quickmodel_form_data`](/mcp/public/skills#quickmodel_form_data) skill guides you through the full FormData workflow — generating `fromFormData()` / `toFormData()` code, choosing the right `fileMode`/`fileSource` option, and adding streaming with progress callbacks.

```
/mcp quickmodel_form_data intent=fromFormData model_fields="avatar: File, userId: number, tags: string[]"
```
