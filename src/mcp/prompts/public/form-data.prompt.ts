import { z } from '@mcp/deps';
import { QAbstractPrompt } from '../abstract-prompt';
import type { IQPromptResult } from '../abstract-prompt';

/**
 * Skill: Guided workflow for FormData ↔ QModel integration.
 *
 * Covers:
 * - `fromFormData(fd, opts?)` — parse a browser/server FormData into a typed QModel
 * - `toFormData(opts?)` — build a FormData from a QModel instance
 * - `fileSource` / `fileMode` options: 'auto' | 'binary' | 'reference' | 'base64'
 * - Per-field override: `{ fields: { avatar: 'binary', doc: 'reference' } }`
 * - Streaming for large files: `toReadableStream()`, `fromStream()`, `pipeStream()`
 * - `IQStreamProgress` callback: `{ bytes, total, percent, chunks, bytesPerSec, elapsed, eta }`
 * - When `total` / `percent` / `eta` are `null` (stream without Content-Length)
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QModel.toFormData} for the FormData serialization method
 * @see {@link QModel.fromFormData} for the FormData deserialization method
 */
export class QFormDataPrompt extends QAbstractPrompt<{
	scenario: z.ZodString;
	model_fields: z.ZodOptional<z.ZodString>;
	file_size: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_form_data';
	title = 'FormData ↔ QModel Integration Guide';
	description =
		'Guided workflow for integrating browser/server FormData with a QModel. ' +
		'Covers fromFormData(), toFormData(), fileMode/fileSource options (auto/binary/reference/base64), ' +
		'streaming (toReadableStream, fromStream, pipeStream) for large files, ' +
		'and the IQStreamProgress callback with bytes, total, percent, chunks, bytesPerSec, elapsed, eta. ' +
		'Use this when working with file uploads, multipart forms, or any Blob/File field in a QModel.';

	argsSchema = {
		scenario: z
			.string()
			.describe(
				'Describe the use case. E.g.: "User uploads avatar and profile data from a browser form", ' +
					'"Server receives video upload and pipes it to S3", "Microservice passes file references without binary data"'
			),
		model_fields: z
			.string()
			.optional()
			.describe(
				'Optional comma-separated list of relevant fields and types. ' +
					'E.g. "avatar: File, userId: number, description: string"'
			),
		file_size: z
			.string()
			.optional()
			.describe(
				'"small" for files < 50 MB (fromFormData/toFormData), ' +
					'"large" for files > 50 MB (toReadableStream/fromStream/pipeStream). ' +
					'Omit to get guidance for both.'
			),
	};

