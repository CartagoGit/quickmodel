import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const projectRoot = resolve(process.cwd());
const vscodeDir = join(projectRoot, '.vscode');
const mcpFile = join(vscodeDir, 'mcp.json');

// Relative path configuration for VS Code
const mcpConfig = {
	servers: {
		quickmodel: {
			command: 'bun',
			args: ['run', '${workspaceFolder}/src/mcp/server.ts'],
		},
	},
};

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function setupVSCode() {
	console.log(`${YELLOW}Detected VS Code environment...${RESET}`);

	if (!existsSync(vscodeDir)) {
		console.log(`Creating .vscode directory...`);
		mkdirSync(vscodeDir);
	}

	let currentConfig: any = { servers: {} };
	if (existsSync(mcpFile)) {
		try {
			const content = readFileSync(mcpFile, 'utf-8');
			currentConfig = JSON.parse(content);
		} catch (e) {
			console.warn(
				`${YELLOW}Warning: Could not parse existing mcp.json. Starting fresh.${RESET}`
			);
		}
	}

	// Merge config
	currentConfig.servers = {
		...currentConfig.servers,
		...mcpConfig.servers,
	};

	writeFileSync(mcpFile, JSON.stringify(currentConfig, null, 4));
	console.log(
		`${GREEN}✅ Successfully updated .vscode/mcp.json with MCP configuration.${RESET}`
	);
	console.log(
		`   Server configured with relative path: \${workspaceFolder}/src/mcp/server.ts`
	);
}

function showOtherIDEsInfo() {
	console.log(`\n${YELLOW}ℹ️  Information for other IDEs:${RESET}`);

	console.log(`\n${GREEN}Cursor IDE:${RESET}`);
	console.log(`   Cursor has native MCP support.`);
	console.log(`   1. Open Command Palette (Ctrl+Shift+P)`);
	console.log(`   2. Search for "MCP"`);
	console.log(
		`   3. Add the server manually pointing to: ${resolve(process.cwd(), 'src/mcp/server.ts')}`
	);
	console.log(`   🔗 Docs: https://cursor.com/docs/context/mcp`);

	console.log(`\n${GREEN}Antigravity IDE:${RESET}`);
	console.log(`   Configure via "Agent" > "Manage MCP Servers" panel.`);
	console.log(
		`   🔗 Google Cloud Blog: https://cloud.google.com/blog/products/data-analytics/connect-google-antigravity-ide-to-googles-data-cloud-services`
	);
}

function main() {
	setupVSCode();
	showOtherIDEsInfo();
}

main();
