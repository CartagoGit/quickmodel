import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { IQMcpTool } from './tools/abstract-tool';
import type { IQMcpPrompt } from './prompts/abstract-prompt';
import {
	QFromTypescriptPrompt,
	QDebugModelPrompt,
	QGenerateTestDataPrompt,
	QInspectAndSchemaPrompt,
} from './prompts/public';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { safeStringify } from '../core/helpers/transform-helpers';

import {
	QListTransformersTool,
	QGenerateMockDataTool,
	QInspectModelTool,
	QSearchDocsTool,
	QJsonToModelTool,
	QInterfaceToModelTool,
	QExportJsonSchemaTool,
	QExplainErrorTool,
	QSimulateTransformationTool,
	QCreateModelTool,
	QValidateUsageTool,
} from './tools/public';

import {
	QUpdateDocsTool,
	QGenerateTestTool,
	QCheckMissingJSDocsTool,
	QCheckProjectHealthTool,
	QGetCoverageReportTool,
	QSyncDocsTool,
	QScaffoldFeatureTool,
	QCheckApiCompatibilityTool,
	QBenchmarkPerformanceTool,
	QCheckProjectRulesTool,
	QCheckSecurityTool,
} from './tools/internal';
/**
 * Main class for the QuickModel MCP Server.
 * Handles the connection lifecycle and tool registration.
 */
export class QMcpServer {
	private server: McpServer;

	constructor(options?: { name?: string; version?: string }) {
		let name = 'quickmodel-mcp';
		let version = '0.0.0';

		try {
			// Load package.json dynamically ONLY if not provided
			if (!options?.name || !options?.version) {
				const pkgPath = join(process.cwd(), 'package.json');
				if (existsSync(pkgPath)) {
					const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
					name = pkg.name || name;
					version = pkg.version || version;
				}
			}
		} catch (_e) {
			// Ignore error and use defaults
		}

		// Initialize the standard MCP server
		this.server = new McpServer({
			name: options?.name || name,
			version: options?.version || version,
		});
	}

	/**
	 * Returns the list of available tools.
	 */
	public static getDefaultTools(): IQMcpTool[] {
		return [
			// Public Tools
			new QCreateModelTool(),
			new QValidateUsageTool(),
			new QListTransformersTool(),
			new QGenerateMockDataTool(),
			new QInspectModelTool(),
			new QSearchDocsTool(),
			new QInterfaceToModelTool(),
			new QExportJsonSchemaTool(),
			new QExplainErrorTool(),
			// Core Simulation
			new QSimulateTransformationTool(),

			// Internal Dev Tools
			new QUpdateDocsTool(),
			new QGenerateTestTool(),
			new QCheckMissingJSDocsTool(),
			new QCheckProjectHealthTool(),
			new QGetCoverageReportTool(),
			new QCheckProjectRulesTool(),
			new QCheckSecurityTool(),
			new QJsonToModelTool(),
			new QSyncDocsTool(),
			new QScaffoldFeatureTool(),
			new QCheckApiCompatibilityTool(),
			new QBenchmarkPerformanceTool(),
		];
	}

	/**
	 * Returns the list of available prompts (skills).
	 */
	public static getDefaultPrompts(): IQMcpPrompt[] {
		return [
			new QFromTypescriptPrompt(),
			new QDebugModelPrompt(),
			new QGenerateTestDataPrompt(),
			new QInspectAndSchemaPrompt(),
		];
	}

	/**
	 * Registers a list of prompts (skills) with the server.
	 */
	public registerPrompts(prompts: IQMcpPrompt[]): void {
		for (const prompt of prompts) {
			this.server.registerPrompt(
				prompt.name,
				{
					description: prompt.description,
					argsSchema: prompt.argsSchema,
				},
				async (args) => {
					return (await prompt.execute(args as any)) as any;
				}
			);
		}
	}

	/**
	 * Registers a list of tools with the server.
	 */
	public registerTools(tools: IQMcpTool[]): void {
		for (const tool of tools) {
			this.server.registerTool(
				tool.name,
				{
					description: tool.description,
					inputSchema: tool.schema.shape,
				},
				async (args: unknown) => {
					// Zod parsing is handled by the SDK inside registerTool usually,
					// but here we are using the low-level McpServer wrapper.

					try {
						// Validate args against schema manually just in case or trust the SDK?
						// The SDK validates against the schema provided.
						const typedArgs = args as z.infer<typeof tool.schema>;
						const result = await tool.execute(typedArgs);
						return {
							content: [
								{
									type: 'text' as const,
									text: safeStringify(result, 2),
								},
							],
						};
					} catch (error: any) {
						return {
							content: [
								{
									type: 'text' as const,
									text: `Error executing tool ${tool.name}: ${error.message}`,
								},
							],
							isError: true,
						};
					}
				}
			);
		}
	}

	/**
	 * Starts the server and connects via StdIO.
	 */
	public async start(): Promise<void> {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error('QuickModel MCP Server running on StdIO');
	}
}

// Entry point for the script
/* v8 ignore start */
if (import.meta.main) {
	const server = new QMcpServer();
	server.registerTools(QMcpServer.getDefaultTools());
	server.registerPrompts(QMcpServer.getDefaultPrompts());

	server.start().catch((error) => {
		console.error('Fatal error in MCP Server:', error);
		process.exit(1);
	});
}
/* v8 ignore stop */
