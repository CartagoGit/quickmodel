import { z } from '@mcp/deps';

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
	 * @see {@link QMcpServer.registerTools} — uses this name to register the tool in MCP
	 */
	name: string;

	/**
	 * Human-readable description of what the tool does.
	 * This is used by the AI to understand when to call this tool.
	 * @see {@link IQMcpTool.schema} — complements this description with the typed argument schema
	 */
	description: string;

	/**
	 * Zod schema defining the arguments accepted by the tool.
	 * Using strict Zod schemas ensures type safety and prevents hallucinations.
	 * @see {@link IQMcpTool.execute} — consumes the inferred type of this schema as its argument
	 */
	schema: T;

	/**
	 * Execution logic of the tool.
	 * @param args - Arguments strictly matching the Zod schema.
	 * @returns Promise resolving to an `IQMcpToolResult`-compatible object —
	 *   either `{ success: true; ... }` on success, or `{ success: false; error: string }` on failure.
	 * @see {@link QAbstractTool.execute} — base class abstract implementation of this method
	 * @see {@link IQMcpTool.schema} — Zod schema whose inferred type becomes `args`
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
 * @see {@link QAbstractPrompt} — analogous base class for MCP prompts (skills)
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
	 * @returns Promise resolving to an `IQMcpToolResult`-compatible object —
	 *   either `{ success: true; ... }` on success, or `{ success: false; error: string }` on failure.
	 * @see {@link IQMcpTool.execute} — interface contract this method fulfils
	 * @see {@link QAbstractTool.schema} — Zod schema whose inferred type constrains `args`
	 */
	abstract execute(args: z.infer<T>): Promise<unknown>;
}
