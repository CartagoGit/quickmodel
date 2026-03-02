# Trazas y Observabilidad

QuickModel incluye un **sistema de trazas estructurado** que permite observar cualquier evento del ciclo de vida — construcción, serialización, deserialización, transformaciones de campo, evaluación de reglas, comprobaciones de integridad y cambios de configuración — sin modificar el código de producción.

Las trazas son **completamente opcionales y sin coste** por defecto. Nada se emite hasta que configures un nivel de verbosidad.

## ¿Para qué sirven las trazas?

El sistema tiene dos propósitos:

**1. Diagnóstico (principal)** — Cuando un modelo no se comporta como esperas, no deberías tener que adivinar qué ocurre.
Establece `verbosity: 'verbose'` temporalmente y QuickModel imprimirá cada paso interno: qué transformer ejecutó, qué campo eliminó, qué regla pasó o falló, y cuál era el valor bruto frente al transformado. Una vez encontrado el problema, vuelve a `'silent'`.

**2. Observabilidad en producción (secundario)** — Enruta fallos de regla, eventos de integridad o hitos del ciclo de vida hacia tu propio sistema de logging estructurado (Winston, Pino, Datadog…) mediante la opción `sink`.

## Niveles de verbosidad

| Nivel       | Qué se emite                                                          |
| ----------- | --------------------------------------------------------------------- |
| `'silent'`  | Nada (por defecto)                                                    |
| `'error'`   | Fallos críticos: errores de regla, excepciones                        |
| `'warn'`    | Anomalías recuperables + errores                                      |
| `'success'` | Evaluaciones de regla exitosas (`rule-pass`)                          |
| `'info'`    | Hitos del ciclo de vida: construcción, serialización, deserialización |
| `'debug'`   | Pasos de transformación por campo                                     |
| `'verbose'` | Todo, incluyendo valores de entrada/salida por campo                  |

Los niveles son **acumulativos**: `'info'` incluye `'error'` y `'warn'`.

## Eventos del ciclo de vida

| Evento          | Cuándo se dispara                         | Nivel mínimo |
| --------------- | ----------------------------------------- | ------------ |
| `construction`  | `new MiModelo(data)` completa             | `info`       |
| `serialize`     | `model.$qSerialize()` llamado             | `info`       |
| `deserialize`   | Cada campo hidratado desde datos raw      | `debug`      |
| `rule-pass`     | Un predicado `@QRule` devolvió `true`     | `success`    |
| `rule-fail`     | Un predicado `@QRule` devolvió `false`    | `warn`       |
| `rule-error`    | Un predicado `@QRule` lanzó una excepción | `error`      |
| `rule-timeout`  | Un `@QRule` async superó `timeoutMs`      | `warn`       |
| `integrity`     | Resultado de `checkIntegrity()` por campo | `debug`      |
| `transformer`   | Qué transformer se aplicó a un campo      | `debug`      |
| `config-change` | `QConfig.configure()` llamado             | `info`       |

## Configuración global (`QConfig`)

Toda la configuración de trazas vive dentro de `defaults.trace`:

```typescript
import { QConfig } from 'quickmodel';

QConfig.configure({
	defaults: {
		trace: {
			verbosity: 'info',
		},
	},
});
```

### Formato de consola y colores

Por defecto, cada línea del trace sigue este formato:

```
[QM][INFO][UserModel][construction] Instance created (3 fields)
[QM][WARN][UserModel:importe][rule-fail] rule="El importe debe ser positivo"
[QM][ERROR][UserModel:email][rule-error] rule="Debe ser un email válido"
[QM][DEBUG][UserModel:createdAt][transformer] DateTransformer applied
```

El prefijo `[QM]` es configurable mediante `prefix` (ver más abajo). Los colores se aplican automáticamente en terminales interactivas y se deshabilitan en entornos CI (pipes, ficheros de log). La paleta sigue el estándar convencional de terminales:

| Nivel     | Color      |
| --------- | ---------- |
| `error`   | Rojo       |
| `warn`    | Amarillo   |
| `success` | Verde      |
| `info`    | Azul claro |
| `debug`   | Morado     |
| `verbose` | Gris       |

**Forzar o deshabilitar colores:**

```typescript
QConfig.configure({
	defaults: { trace: { verbosity: 'info', colors: false } },
}); // siempre sin color
QConfig.configure({ defaults: { trace: { verbosity: 'info', colors: true } } }); // siempre con color
```

### Elegir qué partes colorizar

Por defecto solo el segmento `[LEVEL]` recibe color. Usa `colorize` para cambiar esto:

