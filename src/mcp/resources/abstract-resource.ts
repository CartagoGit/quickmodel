/**
 * Abstract base for all QuickModel MCP Resources.
 *
 * Resources expose read-only content to MCP clients (e.g. GitHub Copilot)
 * via a named URI. Subclasses provide the URI, metadata, and `read()` logic.
 *
 * @see {@link QProjectStateResource} — internal project state resource
 * @see {@link QApiReferenceResource} — external API reference resource
 * @see {@link QMcpServer.registerResources} — registers resource instances on the server
 */
export interface IQMcpResource {
	/** Unique human-readable identifier for the resource. */
	name: string;
	/** MCP URI used to read this resource (e.g. `quickmodel://project/state`). */
	uri: string;
	/** Short description shown to the AI client. */
	description: string;
	/** MIME type of the content returned by `read()`. */
	mimeType: string;
	/**
	 * Returns the resource content as a string.
	 * Called by the MCP server on every `resources/read` request — must be fresh each time.
	 */
	read(): Promise<string>;
}

/**
 * Abstract base class implementing {@link IQMcpResource}.
 *
 * Subclasses must declare `name`, `uri`, `description`, `mimeType`, and `read()`.
 *
 * @see {@link IQMcpResource} — the interface this class implements
 * @see {@link QMcpServer.registerResources} — consumes instances of this class
 */
export abstract class QAbstractResource implements IQMcpResource {
	abstract name: string;
	abstract uri: string;
	abstract description: string;
	abstract mimeType: string;
	abstract read(): Promise<string>;
}
