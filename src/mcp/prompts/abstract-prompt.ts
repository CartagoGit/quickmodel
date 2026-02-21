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
export type PromptArgsSchema = Record<string, z.ZodType>;

/**
 * Interface for QuickModel MCP Prompt (Skill).
 *
 * MCP Prompts define guided multi-step workflows that chain tools together.
 * They are surfaced to the AI as "skills" it can invoke to complete complex tasks.
 *
 * @example
 * ```typescript
 * // The AI can invoke this skill when given a TypeScript interface:
 * // "Use the quickmodel_from_typescript skill to convert this interface"
 * ```
 */
export interface IQMcpPrompt<TArgs extends PromptArgsSchema = PromptArgsSchema> {
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
 */
export abstract class QAbstractPrompt<
	TArgs extends PromptArgsSchema = PromptArgsSchema,
> implements IQMcpPrompt<TArgs>
{
	abstract name: string;
	abstract title: string;
	abstract description: string;
	abstract argsSchema: TArgs;

	abstract execute(
		args: { [K in keyof TArgs]: string }
	): Promise<IQPromptResult>;

	/** Helper — build a user message */
	protected user(text: string): IQPromptMessage {
		return { role: 'user', content: { type: 'text', text } };
	}

	/** Helper — build an assistant message */
	protected assistant(text: string): IQPromptMessage {
		return { role: 'assistant', content: { type: 'text', text } };
	}
}
