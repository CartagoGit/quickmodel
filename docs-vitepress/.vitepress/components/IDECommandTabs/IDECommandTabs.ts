// ─────────────────────────────────────────────────────────────
// IDECommandTabs — doble eje de tabs: IDE × gestor de paquetes.
//
// Eje izquierdo: IDE (vscode / cursor / windsurf / claude / zed)
// Eje derecho:   PM  (npm  / yarn  / pnpm    / bun)
//
// Cada combinación produce el JSON correcto para ese IDE
// usando los comandos correctos para ese gestor.
// ─────────────────────────────────────────────────────────────

import { ref, computed } from 'vue';
import type { ITabItem } from '../TabBar/TabBar';

// ─── IDEs ─────────────────────────────────────────────────────

const IDE_ORDER = ['vscode', 'cursor', 'windsurf', 'claude', 'zed'] as const;
type IIDEKey = (typeof IDE_ORDER)[number];

const PM_ORDER = ['npm', 'yarn', 'pnpm', 'bun'] as const;
type IPMKey = (typeof PM_ORDER)[number];

export type IScenario = 'a' | 'b1' | 'b2' | 'c';

export const IDE_ITEMS: ITabItem[] = [
	{ key: 'vscode', icon: '💙', label: 'VS Code' },
	{ key: 'cursor', icon: '🎯', label: 'Cursor' },
	{ key: 'windsurf', icon: '🌊', label: 'Windsurf' },
	{ key: 'claude', icon: '✨', label: 'Claude Desktop' },
	{ key: 'zed', icon: '⚡', label: 'Zed' },
];

export const PM_ITEMS: ITabItem[] = [
	{ key: 'npm', icon: '📦', label: 'npm' },
	{ key: 'yarn', icon: '🧶', label: 'yarn' },
	{ key: 'pnpm', icon: '🏃', label: 'pnpm' },
	{ key: 'bun', icon: '🐰', label: 'bun' },
];

// ─── Rutas de configuración por IDE ───────────────────────────

const CONFIG_PATHS: Record<IIDEKey, string> = {
	vscode: '.vscode/mcp.json',
	cursor: '.cursor/mcp.json',
	windsurf: '~/.codeium/windsurf/mcp_config.json',
	claude: '~/Library/Application Support/Claude/claude_desktop_config.json',
	zed: '~/.config/zed/settings.json',
};

const CONFIG_SCOPE_NOTES: Partial<Record<IIDEKey, string>> = {
	windsurf: 'Global config — applies to all projects.',
	claude: 'macOS: ~/Library/Application Support/Claude/claude_desktop_config.json  •  Windows: %APPDATA%\\Claude\\claude_desktop_config.json',
	zed: 'Project: .zed/settings.json  •  Global: ~/.config/zed/settings.json',
};

// ─── Comandos por escenario × PM ──────────────────────────────

type ICommandDef = { command: string; args: string[] };

function getCommand(scenario: IScenario, pmKey: IPMKey): ICommandDef {
	switch (scenario) {
		case 'a':
			return {
				npm: { command: 'npx', args: ['quickmodel', 'mcp'] },
				yarn: { command: 'yarn', args: ['quickmodel', 'mcp'] },
				pnpm: { command: 'pnpm', args: ['exec', 'quickmodel', 'mcp'] },
				bun: { command: 'bunx', args: ['quickmodel', 'mcp'] },
			}[pmKey];
		case 'b1':
			return {
				npm: { command: 'node_modules/.bin/quickmodel', args: ['mcp'] },
				yarn: {
					command: 'node_modules/.bin/quickmodel',
					args: ['mcp'],
				},
				pnpm: {
					command: 'node_modules/.bin/quickmodel',
					args: ['mcp'],
				},
				bun: {
					command: 'bun',
					args: ['node_modules/.bin/quickmodel', 'mcp'],
				},
			}[pmKey];
		case 'b2':
			return {
				npm: { command: 'npm', args: ['run', 'mcp'] },
				yarn: { command: 'yarn', args: ['mcp'] },
				pnpm: { command: 'pnpm', args: ['run', 'mcp'] },
				bun: { command: 'bun', args: ['run', 'mcp'] },
			}[pmKey];
		case 'c':
		default:
			return {
				npm: { command: 'npx', args: ['-y', 'quickmodel', 'mcp'] },
				yarn: { command: 'yarn', args: ['dlx', 'quickmodel', 'mcp'] },
				pnpm: { command: 'pnpm', args: ['dlx', 'quickmodel', 'mcp'] },
				bun: { command: 'bunx', args: ['quickmodel', 'mcp'] },
			}[pmKey];
	}
}

// ─── JSON por IDE × comando ────────────────────────────────────

function buildJson(ide: IIDEKey, cmd: ICommandDef): string {
	const { command, args } = cmd;
	const argsStr = args.map((arg) => `"${arg}"`).join(', ');

	if (ide === 'vscode') {
		return `{
  "servers": {
    "quickmodel": {
      "command": "${command}",
      "args": [${argsStr}]
    }
  }
}`;
	}

	if (ide === 'zed') {
		return `{
  "context_servers": {
    "quickmodel": {
      "command": "${command}",
      "args": [${argsStr}]
    }
  }
}`;
	}

	// cursor / windsurf / claude → mcpServers
	return `{
  "mcpServers": {
    "quickmodel": {
      "command": "${command}",
      "args": [${argsStr}]
    }
  }
}`;
}

// ─── Composable ───────────────────────────────────────────────

/**
 * Manages the IDE and PM tab state for IDECommandTabs.
 * Returns everything needed to render the two-axis tab UI.
 */
export function useIDECommandTabs(scenario: IScenario) {
	const activeIDE = ref<IIDEKey>('vscode');
	const activePM = ref<IPMKey>('npm');

	const prevIDEIndex = ref(0);
	const prevPMIndex = ref(0);

	const ideDirection = computed(() => {
		const cur = IDE_ORDER.indexOf(activeIDE.value);
		return cur >= prevIDEIndex.value ? 'forward' : 'backward';
	});

	const pmDirection = computed(() => {
		const cur = PM_ORDER.indexOf(activePM.value);
		return cur >= prevPMIndex.value ? 'forward' : 'backward';
	});

	function setIDE(key: IIDEKey): void {
		prevIDEIndex.value = IDE_ORDER.indexOf(activeIDE.value);
		activeIDE.value = key;
	}

	function setPM(key: IPMKey): void {
		prevPMIndex.value = PM_ORDER.indexOf(activePM.value);
		activePM.value = key;
	}

	const configPath = computed(() => CONFIG_PATHS[activeIDE.value]);
	const scopeNote = computed(
		() => CONFIG_SCOPE_NOTES[activeIDE.value] ?? null
	);

	const configJson = computed(() => {
		const cmd = getCommand(scenario, activePM.value);
		return buildJson(activeIDE.value, cmd);
	});

	return {
		activeIDE,
		activePM,
		ideDirection,
		pmDirection,
		setIDE,
		setPM,
		configPath,
		scopeNote,
		configJson,
	};
}
