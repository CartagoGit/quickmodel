import { join, resolve } from 'path';

const projectRoot = resolve(process.cwd());
const serverScript = join(projectRoot, 'src', 'mcp', 'server.ts');
const bunPath = process.argv[0]; // Path to bun executable

const config = {
	antigravity: {
		mcpServers: {
			quickmodel: {
				command: bunPath,
				args: [serverScript],
			},
		},
	},
	claude: {
		mcpServers: {
			quickmodel: {
				command: bunPath,
				args: [serverScript],
			},
		},
	},
	cursor: {
		mcpServers: {
			quickmodel: {
				command: bunPath,
				args: [serverScript],
			},
		},
	},
	vscode_launch: {
		version: '0.2.0',
		configurations: [
			{
				type: 'bun',
				request: 'launch',
				name: 'Debug MCP Server',
				program: '${workspaceFolder}/src/mcp/server.ts',
				cwd: '${workspaceFolder}',
				console: 'integratedTerminal',
				internalConsoleOptions: 'neverOpen',
				args: [],
			},
		],
	},
};

console.log('\n--- Antigravity (mcp_config.json) ---');
console.log(JSON.stringify(config.antigravity, null, 2));

console.log('\n--- Claude Desktop (claude_desktop_config.json) ---');
console.log(JSON.stringify(config.claude, null, 2));

console.log('\n--- Cursor (.cursor/mcp.json) ---');
console.log(JSON.stringify(config.cursor, null, 2));

console.log('\n--- VSCode Launch Config (.vscode/launch.json) ---');
console.log(JSON.stringify(config.vscode_launch, null, 2));

console.log('\nInstructions:');
console.log(
	'1. For Antigravity: Open Agent > "..." > Manage MCP Servers > View raw config, and paste the "quickmodel" key into "mcpServers".'
);
console.log(
	'2. For Claude/Cursor: Paste the JSON into the respective config files.'
);
console.log(
	'3. For VSCode Debugging: Create .vscode/launch.json with the provided content (if allowed).'
);
