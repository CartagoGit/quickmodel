# Tracing & Observability

QuickModel ships with a **built-in structured trace system** that can observe every lifecycle event — construction, serialization, deserialization, field transformations, rule evaluations, integrity checks, and config changes — without patching any code.

Tracing is **fully opt-in and zero-overhead** by default. Nothing is emitted until you configure a verbosity level.

## What is tracing for?

The system serves two purposes:

**1. Diagnosis (primary)** — When your model is not behaving as expected you should not have to guess.
Set `verbosity: 'verbose'` temporarily and QuickModel will print every internal step it takes: which transformer ran, which field was stripped, which rule passed or failed, and what the raw vs. transformed value was. Once you've found the issue, set it back to `'silent'`.

**2. Production observability (secondary)** — Route rule failures, integrity events, or lifecycle milestones
to your own structured logging system (Winston, Pino, Datadog…) via the `sink` option.

## Verbosity levels

| Level       | What is emitted                                            |
| ----------- | ---------------------------------------------------------- |
| `'silent'`  | Nothing (default)                                          |
| `'error'`   | Hard failures: rule errors, thrown exceptions              |
| `'warn'`    | Recoverable anomalies + errors                             |
| `'success'` | Successful rule evaluations (`rule-pass`)                  |
| `'info'`    | Lifecycle milestones: construction, serialize, deserialize |
| `'debug'`   | Field-level transformation steps                           |
| `'verbose'` | Everything, including raw input/output values per field    |

Levels are **cumulative**: `'info'` includes `'error'` and `'warn'`.

## Lifecycle events

| Event           | When it fires                            | Min level |
| --------------- | ---------------------------------------- | --------- |
| `construction`  | `new MyModel(data)` completes            | `info`    |
| `serialize`     | `model.serialize()` called               | `info`    |
| `deserialize`   | Each field hydrated from raw data        | `debug`   |
| `rule-pass`     | A `@QRule` predicate returned `true`     | `success` |
| `rule-fail`     | A `@QRule` predicate returned `false`    | `warn`    |
| `rule-error`    | A `@QRule` predicate threw an exception  | `error`   |
| `rule-timeout`  | An async `@QRule` exceeded `timeoutMs`   | `warn`    |
| `integrity`     | `checkIntegrity()` result per field      | `debug`   |
| `transformer`   | Which transformer was applied to a field | `debug`   |
| `config-change` | `QConfig.configure()` called             | `info`    |

## Global configuration (`QConfig`)

All trace settings live inside `defaults.trace`:

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

### Console output format & colors

By default, each trace line printed to the console follows this format:

```
[QM][INFO][UserModel][construction] Instance created (3 fields)
[QM][WARN][UserModel:amount][rule-fail] rule="Amount must be positive"
[QM][ERROR][UserModel:email][rule-error] rule="Must be a valid email"
[QM][DEBUG][UserModel:createdAt][transformer] DateTransformer applied
```

The prefix `[QM]` is configurable via `prefix` (see below). Colors are applied automatically in interactive terminals and disabled in CI environments (pipes, log files). The palette follows the conventional terminal standard:

| Level     | Color      |
| --------- | ---------- |
| `error`   | Red        |
| `warn`    | Yellow     |
| `success` | Green      |
| `info`    | Light blue |
| `debug`   | Purple     |
| `verbose` | Gray       |

**Force or disable colors:**

```typescript
QConfig.configure({
	defaults: { trace: { verbosity: 'info', colors: false } },
}); // always plain
QConfig.configure({ defaults: { trace: { verbosity: 'info', colors: true } } }); // always colored
```

### Choosing which parts to colorize

By default only the `[LEVEL]` segment is colored. Use `colorize` to change this:

```
[QM] [WARN] [UserModel:amount] [rule-fail]
  ^     ^          ^               ^
pre   level      model           event
```

| `colorize` value                        | Effect                                      |
| --------------------------------------- | ------------------------------------------- |
| `'level'` _(default)_                   | Only `[WARN]`/`[INFO]` is colored           |
| `'line'`                                | Entire prefix in one color block            |
| `['level', 'event']`                    | `[LEVEL]` and `[event]` colored, rest plain |
| `['prefix', 'level', 'model', 'event']` | Each segment wrapped individually           |

```typescript
// Only level + event
QConfig.configure({
	defaults: { trace: { verbosity: 'info', colorize: ['level', 'event'] } },
});

// Entire prefix
QConfig.configure({
	defaults: { trace: { verbosity: 'info', colorize: 'line' } },
});
```

### Custom prefix

Change the `[QM]` tag shown in every console line:

```typescript
QConfig.configure({
	defaults: {
		trace: { verbosity: 'info', prefix: 'MyApp' },
	},
});
// → [MyApp][INFO][UserModel][construction] Instance created (3 fields)
```

### Filtering events

Use `events` to limit which lifecycle events are emitted:

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

### Integrating an external logger

When you want QuickModel's traces to go through **your own logging system** (Winston, Pino, Datadog, etc.) instead of `console`, provide a `sink`. When present, the console is **never called** — every entry goes exclusively to your function:

::: warning sink replaces `console`, it does not add to it
`sink` is an **either/or** choice, not both at once. As soon as a `sink` is configured, QuickModel stops writing to `console` entirely.
This is by design: in production you typically don't want the same trace going to both your structured logging backend and raw `console` output.

