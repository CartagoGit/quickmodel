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
	QFormValidationPrompt,
	QFullPipelinePrompt,
	QMixinPrompt,
	QAliasComputedPrompt,
	QMigrationPrompt,
	QAsyncRulesPrompt,
	QAddQGroupPrompt,
	QSecurityReviewPrompt,
	QTransformerGuidePrompt,
	QImplementFeaturePrompt,
	QFixLintPrompt,
	QFixTypecheckPrompt,
	QRefactorPrompt,
	QApplySolidPrompt,
	QSyncProjectPrompt,
} from './prompts/public';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { safeStringify } from '../core/helpers/transform-helpers';

import {
	QListTransformersTool,
	QListValidatorsTool,
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
	QCheckIntegrityTool,
	QSimulateRulesTool,
	QSimulateAsyncRulesTool,
	QRoundtripTool,
	QDiffModelsTool,
	QGetFormSchemaTool,
	QGetModelSchemaTool,
	QSimulateValidationTool,
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
	QListTodosTool,
	QCheckBundleSizeTool,
	QCheckChangelogTool,
	QLintCheckTool,
	QTypecheckTool,
	QPreCommitCheckTool,
	QRunTestsTool,
	QGetStagedFilesTool,
	QProjectStatusTool,
} from './tools/internal';
/**
 * Main entry point for the **QuickModel MCP Server**.
 *
 * Wraps an `@modelcontextprotocol/sdk` `McpServer` and exposes a curated set
 * of public tools (end-user facing) and internal development tools accessible
 * to AI-agent workflows.
 *
 * @remarks
 * Version and name are read from `package.json` at construction time when
 * not provided explicitly via `options`.
 *
 * Typical usage (programmatic embedding):
 * ```typescript
 * const server = new QMcpServer();
 * server.registerTools(QMcpServer.getDefaultPublicTools());
 * server.registerPrompts(QMcpServer.getDefaultPrompts());
 * await server.start(); // connects via StdIO
 * ```
 *
 * The module also exposes a standalone CLI entry point (`mcp-cli.ts`) that
 * instantiates this class automatically.
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
	 * Returns only the public-facing tool instances (intended for end users and
	 * AI coding assistants).
	 *
	 * @remarks
	 * Includes ~20 tools covering: model creation, mock generation, schema
	 * export, form schema, roundtrip checks, rule simulation, and more.
	 *
	 * @returns A fresh array of instantiated public `IQMcpTool`s.
	 */
	public static getDefaultPublicTools(): IQMcpTool[] {
		return [
			new QCreateModelTool(),
			new QValidateUsageTool(),
			new QListTransformersTool(),
			new QListValidatorsTool(),
			new QGenerateMockDataTool(),
			new QInspectModelTool(),
			new QSearchDocsTool(),
			new QInterfaceToModelTool(),
			new QExportJsonSchemaTool(),
			new QExplainErrorTool(),
			new QSimulateTransformationTool(),
			new QSimulateValidationTool(),
			new QGetFormSchemaTool(),
			new QGetModelSchemaTool(),
			new QCheckIntegrityTool(),
			new QSimulateRulesTool(),
			new QSimulateAsyncRulesTool(),
			new QRoundtripTool(),
			new QDiffModelsTool(),
			new QJsonToModelTool(),
		];
	}

	/**
	 * Returns only the internal development and maintenance tool instances.
	 *
	 * @remarks
	 * Includes ~20 tools covering: health checks, lint, typecheck, test runner,
	 * coverage, bundle-size analysis, changelog verification, API compatibility,
	 * benchmarking, scaffold, and more.
	 *
	 * @returns A fresh array of instantiated internal `IQMcpTool`s.
	 */
	public static getDefaultInternalTools(): IQMcpTool[] {
		return [
			new QUpdateDocsTool(),
			new QGenerateTestTool(),
			new QCheckMissingJSDocsTool(),
			new QCheckProjectHealthTool(),
			new QGetCoverageReportTool(),
			new QCheckProjectRulesTool(),
			new QCheckSecurityTool(),
			new QListTodosTool(),
			new QCheckBundleSizeTool(),
			new QCheckChangelogTool(),
			new QLintCheckTool(),
			new QTypecheckTool(),
			new QPreCommitCheckTool(),
			new QRunTestsTool(),
			new QGetStagedFilesTool(),
			new QProjectStatusTool(),
			new QSyncDocsTool(),
			new QScaffoldFeatureTool(),
			new QCheckApiCompatibilityTool(),
			new QBenchmarkPerformanceTool(),
		];
	}

	/**
	 * Returns all available tools — public (end-user) + internal (dev/ops).
	 *
	 * @returns Concatenation of `getDefaultPublicTools()` and
	 * `getDefaultInternalTools()`.
	 */
	public static getDefaultTools(): IQMcpTool[] {
		return [
			...QMcpServer.getDefaultPublicTools(),
			...QMcpServer.getDefaultInternalTools(),
		];
	}

	/**
	 * Returns the full list of built-in prompt (skill) instances.
	 *
	 * @remarks
	 * Prompts guide AI agents through common QuickModel workflows, e.g.
	 * converting TypeScript interfaces, debugging models, security review,
	 * migration, and more.
	 *
	 * @returns A fresh array of instantiated `IQMcpPrompt`s.
	 */
	public static getDefaultPrompts(): IQMcpPrompt[] {
		return [
			new QFromTypescriptPrompt(),
			new QDebugModelPrompt(),
			new QGenerateTestDataPrompt(),
			new QInspectAndSchemaPrompt(),
			new QFormValidationPrompt(),
			new QFullPipelinePrompt(),
			new QMixinPrompt(),
			new QAliasComputedPrompt(),
			new QMigrationPrompt(),
			new QAsyncRulesPrompt(),
			new QAddQGroupPrompt(),
			new QSecurityReviewPrompt(),
			new QTransformerGuidePrompt(),
			new QImplementFeaturePrompt(),
			new QFixLintPrompt(),
			new QFixTypecheckPrompt(),
			new QRefactorPrompt(),
			new QApplySolidPrompt(),
			new QSyncProjectPrompt(),
		];
	}

	/**
	 * Registers a collection of prompts on the underlying `McpServer`.
	 *
	 * @param prompts - Array of `IQMcpPrompt` instances to register.
	 *
	 * @remarks
	 * Each prompt is registered with its `name`, `description`, `argsSchema`,
	 * and an async `execute` handler. The MCP SDK handles schema validation.
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
	 * Registers a collection of tools on the underlying `McpServer`.
	 *
	 * @param tools - Array of `IQMcpTool` instances to register.
	 *
	 * @remarks
	 * Each tool result is JSON-serialised via `safeStringify` before being
	 * returned as MCP text content. Errors are caught and surfaced as
	 * `isError: true` MCP responses rather than letting exceptions propagate
	 * to the transport layer.
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
	 * Connects the server to the StdIO transport and starts listening.
	 *
	 * @remarks
	 * Emits a startup message to `stderr` (standard practice for MCP servers
	 * so it doesn’t pollute the StdIO JSON-RPC channel).
	 *
	 * @returns A `Promise` that resolves once the transport is connected.
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
