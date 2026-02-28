# Trazas y Observabilidad

QuickModel incluye un **sistema de trazas estructurado** que permite observar cualquier evento del ciclo de vida — construcción, serialización, deserialización, transformaciones de campo, evaluación de reglas, comprobaciones de integridad y cambios de configuración — sin modificar el código de producción.

Las trazas son **completamente opcionales y sin coste** por defecto. Nada se emite hasta que configures un nivel de verbosidad.

## Niveles de verbosidad

| Nivel       | Qué se emite                                                          |
| ----------- | --------------------------------------------------------------------- |
| `'silent'`  | Nada (por defecto)                                                    |
| `'error'`   | Fallos críticos: errores de regla, excepciones                        |
| `'warn'`    | Anomalías recuperables + errores                                      |
| `'info'`    | Hitos del ciclo de vida: construcción, serialización, deserialización |
| `'debug'`   | Pasos de transformación por campo                                     |
| `'verbose'` | Todo, incluyendo valores de entrada/salida por campo                  |

Los niveles son **acumulativos**: `'info'` incluye `'error'` y `'warn'`.

## Eventos del ciclo de vida

| Evento          | Cuándo se dispara                         | Nivel mínimo |
| --------------- | ----------------------------------------- | ------------ |
| `construction`  | `new MiModelo(data)` completa             | `info`       |
| `serialize`     | `model.serialize()` llamado               | `info`       |
| `deserialize`   | Cada campo hidratado desde datos raw      | `debug`      |
| `rule-pass`     | Un predicado `@QRule` devolvió `true`     | `verbose`    |
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

### Sink personalizado (logging estructurado / telemetría)

Por defecto las trazas van a `console`. Proporciona un `sink` para interceptarlas:

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

Cuando se proporciona un `sink`, **no se llama a `console`** — la entrada va exclusivamente a tu función.

### Prefijo personalizado

Cambia la etiqueta `[QuickModel:…]` que aparece en la salida de consola:

```typescript
QConfig.configure({
	defaults: {
		trace: {
			verbosity: 'info',
			prefix: 'MiApp',
		},
	},
});
// → [MiApp:UserModel][construction] Instance created (3 fields)
```

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
	level: IQTraceVerbosity; // 'error' | 'warn' | 'info' | 'debug' | 'verbose'
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
modelo.checkRules();

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
