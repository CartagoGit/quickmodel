#!/usr/bin/env node
/**
 * QuickModel CLI entry point.
 *
 * Starts the QuickModel MCP server when invoked with `mcp`, generates
 * scaffolding when invoked with `generate`, or prints usage help otherwise.
 *
 * @example
 * ```sh
 * npx quickmodel mcp                                       # start MCP server
 * npx quickmodel generate model User --fields "id:number"  # scaffold a model
 * npx quickmodel generate transformer Decimal              # transformer skeleton
 * npx quickmodel generate integration prisma              # integration boilerplate
 * npx quickmodel help                                      # print usage
 * ```
 *
 * @see {@link QMcpServer} — the server class instantiated by the `mcp` sub-command
 * @see {@link runGenerateCommand} — the `generate` sub-command dispatcher
 * @module quickmodel/cli
 */
import { QMcpServer } from './mcp/server';
import { runGenerateCommand } from './cli/generate.command';
import pkg from '../package.json';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'mcp') {
	const server = new QMcpServer({
		name: pkg.name,
		version: pkg.version,
	});

	server.registerTools(QMcpServer.getDefaultTools());

	server.start().catch((error) => {
		console.error('Fatal error in MCP Server:', error);
		process.exit(1);
	});
} else if (command === 'generate') {
	const genArgs = args.slice(1);
	console.log(runGenerateCommand(genArgs));
} else {
	// Basic Help
	console.log(`
QuickModel CLI v${pkg.version}

Usage:
  npx quickmodel mcp                                       Start the MCP server
  npx quickmodel generate model <ClassName> [--fields ...]  Scaffold a QModel class
  npx quickmodel generate transformer <Name>               Transformer skeleton
  npx quickmodel generate integration <target>             Integration boilerplate
  npx quickmodel help                                      Show this help
`);
}
