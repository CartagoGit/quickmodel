# Configuración por clase (`QModel.configure`)

La configuración global de QuickModel (`QConfig.configure()`) se aplica a todos los modelos. El método estático `QModel.configure()` permite **sobrescribir opciones específicas para una única clase** sin afectar a las clases hermanas ni a la configuración global.

## Uso básico

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

La propiedad `static override readonly config` es el punto de enganche que QuickModel lee en tiempo de construcción. La factoría `QModel.configure()` valida los tipos — acepta las mismas opciones que `IQAdvancedOptions`.

## Orden de prioridad

Cuando una opción está configurada en varios niveles, gana la más específica:

```
Segundo argumento de @Quick()       (mayor prioridad — por call-site)
    ↓
static config = QModel.configure()  (por clase)
    ↓
QConfig.configure() defaults        (global)
    ↓
Defaults integrados                 (menor prioridad)
```

## Opciones disponibles

Todas las opciones de `IQAdvancedOptions` están disponibles. Las más habituales:

### `unknownPropertyPolicy`

Controla qué ocurre con las propiedades del payload no declaradas en el modelo:

```typescript
@Quick()
class FlexibleDto extends QModel<IFlexibleDto> {
	static override readonly config = QModel.configure({
		unknownPropertyPolicy: 'keep', // preserva campos extra
	});
}

@Quick()
class StrictDto extends QModel<IStrictDto> {
	static override readonly config = QModel.configure({
		unknownPropertyPolicy: 'error', // lanza error en campos desconocidos
	});
}
```

| Valor     | Comportamiento                                                    |
| --------- | ----------------------------------------------------------------- |
| `'strip'` | Elimina silenciosamente propiedades desconocidas (default global) |
| `'keep'`  | Preserva propiedades desconocidas tal cual                        |
| `'error'` | Lanza error cuando se encuentra una propiedad desconocida         |

### `coercionStrategy`

```typescript
static override readonly config = QModel.configure({
  coercionStrategy: 'loose',  // permite string "123" → número 123
});
```

### `nullToUndefined`

```typescript
static override readonly config = QModel.configure({
  nullToUndefined: true,  // null → undefined durante la población
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

Sobrescribir cómo se serializan los campos `Date` solo para este modelo:

```typescript
@Quick({ createdAt: Date })
class TimestampModel extends QModel<ITimestampModel> {
	static override readonly config = QModel.configure({
		dateStrategy: 'timestamp', // serializar como ms numérico, no como string ISO
	});

	declare createdAt: Date;
}
```

### `exposeUnsetFields`

Incluir campos `undefined` y `null` en la salida de `serialize()`:

```typescript
static override readonly config = QModel.configure({
  exposeUnsetFields: true,
});
```

### `validationTrigger`

Ejecutar `checkRules()` automáticamente en la construcción:

```typescript
static override readonly config = QModel.configure({
  validationTrigger: 'construction',
});
```

### `transformCase`

Transformar nombres de campos entre snake_case y camelCase:

```typescript
static override readonly config = QModel.configure({
  transformCase: {
    in:  'snake_case',   // entrante: snake_case → camelCase
    out: 'snake_case',   // saliente: camelCase → snake_case
  },
});
```

## Ejemplo del mundo real

### Serialización diferente por modelo

```typescript
// Modelo API: serializar fechas como strings ISO (default global)
@Quick({ createdAt: Date })
class ApiResponse extends QModel<IApiResponse> {
	declare createdAt: Date;
}

// Modelo interno: serializar fechas como timestamps para rendimiento
@Quick({ createdAt: Date })
class CacheEntry extends QModel<ICacheEntry> {
	static override readonly config = QModel.configure({
		dateStrategy: 'timestamp',
	});
	declare createdAt: Date;
}
```

### DTO flexible que preserva campos extra

```typescript
@Quick()
class EventPayload extends QModel<IEventPayload> {
	static override readonly config = QModel.configure({
		unknownPropertyPolicy: 'keep',
		coercionStrategy: 'loose',
	});

	declare eventType: string;
	declare aggregateId: string;
	// Cualquier campo adicional específico del evento se preserva
}
```

## Combinación con el segundo argumento de `@Quick()`

Las opciones pasadas como segundo argumento a `@Quick()` tienen prioridad sobre `static config`:

```typescript
@Quick({}, { unknownPropertyPolicy: 'error' }) // gana sobre config inferior
class StrictModel extends QModel<IStrictModel> {
	static override readonly config = QModel.configure({
		unknownPropertyPolicy: 'keep', // sobrescrito por el argumento de @Quick()
	});
}
```

## Referencia de API

| Símbolo                  | Descripción                                                                   |
| ------------------------ | ----------------------------------------------------------------------------- |
| `QModel.configure(opts)` | Devuelve los mismos `opts` (validación de tipos, se usa como `static config`) |
| `static readonly config` | Propiedad de override por clase leída por el servicio de población            |
| `IQClassConfig`          | Alias de tipo para las opciones aceptadas                                     |

## Ver también

- [QModel](./qmodel) — clase base
- [Primeros pasos](./getting-started) — configuración global `QConfig`
- [Trazado](./tracing) — configuración de trazado por clase