```
[QM] [WARN] [UserModel:importe] [rule-fail]
  ^     ^          ^                ^
pre   level      model            event
```

| Valor de `colorize`                     | Efecto                                     |
| --------------------------------------- | ------------------------------------------ |
| `'level'` _(por defecto)_               | Solo `[WARN]`/`[INFO]` tiene color         |
| `'line'`                                | Todo el prefijo en un bloque de color      |
| `['level', 'event']`                    | `[LEVEL]` y `[event]` con color, resto sin |
| `['prefix', 'level', 'model', 'event']` | Cada segmento envuelto individualmente     |

```typescript
// Solo level + event
QConfig.configure({
	defaults: { trace: { verbosity: 'info', colorize: ['level', 'event'] } },
});

// Prefijo completo
QConfig.configure({
	defaults: { trace: { verbosity: 'info', colorize: 'line' } },
});
```

### Prefijo personalizado

Cambia la etiqueta `[QM]` que aparece en cada línea de consola:

```typescript
QConfig.configure({
	defaults: {
		trace: { verbosity: 'info', prefix: 'MiApp' },
	},
});
// → [MiApp][INFO][UserModel][construction] Instance created (3 fields)
```

### Filtrar eventos

Usa `events` para limitar qué eventos del ciclo de vida se emiten:

```typescript
QConfig.configure({
	defaults: {
		trace: {
			verbosity: 'verbose',
			events: ['rule-fail', 'rule-error', 'rule-timeout'],
		},
	},
});
```

### Integrar un logger externo

Cuando quieras que las trazas de QuickModel pasen por **tu propio sistema de logging** (Winston, Pino, Datadog…) en lugar de `console`, proporciona un `sink`. Cuando está presente, **no se llama a `console`** — cada entrada va exclusivamente a tu función:

::: warning sink reemplaza a `console`, no lo complementa
`sink` es una elección **ó/ó**, no ambos a la vez. En cuanto se configura un `sink`, QuickModel deja de escribir en `console` por completo.
Esto es intencionado: en producción normalmente no quieres que la misma traza llegue tanto a tu backend de logging estructurado como a la salida cruda de `console`.

| Configuración                   | Salida          |
| ------------------------------- | --------------- |
| Sin `sink`, `verbosity: 'info'` | Solo `console`  |
| Con `sink`, `verbosity: 'info'` | Solo tu función |
| Sin `sink`, sin `verbosity`     | Nada (silent)   |

Si necesitas **ambos** — tu logger y `console` — llámalos dentro del sink:

```typescript
QConfig.configure({
	defaults: {
		trace: {
			verbosity: 'warn',
			sink: (entry) => {
				// tu logger estructurado
				miLogger.warn(entry.message, entry);
				// Y también console (manualmente)
				console.warn(
					`[QM][${entry.level.toUpperCase()}][${entry.model}] ${entry.message}`
				);
			},
		},
	},
});
```

:::

```typescript
import type { IQTraceEntry } from 'quickmodel/types';

QConfig.configure({
	defaults: {
		trace: {
			verbosity: 'warn',
			sink: (entry: IQTraceEntry) => {
				miLogger.log(entry.level, entry.message, entry);
			},
		},
	},
});
```

**Winston:**

```typescript
import { createLogger, transports } from 'winston';
const logger = createLogger({ transports: [new transports.Console()] });

QConfig.configure({
	defaults: {
		trace: {
			verbosity: 'warn',
			sink: (entry) =>
				logger[entry.level === 'verbose' ? 'debug' : entry.level](
					entry.message,
					entry
				),
		},
	},
});
```

**Pino:**

```typescript
import pino from 'pino';
const log = pino();

QConfig.configure({
	defaults: {
		trace: {
			verbosity: 'info',
			sink: (entry) =>
				log[entry.level === 'verbose' ? 'debug' : entry.level](
					entry,
					entry.message
				),
		},
	},
});
```