| Configuration                    | Output             |
| -------------------------------- | ------------------ |
| No `sink`, `verbosity: 'info'`   | `console` only     |
| With `sink`, `verbosity: 'info'` | Your function only |
| No `sink`, no `verbosity`        | Nothing (silent)   |

If you need **both** — your logger and `console` — call them both inside the sink:

```typescript
QConfig.configure({
	defaults: {
		trace: {
			verbosity: 'warn',
			sink: (entry) => {
				// your structured logger
				myLogger.warn(entry.message, entry);
				// AND console (manually)
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
				myLogger.log(entry.level, entry.message, entry);
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
Because `sink` receives the full [`IQTraceEntry`](#iqtraceentry-reference) object, you can forward only specific fields, add correlation IDs, or filter further before sending to your backend.
:::

## Per-model configuration (`@Quick`)

Override the global trace settings for a single model by passing an `IQAdvancedOptions` object as the second argument to `@Quick`:

```typescript
import { Quick, QModel } from 'quickmodel';

@Quick(
	{ name: 'string', email: 'string' },
	{
		trace: {
			verbosity: 'verbose',
			events: ['rule-fail', 'construction'],
			sink: (entry) => auditLog.write(entry),
		},
	}
)
class UserModel extends QModel<{ name: string; email: string }> {
	declare name: string;
	declare email: string;
}
```

**Resolution order** (highest priority wins):

1. Per-model `@Quick({}, { trace: … })`
2. Global `QConfig.configure({ defaults: { trace: … } })`
3. Legacy `enableDebugLogs: true` (maps to `verbosity: 'debug'`)
4. Default: `'silent'`

## Per-rule configuration (`@QRule` options)

Add a third argument to `@QRule` to control trace behavior for **that specific rule** independently of everything else:

```typescript
import { QRule } from 'quickmodel';
import type { IQRuleOptions } from 'quickmodel/types';

class PaymentModel extends QModel<{ amount: number; currency: string }> {
	// Always trace failures for this rule, even if global is 'silent'
	@QRule<number>((val) => val > 0, 'Amount must be positive', {
		trace: { verbosity: 'warn' },
	})
	declare amount: number;

	// Route this rule to a security audit sink
	@QRule<string>((val) => /^[A-Z]{3}$/.test(val), 'Invalid currency code', {
		trace: {
			verbosity: 'error',
			sink: (entry) => securityAudit.write(entry),
		},
	})
	declare currency: string;
}
```

**Per-rule resolution order** (highest priority wins):

1. **Per-rule** `@QRule(predicate, message, { trace: … })` ← highest
2. Per-model `@Quick({}, { trace: … })`
3. Global `QConfig.configure({ defaults: { trace: … } })`
4. Default: `'silent'`

::: tip Silence a single noisy rule
Set `verbosity: 'silent'` on a specific rule to suppress it even when global verbosity is `'verbose'`:

```typescript
@QRule((val) => val > 0, 'Must be positive', { trace: { verbosity: 'silent' } })
declare qty: number;
```

:::

## `IQTraceEntry` reference

Every trace record emitted by the system has this shape:

```typescript
interface IQTraceEntry {
	timestamp: number; // UTC ms since epoch
	level: IQTraceVerbosity; // 'error' | 'warn' | 'success' | 'info' | 'debug' | 'verbose'
	event: IQTraceEvent; // one of the lifecycle events above
	model: string; // class name, e.g. 'UserModel'
	field?: string; // property name for field-scoped events
	message: string; // human-readable description
	inputValue?: unknown; // raw input value (verbose only)
	outputValue?: unknown; // transformed output value (verbose only)
	transformer?: string; // name of the transformer applied
	ruleMessage?: string; // @QRule message on rule events
	meta?: Record<string, unknown>; // extra metadata (e.g. error string)
}
```

## Use cases

### Debugging a transformation pipeline

```typescript
QConfig.configure({
	defaults: {
		trace: {
			verbosity: 'verbose',
			events: ['deserialize', 'transformer'],
		},
	},
});

// Every field hydration and transformer call will appear in console
const model = new OrderModel(rawApiData);
```

### Capturing rule failures in tests

```typescript
import type { IQTraceEntry } from 'quickmodel/types';

const entries: IQTraceEntry[] = [];

QConfig.configure({
	defaults: {
		trace: {
			verbosity: 'warn',
			events: ['rule-fail', 'rule-error'],
			sink: (entry) => entries.push(entry),
		},
	},
});

const model = new UserModel({ email: 'notvalid' });
model.$qm.checkRules();

expect(entries).toHaveLength(1);
expect(entries[0].ruleMessage).toBe('Must be a valid email');
```

### Routing critical rules to a security log

```typescript
class AuthModel extends QModel<{ token: string }> {
	@QRule<string>(
		(val) => val.startsWith('Bearer ') && val.length > 10,
		'Invalid token format',
		{
			trace: {
				verbosity: 'warn',
				sink: (entry) => securityLogger.warn('[AUTH]', entry),
			},
		}
	)
	declare token: string;
}
```

## Disabling trace at runtime

Reset to silent by calling `QConfig.reset()` or reconfiguring without a `trace` block:

```typescript
QConfig.reset(); // full reset — trace goes silent
// or
QConfig.configure({ defaults: {} }); // trace omitted → silent
```
