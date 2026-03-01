# Installation & Setup

Choose your scenario:

- **[Scenario A](#scenario-a-quickmodel-installed-locally-internet-available)** — `quickmodel` is in your `package.json` and you have internet access.
- **[Scenario B](#scenario-b-quickmodel-installed-locally-no-internet)** — `quickmodel` is in your `package.json` but you have **no internet access**.
- **[Scenario C](#scenario-c-quickmodel-not-installed-in-your-project)** — `quickmodel` is not a dependency of your project.

---

## Scenario A — quickmodel installed locally, internet available

`npx`, `bunx`, `pnpm exec` and `yarn dlx` all check `node_modules/.bin/` first before downloading anything. If `quickmodel` is installed, your local version is used automatically.

### Visual Studio Code

::: info
Requires the **GitHub Copilot Chat** extension.
:::

Create `.vscode/mcp.json` in your project root:

<CommandTabs>
<template #npm>

```json
{
	"servers": {
		"quickmodel": {
			"command": "npx",
			"args": ["quickmodel", "mcp"]
		}
	}
}
```

</template>
<template #bun>

```json
{
	"servers": {
		"quickmodel": {
			"command": "bunx",
			"args": ["quickmodel", "mcp"]
		}
	}
}
```

</template>
<template #pnpm>

```json
{
	"servers": {
		"quickmodel": {
			"command": "pnpm",
			"args": ["exec", "quickmodel", "mcp"]
		}
	}
}
```

</template>
<template #yarn>

```json
{
	"servers": {
		"quickmodel": {
			"command": "yarn",
			"args": ["quickmodel", "mcp"]
		}
	}
}
```

</template>
</CommandTabs>

### Cursor / Windsurf / Google Antigravity

| Package manager | Command                    |
| --------------- | -------------------------- |
| npm             | `npx quickmodel mcp`       |
| bun             | `bunx quickmodel mcp`      |
| pnpm            | `pnpm exec quickmodel mcp` |
| yarn            | `yarn quickmodel mcp`      |

---

## Scenario B — quickmodel installed locally, no internet

Two options — use whichever fits your workflow.

### Option 1 — point directly to the local binary

The binary is always available at `node_modules/.bin/quickmodel` regardless of internet access.

<CommandTabs>
<template #npm>

```json
{
	"servers": {
		"quickmodel": {
			"command": "node_modules/.bin/quickmodel",
			"args": ["mcp"]
		}
	}
}
```

</template>
<template #bun>

```json
{
	"servers": {
		"quickmodel": {
			"command": "bun",
			"args": ["run", "quickmodel", "mcp"]
		}
	}
}
```

</template>
<template #pnpm>

```json
{
	"servers": {
		"quickmodel": {
			"command": "node_modules/.bin/quickmodel",
			"args": ["mcp"]
		}
	}
}
```

</template>
<template #yarn>

```json
{
	"servers": {
		"quickmodel": {
			"command": "node_modules/.bin/quickmodel",
			"args": ["mcp"]
		}
	}
}
```

</template>
</CommandTabs>

### Option 2 — add a script to your `package.json`

Add this to your `package.json` `scripts` section:

```json
{
	"scripts": {
		"mcp": "quickmodel mcp"
	}
}
```

Then configure the IDE to run that script:

<CommandTabs>
<template #npm>

```json
{
	"servers": {
		"quickmodel": {
			"command": "npm",
			"args": ["run", "mcp"]
		}
	}
}
```

</template>
<template #bun>

```json
{
	"servers": {
		"quickmodel": {
			"command": "bun",
			"args": ["run", "mcp"]
		}
	}
}
```

</template>
<template #pnpm>

```json
{
	"servers": {
		"quickmodel": {
			"command": "pnpm",
			"args": ["run", "mcp"]
		}
	}
}
```

</template>
<template #yarn>

```json
{
	"servers": {
		"quickmodel": {
			"command": "yarn",
			"args": ["mcp"]
		}
	}
}
```

</template>
</CommandTabs>

::: tip
Option 2 is also convenient for **CI environments** or **team projects** where everyone shares the same `package.json` — no need to configure the binary path manually on each machine.
:::

---

## Scenario C — quickmodel not installed in your project

The package is downloaded on demand without being added to your `node_modules`.

### Visual Studio Code

::: info
Requires the **GitHub Copilot Chat** extension.
:::

Create `.vscode/mcp.json` in your project root:

<CommandTabs>
<template #npm>

```json
{
	"servers": {
		"quickmodel": {
			"command": "npx",
			"args": ["-y", "quickmodel", "mcp"]
		}
	}
}
```

</template>
<template #bun>

```json
{
	"servers": {
		"quickmodel": {
			"command": "bunx",
			"args": ["quickmodel", "mcp"]
		}
	}
}
```

</template>
<template #pnpm>

```json
{
	"servers": {
		"quickmodel": {
			"command": "pnpm",
			"args": ["dlx", "quickmodel", "mcp"]
		}
	}
}
```

</template>
<template #yarn>

```json
{
	"servers": {
		"quickmodel": {
			"command": "yarn",
			"args": ["dlx", "quickmodel", "mcp"]
		}
	}
}
```

</template>
</CommandTabs>

### Cursor / Windsurf / Google Antigravity

| Package manager | Command                   |
| --------------- | ------------------------- |
| npm             | `npx -y quickmodel mcp`   |
| bun             | `bunx quickmodel mcp`     |
| pnpm            | `pnpm dlx quickmodel mcp` |
| yarn            | `yarn dlx quickmodel mcp` |
