import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { IQMcpTool } from './tools/abstract-tool';

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Main class for the QuickModel MCP Server.
 * Handles the connection lifecycle and tool registration.
 */
export class QMcpServer {
	private server: McpServer;

	constructor() {
		// Load package.json dynamically
		const pkgPath = join(process.cwd(), 'package.json');
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

		// Initialize the standard MCP server
		this.server = new McpServer({
			name: pkg.name,
			version: pkg.version,
		});
	}

	/**
	 * Registers a new tool with the server.
	 * @param tool - An instance of a tool implementing IQMcpTool
	 */
	public registerTool(tool: IQMcpTool): void {
		this.server.registerTool(
			tool.name,
			{
				description: tool.description,
				inputSchema: tool.schema.shape,
			},
			async (args: z.infer<typeof tool.schema>) => {
				// We bind the execution in the tool class context
				const result = await tool.execute(args);
				return {
					content: [
						{
							type: 'text' as const,
							text: JSON.stringify(result, null, 2),
						},
					],
				};
			}
		);
	}

	/**
	 * Starts the server and connects via StdIO.
	 * This method keeps the process alive listening for input.
	 */
	public async start(): Promise<void> {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error('QuickModel MCP Server running on StdIO');
	}
}

import { QCreateModelTool, QValidateUsageTool } from './tools/model-tools';
import {
	QListTransformersTool,
	QGenerateMockDataTool,
	QInspectModelTool,
} from './tools/public-tools';
import { QSimulateTransformationTool } from './tools/core-tools';
import { QUpdateDocsTool, QGenerateTestTool } from './tools/internal-tools';

// Entry point for the script
if (import.meta.main) {
	const server = new QMcpServer();

	// Register Public Tools (Creation & Validation)
	server.registerTool(new QCreateModelTool());
	server.registerTool(new QValidateUsageTool());

	// Register Public Tools (Utility & Inspection)
	server.registerTool(new QListTransformersTool());
	server.registerTool(new QGenerateMockDataTool());
	server.registerTool(new QInspectModelTool());

	// Register Core Exposure
	server.registerTool(new QSimulateTransformationTool());

	// Register Internal Tools
	server.registerTool(new QUpdateDocsTool());
	server.registerTool(new QGenerateTestTool());

	server.start().catch((error) => {
		console.error('Fatal error in MCP Server:', error);
		process.exit(1);
	});
}
