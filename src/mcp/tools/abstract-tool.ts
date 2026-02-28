import { z } from 'zod';

/**
 * Interface definition for any MCP tool in the QuickModel ecosystem.
 * All tools must implement this interface to be registered with the QMcpServer.
 *
 * @typeParam T - Zod schema type defining the tool's accepted arguments.
 * @see {@link QAbstractTool} — abstract base class that implements this interface
 * @see {@link QMcpServer} — server that registers and exposes tools
 */
export interface IQMcpTool<T extends z.ZodObject<any> = z.ZodObject<any>> {
	/**
	 * Unique name of the tool (e.g., 'create_model', 'validate_usage').
	 */
	name: string;

	/**
	 * Human-readable description of what the tool does.
	 * This is used by the AI to understand when to call this tool.
	 */
	description: string;

	/**
	 * Zod schema defining the arguments accepted by the tool.
	 * Using strict Zod schemas ensures type safety and prevents hallucinations.
	 */
	schema: T;

	/**
	 * Execution logic of the tool.
	 * @param args - Arguments strictly matching the Zod schema.
	 * @returns Promise resolving to the result of the operation.
	 */
	execute(args: z.infer<T>): Promise<unknown>;
}

/**
 * Abstract base class for QuickModel MCP tools.
 *
 * Provides a standard structure for implementing specific tools that can be
 * registered with {@link QMcpServer}. Subclasses must implement `name`,
 * `description`, `schema`, and `execute()`.
 *
 * @typeParam T - Zod schema type defining the tool's accepted arguments
 *
 * @see {@link IQMcpTool} — the interface this class implements
 * @see {@link QMcpServer} — registers tool instances and exposes them via MCP
 */
export abstract class QAbstractTool<
	T extends z.ZodObject<any>,
> implements IQMcpTool<T> {
	abstract name: string;
	abstract description: string;
	abstract schema: T;

	/**
	 * Implementation of the tool logic.
	 * @param args - Validated arguments.
	 */
	abstract execute(args: z.infer<T>): Promise<unknown>;
}
