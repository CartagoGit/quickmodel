# Instalación y Configuración

Elige tu escenario:

- **[Escenario A](#escenario-a-quickmodel-instalado-localmente-con-internet)** — `quickmodel` está en tu `package.json` y tienes acceso a internet.
- **[Escenario B](#escenario-b-quickmodel-instalado-localmente-sin-internet)** — `quickmodel` está en tu `package.json` pero **no tienes acceso a internet**.
- **[Escenario C](#escenario-c-quickmodel-no-instalado-en-tu-proyecto)** — `quickmodel` no es una dependencia de tu proyecto.

---

## Escenario A — quickmodel instalado localmente, con internet

`npx`, `bunx`, `pnpm exec` y `yarn dlx` comprueban primero `node_modules/.bin/` antes de descargar nada. Si `quickmodel` está instalado, se usa tu versión local automáticamente.

### Visual Studio Code

::: info
Requiere la extensión **GitHub Copilot Chat**.
:::

Crea `.vscode/mcp.json` en la raíz de tu proyecto:

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

| Gestor de paquetes | Comando                    |
| ------------------ | -------------------------- |
| npm                | `npx quickmodel mcp`       |
| bun                | `bunx quickmodel mcp`      |
| pnpm               | `pnpm exec quickmodel mcp` |
| yarn               | `yarn quickmodel mcp`      |

---

## Escenario B — quickmodel instalado localmente, sin internet

Dos opciones — usa la que mejor encaje con tu flujo de trabajo.

### Opción 1 — apuntar directamente al binario local

El binario siempre está disponible en `node_modules/.bin/quickmodel` independientemente del acceso a internet.

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

### Opción 2 — añadir un script a tu `package.json`

Añade esto en la sección `scripts` de tu `package.json`:

```json
{
	"scripts": {
		"mcp": "quickmodel mcp"
	}
}
```

Luego configura el IDE para ejecutar ese script:

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
La opción 2 también es conveniente en **entornos CI** o **proyectos de equipo** donde todos comparten el mismo `package.json` — sin necesidad de configurar la ruta del binario manualmente en cada máquina.
:::

---

## Escenario C — quickmodel no instalado en tu proyecto

El paquete se descarga bajo demanda sin añadirse a tu `node_modules`.

### Visual Studio Code

::: info
Requiere la extensión **GitHub Copilot Chat**.
:::

Crea `.vscode/mcp.json` en la raíz de tu proyecto:

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

| Gestor de paquetes | Comando                   |
| ------------------ | ------------------------- |
| npm                | `npx -y quickmodel mcp`   |
| bun                | `bunx quickmodel mcp`     |
| pnpm               | `pnpm dlx quickmodel mcp` |
| yarn               | `yarn dlx quickmodel mcp` |
