import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const projectRoot = resolve(process.cwd());
const vscodeDir = join(projectRoot, '.vscode');
const mcpFile = join(vscodeDir, 'mcp.json');

// Relative path configuration for VS Code
const mcpConfig = {
	servers: {
		quickmodel: {
			command: 'bun',
			args: ['run', resolve(projectRoot, 'src/mcp/server.ts')],
		},
	},
};

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function setupVSCode() {
	if (existsSync(vscodeDir)) {
		console.log(`${YELLOW}Detected VS Code configuration...${RESET}`);

		let currentConfig: any = { servers: {} };
		if (existsSync(mcpFile)) {
			try {
				const content = readFileSync(mcpFile, 'utf-8');
				currentConfig = JSON.parse(content);
			} catch (_err) {
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
		console.log(`${GREEN}✅ VS Code: Updated .vscode/mcp.json${RESET}`);
	}
}

function showIDEInstructions() {
	const serverPath = resolve(projectRoot, 'src/mcp/server.ts');

	console.log(
		`\n${BLUE}ℹ️  MCP Server Setup Instructions for Developers${RESET}`
	);
	console.log(
		`${YELLOW}This setup is for INTERNAL development of QuickModel.${RESET}\n`
	);

	console.log(`${GREEN}► Cursor IDE:${RESET}`);
	console.log(`   1. Go to "Settings" > "Features" > "MCP"`);
	console.log(`   2. Click "+ Add New MCP Server"`);
	console.log(`   3. Name: ${BLUE}quickmodel-dev${RESET}`);
	console.log(`   4. Type: ${BLUE}command${RESET}`);
	console.log(`   5. Command: ${BLUE}bun run ${serverPath}${RESET}\n`);

	console.log(`${GREEN}► Windsurf (Codeium):${RESET}`);
	console.log(`   1. Open "Cascade" (Chat panel)`);
	console.log(`   2. Click the specific MCP icon or settings`);
	console.log(`   3. Configure command similar to Cursor:`);
	console.log(`      ${BLUE}bun run ${serverPath}${RESET}`);
	console.log(`   (Windsurf may also respect .vscode/mcp.json if present)\n`);

	console.log(`${GREEN}► Google Antigravity:${RESET}`);
	console.log(`   1. Open "Agent" panel`);
	console.log(`   2. Select "Manage MCP Servers"`);
	console.log(`   3. Add custom server:`);
	console.log(`      Command: ${BLUE}bun run ${serverPath}${RESET}\n`);

	console.log(`${YELLOW}► Other IDEs:${RESET}`);
	console.log(
		`   Please consult your IDE documentation on how to add a local MCP server.`
	);
	console.log(`   Entry point: ${serverPath}`);
}

function main() {
	setupVSCode();
	showIDEInstructions();
}

main();
