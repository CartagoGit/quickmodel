import { z } from 'zod';

/**
 * Represents a single message in an MCP Prompt response.
 */
export interface IQPromptMessage {
	role: 'user' | 'assistant';
	content: {
		type: 'text';
		text: string;
	};
}

/**
 * Result returned by a prompt handler.
 */
export interface IQPromptResult {
	description?: string;
	messages: IQPromptMessage[];
}

/**
 * MCP Prompt arguments schema — a plain record of Zod types.
 * Used as `argsSchema` in `server.registerPrompt()`.
 */
export type IPromptArgsSchema = Record<string, z.ZodType>;

/**
 * Interface for QuickModel MCP Prompt (Skill).
 *
 * MCP Prompts define guided multi-step workflows that chain tools together.
 * They are surfaced to the AI as "skills" it can invoke to complete complex tasks.
 *
 * @template TArgs - Zod schema shape for the prompt arguments
 *
 * @see {@link QAbstractPrompt} for the base class implementation
 * @see {@link IQMcpTool} for the simpler single-call tool contract
 *
 * @example
 * ```typescript
 * // The AI can invoke this skill when given a TypeScript interface:
 * // "Use the quickmodel_from_typescript skill to convert this interface"
 * ```
 */
export interface IQMcpPrompt<
	TArgs extends IPromptArgsSchema = IPromptArgsSchema,
> {
	/** Unique identifier — used as the skill name */
	name: string;

	/** Human-readable title shown in AI tool palettes */
	title: string;

	/** Description of what this skill does and when to use it */
	description: string;

	/** Zod schema for the prompt arguments */
	argsSchema: TArgs;

	/** Execute the prompt and return the guided messages */
	execute(args: { [K in keyof TArgs]: string }): Promise<IQPromptResult>;
}

/**
 * Abstract base class for QuickModel MCP Prompts.
 *
 * Concrete prompt classes extend this and implement the four abstract members:
 * `name`, `title`, `description`, `argsSchema`, and `execute()`.
 * The `user()` and `assistant()` helpers simplify building the `messages` array.
 *
 * @template TArgs - Zod schema shape for the prompt arguments
 * @see {@link IQMcpPrompt}
 */
export abstract class QAbstractPrompt<
	TArgs extends IPromptArgsSchema = IPromptArgsSchema,
> implements IQMcpPrompt<TArgs> {
	abstract name: string;
	abstract title: string;
	abstract description: string;
	abstract argsSchema: TArgs;

	abstract execute(args: {
		[K in keyof TArgs]: string;
	}): Promise<IQPromptResult>;

	/**
	 * Builds an `IQPromptMessage` with `role: 'user'`.
	 *
	 * @param text - The message body text (plain text or Markdown)
	 * @returns A `{ role: 'user', content: { type: 'text', text } }` message object
	 */
	protected user(text: string): IQPromptMessage {
		return { role: 'user', content: { type: 'text', text } };
	}

	/**
	 * Builds an `IQPromptMessage` with `role: 'assistant'`.
	 *
	 * @param text - The message body text (plain text or Markdown)
	 * @returns A `{ role: 'assistant', content: { type: 'text', text } }` message object
	 */
	protected assistant(text: string): IQPromptMessage {
		return { role: 'assistant', content: { type: 'text', text } };
	}
}
