# Per-Class Configuration (`QModel.configure`)

QuickModel's global settings (`QConfig.configure()`) apply to all models. The `QModel.configure()` static method lets you **override specific options for a single class** without affecting siblings or the global configuration.

## Basic usage

```typescript
import { Quick, QModel } from 'quickmodel';

interface IDto {
	id: string;
	[key: string]: unknown;
}

@Quick()
class InternalDto extends QModel<IDto> {
	static override readonly config = QModel.configure({
		unknownPropertyPolicy: 'keep',
	});

	declare id: string;
}
```

The `static override readonly config` property is the hook that QuickModel reads at construction time. The `QModel.configure()` factory validates typings — it accepts the same options as `IQAdvancedOptions`.

## Priority order

When an option is set at multiple levels, the most specific one wins:

```
@Quick() second argument       (highest priority — per call-site)
    ↓
static config = QModel.configure()   (per class)
    ↓
QConfig.configure() defaults         (global)
    ↓
Built-in defaults                    (lowest priority)
```

## Available options

All options from `IQAdvancedOptions` are available. The most commonly overridden ones:

### `unknownPropertyPolicy`

Controls what happens with payload properties not declared in the model:

```typescript
@Quick()
class FlexibleDto extends QModel<IFlexibleDto> {
	static override readonly config = QModel.configure({
		unknownPropertyPolicy: 'keep', // preserves extra fields
	});
}

@Quick()
class StrictDto extends QModel<IStrictDto> {
	static override readonly config = QModel.configure({
		unknownPropertyPolicy: 'error', // throws on unknown fields
	});
}
```

| Value     | Behavior                                             |
| --------- | ---------------------------------------------------- |
| `'strip'` | Silently removes unknown properties (global default) |
| `'keep'`  | Preserves unknown properties as-is                   |
| `'error'` | Throws error when unknown property is encountered    |

### `coercionStrategy`

```typescript
static override readonly config = QModel.configure({
  coercionStrategy: 'loose',  // allows string "123" → number 123
});
```

### `nullToUndefined`

```typescript
static override readonly config = QModel.configure({
  nullToUndefined: true,  // null → undefined during population
});
```

### `trimStrings` / `emptyStringAsNull`

```typescript
static override readonly config = QModel.configure({
  normalization: {
    trimStrings: true,
    emptyStringAsNull: true,
  },
});
```

### `dateStrategy`

Override how `Date` fields are serialized for this model only:

```typescript
@Quick({ createdAt: Date })
class TimestampModel extends QModel<ITimestampModel> {
	static override readonly config = QModel.configure({
		dateStrategy: 'timestamp', // serialize as numeric ms, not ISO string
	});

	declare createdAt: Date;
}
```

### `exposeUnsetFields`

Include `undefined` and `null` fields in `serialize()` output:

```typescript
static override readonly config = QModel.configure({
  exposeUnsetFields: true,
});
```

### `validationTrigger`

Run `checkRules()` automatically on construction:

```typescript
static override readonly config = QModel.configure({
  validationTrigger: 'construction',
});
```

### `transformCase`

Transform field names between snake_case and camelCase:

```typescript
static override readonly config = QModel.configure({
  transformCase: {
    in:  'snake_case',   // incoming: snake_case → camelCase
    out: 'snake_case',   // outgoing: camelCase → snake_case
  },
});
```

## Real-world example

### Different serialization per model

```typescript
// API model: serialize dates as ISO strings (global default)
@Quick({ createdAt: Date })
class ApiResponse extends QModel<IApiResponse> {
	declare createdAt: Date;
}

// Internal model: serialize dates as timestamps for performance
@Quick({ createdAt: Date })
class CacheEntry extends QModel<ICacheEntry> {
	static override readonly config = QModel.configure({
		dateStrategy: 'timestamp',
	});
	declare createdAt: Date;
}
```

### Flexible DTO that preserves extra fields

```typescript
@Quick()
class EventPayload extends QModel<IEventPayload> {
	static override readonly config = QModel.configure({
		unknownPropertyPolicy: 'keep',
		coercionStrategy: 'loose',
	});

	declare eventType: string;
	declare aggregateId: string;
	// Any additional event-specific fields are preserved
}
```

## Combining with `@Quick()` second argument

Options passed as the second argument to `@Quick()` take precedence over `static config`:

```typescript
@Quick({}, { unknownPropertyPolicy: 'error' }) // wins over config below
class StrictModel extends QModel<IStrictModel> {
	static override readonly config = QModel.configure({
		unknownPropertyPolicy: 'keep', // overridden by @Quick() arg
	});
}
```

## API reference

| Symbol                   | Description                                                         |
| ------------------------ | ------------------------------------------------------------------- |
| `QModel.configure(opts)` | Returns the same `opts` (typed validation, used as `static config`) |
| `static readonly config` | Per-class override property read by the population service          |
| `IQClassConfig`          | Type alias for the accepted options                                 |

## See also

- [QModel](./qmodel) — base class
- [Getting Started](./getting-started) — global `QConfig` configuration
- [Tracing](./tracing) — per-class trace configuration