::: tip
Como `sink` recibe el objeto [`IQTraceEntry`](#referencia-iqtraceentry) completo, puedes reenviar solo los campos que te interesen, añadir IDs de correlación o filtrar antes de enviar a tu backend.
:::

## Configuración por modelo (`@Quick`)

Sobreescribe la configuración global solo para un modelo, pasando un objeto `IQAdvancedOptions` como segundo argumento de `@Quick`:

```typescript
import { Quick, QModel } from 'quickmodel';

@Quick(
	{ nombre: 'string', email: 'string' },
	{
		trace: {
			verbosity: 'verbose',
			events: ['rule-fail', 'construction'],
			sink: (entry) => auditoria.escribir(entry),
		},
	}
)
class UsuarioModel extends QModel<{ nombre: string; email: string }> {
	declare nombre: string;
	declare email: string;
}
```

**Orden de resolución** (mayor prioridad primero):

1. Por modelo `@Quick({}, { trace: … })`
2. Global `QConfig.configure({ defaults: { trace: … } })`
3. Legacy `enableDebugLogs: true` (equivale a `verbosity: 'debug'`)
4. Por defecto: `'silent'`

## Configuración por regla (opciones de `@QRule`)

Añade un tercer argumento a `@QRule` para controlar el comportamiento de traza de **esa regla específica** de forma independiente:

```typescript
import { QRule } from 'quickmodel';
import type { IQRuleOptions } from 'quickmodel/types';

class PagoModel extends QModel<{ importe: number; moneda: string }> {
	// Siempre traza fallos de esta regla, aunque el global sea 'silent'
	@QRule<number>((val) => val > 0, 'El importe debe ser positivo', {
		trace: { verbosity: 'warn' },
	})
	declare importe: number;

	// Enruta esta regla a un sink de auditoría de seguridad
	@QRule<string>(
		(val) => /^[A-Z]{3}$/.test(val),
		'Código de moneda inválido',
		{
			trace: {
				verbosity: 'error',
				sink: (entry) => auditoriaSeg.escribir(entry),
			},
		}
	)
	declare moneda: string;
}
```

**Orden de resolución por regla** (mayor prioridad primero):

1. **Por regla** `@QRule(predicate, message, { trace: … })` ← máxima prioridad
2. Por modelo `@Quick({}, { trace: … })`
3. Global `QConfig.configure({ defaults: { trace: … } })`
4. Por defecto: `'silent'`

::: tip Silenciar una regla ruidosa
Establece `verbosity: 'silent'` en una regla específica para suprimirla aunque la verbosidad global sea `'verbose'`:

```typescript
@QRule((val) => val > 0, 'Debe ser positivo', { trace: { verbosity: 'silent' } })
declare cantidad: number;
```

:::

## Referencia `IQTraceEntry`

Cada registro de traza emitido por el sistema tiene esta forma:

```typescript
interface IQTraceEntry {
	timestamp: number; // UTC ms desde epoch
	level: IQTraceVerbosity; // 'error' | 'warn' | 'success' | 'info' | 'debug' | 'verbose'
	event: IQTraceEvent; // uno de los eventos del ciclo de vida
	model: string; // nombre de la clase, ej. 'UsuarioModel'
	field?: string; // nombre de la propiedad (eventos de campo)
	message: string; // descripción legible
	inputValue?: unknown; // valor de entrada raw (solo verbose)
	outputValue?: unknown; // valor transformado (solo verbose)
	transformer?: string; // nombre del transformer aplicado
	ruleMessage?: string; // mensaje del @QRule en eventos de regla
	meta?: Record<string, unknown>; // metadatos adicionales (ej. string de error)
}
```

## Casos de uso

### Depurar una pipeline de transformación

```typescript
QConfig.configure({
	defaults: {
		trace: {
			verbosity: 'verbose',
			events: ['deserialize', 'transformer'],
		},
	},
});

// Cada hidratación de campo y llamada a transformer aparecerá en consola
const modelo = new OrderModel(rawApiData);
```

### Capturar fallos de regla en tests

```typescript
import type { IQTraceEntry } from 'quickmodel/types';

const entradas: IQTraceEntry[] = [];

QConfig.configure({
	defaults: {
		trace: {
			verbosity: 'warn',
			events: ['rule-fail', 'rule-error'],
			sink: (entry) => entradas.push(entry),
		},
	},
});

const modelo = new UsuarioModel({ email: 'no-valido' });
modelo.$qCheckRules();

expect(entradas).toHaveLength(1);
expect(entradas[0].ruleMessage).toBe('Debe ser un email válido');
```

### Enrutar reglas críticas a un log de seguridad

```typescript
class AuthModel extends QModel<{ token: string }> {
	@QRule<string>(
		(val) => val.startsWith('Bearer ') && val.length > 10,
		'Formato de token inválido',
		{
			trace: {
				verbosity: 'warn',
				sink: (entry) => loggerSeguridad.warn('[AUTH]', entry),
			},
		}
	)
	declare token: string;
}
```

## Desactivar las trazas en runtime

Resetea a silencioso con `QConfig.reset()` o reconfigurando sin bloque `trace`:

```typescript
QConfig.reset(); // reset completo — trazas en silencio
// o
QConfig.configure({ defaults: {} }); // trace omitido → silent
```