	execute(args: {
		scenario: string;
		model_fields?: string;
		file_size?: string;
	}): Promise<IQPromptResult> {
		const { scenario, model_fields, file_size } = args;

		const fieldHint = model_fields
			? `\n\n**Model fields:** \`${model_fields}\``
			: '';

		const sizeFocus =
			file_size === 'small'
				? 'Focus on `fromFormData()` and `toFormData()` with fileMode/fileSource options.'
				: file_size === 'large'
					? 'Focus on `toReadableStream()`, `fromStream()`, `pipeStream()` and the `IQStreamProgress` callback.'
					: 'Cover both in-memory (fromFormData/toFormData) and streaming paths.';

		return Promise.resolve({
			description: `FormData ↔ QModel: ${scenario}`,
			messages: [
				this.user(
					`I need to integrate FormData with a QModel for this scenario:\n\n` +
						`**Scenario:** ${scenario}${fieldHint}\n\n` +
						`${sizeFocus}\n\n` +
						`Please guide me through the correct QuickModel approach.`
				),
				this.assistant(
					`### FormData ↔ QModel — Integration Guide\n\n` +
						`I will guide you through the correct QuickModel API for your scenario.\n\n` +
						`---\n\n` +
						`### Quick decision tree\n\n` +
						`\`\`\`\n` +
						`File < 50 MB? → fromFormData(fd) / toFormData()\n` +
						`File > 50 MB? → toReadableStream() / fromStream() / pipeStream()\n` +
						`\`\`\`\n\n` +
						`---\n\n` +
						`### In-memory API (< 50 MB)\n\n` +
						`| Method / Option | Purpose |\n` +
						`|---|---|\n` +
						`| \`Model.fromFormData(fd)\` | Parse FormData → typed model instance (auto-detect File/Blob/string) |\n` +
						`| \`dto.$qm.toFormData()\` | Build FormData from model fields |\n` +
						`| \`fileSource: 'auto'\` (default) | Runtime inspection: File→File, ArrayBuffer→Blob, "data:"→Blob, URL→string |\n` +
						`| \`fileSource: 'binary'\` | Preserve all as File/Blob |\n` +
						`| \`fileSource: 'reference'\` | Treat string values as paths/URLs, no binary deserialisation |\n` +
						`| \`fileSource: 'base64'\` | Decode \`data:\` URI → Blob |\n` +
						`| \`fileMode\` (same values) | Output mode for \`toFormData()\` |\n` +
						`| \`fields: { avatar: 'binary' }\` | Per-field override — highest precedence |\n` +
						`| \`@Quick({ fileMode: 'reference' })\` | Permanent field-level default in decorator |\n\n` +
						`**Precedence:** \`@Quick({ fileMode })\` < global call option < per-field \`fields\` option\n\n` +
						`---\n\n` +
						`### Streaming API (> 50 MB)\n\n` +
						`| Method | Purpose |\n` +
						`|---|---|\n` +
						`| \`dto.$qm.toReadableStream({ field, chunkSize?, onChunk? })\` | Emit model field as \`ReadableStream<Uint8Array>\` — never full file in memory |\n` +
						`| \`dto.$qm.toReadableStream({ multipart: true, onChunk? })\` | Emit all fields as a complete \`multipart/form-data\` stream |\n` +
						`| \`Model.fromStream(stream, { field, maxBytes?, onProgress? })\` | Accumulate incoming stream chunks into a model Blob field |\n` +
						`| \`Model.pipeStream(src, dst, { maxBytes?, onProgress? })\` | Zero-memory pipe from source to destination (S3, WriteStream, …) |\n\n` +
						`---\n\n` +
						`### IQStreamProgress — all callbacks receive this object\n\n` +
						`\`\`\`typescript\n` +
						`interface IQStreamProgress {\n` +
						`  bytes: number;          // always available\n` +
						`  total: number | null;   // null if no Content-Length\n` +
						`  percent: number | null; // null if total is null\n` +
						`  chunks: number;         // always available\n` +
						`  bytesPerSec: number;    // always available\n` +
						`  elapsed: number;        // ms since stream start — always available\n` +
						`  eta: number | null;     // null if total is null\n` +
						`}\n` +
						`\`\`\`\n\n` +
						`**When is \`total\` null?** When receiving a \`req.body\` stream where the client did not send \`Content-Length\`. A \`File\` from a browser form always has \`.size\` — \`total\` is always set in that case.\n\n` +
						`---\n\n` +
						`Now I will generate the specific code for your scenario: **${scenario}**.`
				),
				this.user(
					`Based on my scenario ("${scenario}"), please:\n` +
						`1. Show the QModel class definition with the correct \`@Quick()\` decorators for Blob/File fields\n` +
						`2. Show the \`fromFormData()\` or \`fromStream()\` call with the right options\n` +
						`3. Show the \`toFormData()\` or \`toReadableStream()\` call for the output side\n` +
						`4. If streaming, show the full \`IQStreamProgress\` callback with UI update examples\n` +
						`5. Highlight which \`total\`/\`percent\`/\`eta\` fields may be \`null\` and why\n` +
						`6. Show the \`isValid\` / \`validationReport\` check before any network operation` +
						(model_fields
							? `\n\nUse these fields: \`${model_fields}\``
							: '')
				),
			],
		});
	}
}
