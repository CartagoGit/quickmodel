import { z } from '@mcp/deps';

/**
 * Represents a single message in an MCP Prompt response.
 * @see {@link IQPromptResult} — the result container that holds an array of these messages
 * @see {@link QAbstractPrompt.user} — helper that constructs a user-role message
 * @see {@link QAbstractPrompt.assistant} — helper that constructs an assistant-role message
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
 * @see {@link IQPromptMessage} — individual messages that make up the result
 * @see {@link IQMcpPrompt.execute} — method that returns this type
 */
export interface IQPromptResult {
	description?: string;
	messages: IQPromptMessage[];
}

/**
 * MCP Prompt arguments schema — a plain record of Zod types.
 * Used as `argsSchema` in `server.registerPrompt()`.
 * @see {@link IQMcpPrompt.argsSchema} — property that declares this type on prompt classes
 * @see {@link QAbstractPrompt} — base class whose `argsSchema` uses this type
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
	 * @see {@link QAbstractPrompt.assistant} — counterpart that builds an assistant message
	 * @see {@link IQPromptMessage} — shape of the returned message object
	 */
	protected user(text: string): IQPromptMessage {
		return { role: 'user', content: { type: 'text', text } };
	}

	/**
	 * Builds an `IQPromptMessage` with `role: 'assistant'`.
	 *
	 * @param text - The message body text (plain text or Markdown)
	 * @returns A `{ role: 'assistant', content: { type: 'text', text } }` message object
	 * @see {@link QAbstractPrompt.user} — counterpart that builds a user message
	 * @see {@link IQPromptMessage} — shape of the returned message object
	 */
	protected assistant(text: string): IQPromptMessage {
		return { role: 'assistant', content: { type: 'text', text } };
	}
}
