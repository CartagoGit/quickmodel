import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const projectRoot = resolve(process.cwd());
const vscodeDir = join(projectRoot, '.vscode');
const settingsFile = join(vscodeDir, 'settings.json');
const bunPath = process.argv[0]; 
const serverScript = join(projectRoot, 'src', 'mcp', 'server.ts');

const mcpConfig = {
    mcpServers: {
        "quickmodel": {
            "command": "bun",
            "args": ["run", serverScript]
        }
    }
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

    let settings: any = {};
    if (existsSync(settingsFile)) {
        try {
            const content = readFileSync(settingsFile, 'utf-8');
            settings = JSON.parse(content);
        } catch (e) {
            console.warn(`${YELLOW}Warning: Could not parse existing settings.json. Starting fresh.${RESET}`);
        }
    }

    // Merge config
    // VS Code Copilot Chat uses "github.copilot.chat.mcpServers"
    settings['github.copilot.chat.mcpServers'] = {
        ...settings['github.copilot.chat.mcpServers'],
        ...mcpConfig.mcpServers
    };

    writeFileSync(settingsFile, JSON.stringify(settings, null, 4));
    console.log(`${GREEN}✅ Successfully updated .vscode/settings.json with MCP configuration.${RESET}`);
    console.log(`   Server Path: ${serverScript}`);
}

function main() {
    const isVSCode = existsSync(vscodeDir);
    // Add other IDE checks here if needed (e.g. Cursor, Windsurf if they have known project files)
    
    // We can also check for specific env vars, but file presence is safer for project-setup scripts
    
    if (isVSCode) {
        setupVSCode();
    } else {
        console.error(`${RED}❌ Error: No compatible IDE configuration found to auto-update.${RESET}`);
        console.error(`${YELLOW}We could not detect a .vscode folder or known IDE configuration.${RESET}`);
        console.error(`\nPlease consult your IDE documentation to configure the MCP server manually.`);
        console.error(`Server entry point: ${serverScript}`);
        console.error(`\nExamples:`);
        console.error(` - VS Code / Copilot: Add to .vscode/settings.json under "github.copilot.chat.mcpServers"`);
        console.error(` - Claude Desktop: Add to your global claude_desktop_config.json`);
        process.exit(1);
    }
}

main();
