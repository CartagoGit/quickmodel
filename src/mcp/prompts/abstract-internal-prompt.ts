import { QAbstractPrompt } from './abstract-prompt';
import type { IPromptArgsSchema, IQPromptMessage } from './abstract-prompt';

/**
 * Global context injected at the start of every **internal** MCP prompt.
 *
 * Internal prompts are skills used to develop and maintain the QuickModel
 * codebase itself (implement features, fix lint, sync project, etc.).
 * External/public prompts (for QuickModel end-users) do NOT receive this context.
 *
 * @see {@link QAbstractInternalPrompt} — base class that prepends this context to every execute()
 * @internal
 */
const INTERNAL_PROMPT_CONTEXT = `
## Contexto obligatorio del proyecto QuickModel

Eres un agente trabajando en el **desarrollo interno del proyecto QuickModel**.
Antes de actuar, debes respetar todas las instrucciones y convenciones definidas
en los siguientes archivos de referencia. Léelos cuando necesites contexto adicional:

### Archivos de instrucciones y arquitectura
- \`.github/copilot-instructions.md\` — Índice principal: reglas de código, TDD, linting, metodología
- \`.github/COMMIT_CONVENTIONS.md\` — Formato de commits (Conventional Commits + versionado semántico)
- \`docs-vitepress/en/guide/contributing.md\` — Arquitectura SOLID, patrones, path aliases, build system
- \`docs-vitepress/proposals/TASKS.md\` — Backlog de propuestas y tareas pendientes

### Reglas críticas (resumen ejecutivo)

**TypeScript strict**
- Sin \`any\`, sin \`null\` implícito, sin retornos implícitos
- Interfaces y type aliases con prefijo \`I\` → \`interface IUser {}\`, \`type IStatus = ...\`
- \`noUncheckedIndexedAccess\`: el acceso a arrays/Maps puede ser \`undefined\`

**Linting (ESLint)**
- Nombres de variables/parámetros: mínimo 3 caracteres (excepciones: \`_\`, \`id\`, \`on\`, \`fs\`, \`cb\`)
- Máximo 3 parámetros posicionales por función — usar objeto si se necesitan más
- Sin \`console.log\` en \`src/\` (excepto \`mcp-cli.ts\` y \`server.ts\`)
- Prohibido importar barrel \`quickmodel\` desde \`src/\`

**Path aliases — nunca rutas relativas**
- Usar \`@/core/...\`, \`@/transformers/...\` desde \`src/\`
- Dentro de \`src/mcp/**\`: usar \`@mcp/server\`, \`@mcp/deps\`, \`@mcp/tools/...\`
- Prohibido importar \`zod\` directamente en \`src/mcp/\` — usar \`import { z } from '@mcp/deps'\`

**Tests**
- Usar \`@Quick({...})\` — NUNCA \`@QType(...)\` en tests
- Ejecutar: \`bun test\` | Coverage: \`bun run test:coverage\`

**TDD obligatorio (siempre)**
1. Test en rojo primero
2. Implementación mínima para que pase
3. \`lint_check\` → MUST pass | \`typecheck\` → MUST pass | \`check_project_rules\` → MUST pass
4. Refactor si es necesario

**Archivos temporales**
- SIEMPRE \`./tmp/<archivo>\` (carpeta \`tmp/\` del proyecto, está en \`.gitignore\`)
- NUNCA \`/tmp/<archivo>\` del sistema operativo
`.trim();

/**
 * Abstract base class for **internal** QuickModel MCP Prompts.
 *
 * Extends {@link QAbstractPrompt} and automatically injects
 * {@link INTERNAL_PROMPT_CONTEXT} into the first `user()` message of every
 * execution, so all internal skills inherit the full project context without
 * any boilerplate in individual prompt classes.
 *
 * Use this base class for prompts that operate on the QuickModel codebase itself:
 * implementing features, fixing lint, syncing the project, writing docs, etc.
 *
 * For prompts aimed at end-users of QuickModel (e.g. converting a TS interface,
 * debugging a model), extend {@link QAbstractPrompt} directly instead.
 *
 * @template TArgs - Zod schema shape for the prompt arguments
 * @see {@link QAbstractPrompt} — base class for all prompts
 */
export abstract class QAbstractInternalPrompt<
	TArgs extends IPromptArgsSchema = IPromptArgsSchema,
> extends QAbstractPrompt<TArgs> {
	private _contextSent = false;

	/**
	 * Builds an `IQPromptMessage` with `role: 'user'`.
	 * Automatically prepends {@link INTERNAL_PROMPT_CONTEXT} the first time it
	 * is called within a prompt execution.
	 *
	 * @param text - The message body text
	 * @returns A user message, with full project context prepended on first call
	 */
	protected override user(text: string): IQPromptMessage {
		if (!this._contextSent) {
			this._contextSent = true;
			return super.user(`${INTERNAL_PROMPT_CONTEXT}\n\n---\n\n${text}`);
		}
		return super.user(text);
	}
}
