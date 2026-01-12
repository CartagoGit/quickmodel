#!/usr/bin/env node
import { QMcpServer } from './mcp/server';
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
} else {
	// Basic Help
	console.log(`
QuickModel CLI v${pkg.version}

Usage:
  npx @cartago-git/quickmodel mcp    Start the Model Context Protocol server
  npx @cartago-git/quickmodel help   Show this help
`);
}
