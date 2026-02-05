# Política de Propiedades Desconocidas

QuickModel 1.0 proporciona tres estrategias para manejar propiedades desconocidas en los datos de entrada a través de la opción `unknownPropertyPolicy`.

::: info Comportamiento Predeterminado
Por defecto, QuickModel usa la política `'keep'`, adoptando una postura flexible que permite que las propiedades extra pasen sin errores.
:::

## ¿Qué es la Política de Propiedades Desconocidas?

Al deserializar datos, QuickModel puede encontrar propiedades que no están explícitamente definidas en tu modelo. La opción `unknownPropertyPolicy` controla cómo se manejan estas propiedades.

**Tres estrategias disponibles:**

- **`'keep'`** (predeterminado): Preserva las propiedades extra en la instancia
- **`'strip'`**: Elimina silenciosamente las propiedades extra (útil para sanitización)
- **`'error'`**: Lanza un error cuando se detectan propiedades desconocidas (más estricto)

Esto es útil para:
- Prevenir contaminación de datos (política: `'error'`)
- Sanitizar entrada no confiable (política: `'strip'`)
- Detectar errores tipográficos en respuestas del backend (política: `'error'`)
- Manejo flexible de datos (política: `'keep'`)

## Cómo Configurar

### Por Clase

Puedes establecer la política pasando `unknownPropertyPolicy` en el segundo argumento del decorador `@Quick`.

```typescript
import { QModel, Quick } from '@cartago-git/quickmodel';

interface IUser {
  name: string;
}

// ✅ Rechazar propiedades desconocidas (más estricto)
@Quick({}, { unknownPropertyPolicy: 'error' })
class StrictUser extends QModel<IUser> {
  declare name: string;
}

// ✅ Eliminar propiedades desconocidas (sanitización)
@Quick({}, { unknownPropertyPolicy: 'strip' })
class SanitizedUser extends QModel<IUser> {
  declare name: string;
}

// ✅ Mantener propiedades desconocidas (predeterminado - más flexible)
@Quick({}, { unknownPropertyPolicy: 'keep' })
class FlexibleUser extends QModel<IUser> {
  declare name: string;
}
```

### Globalmente (Recomendado para Seguridad)

Puedes aplicar una política global para toda tu aplicación usando `QConfig`. Este es el enfoque recomendado para aplicaciones críticas de seguridad.

```typescript
import { QConfig } from '@cartago-git/quickmodel';

// Llama a esto al inicio de tu aplicación (ej. index.ts o server.ts)
QConfig.configure({
  defaults: {
    unknownPropertyPolicy: 'error' // Rechazar propiedades desconocidas por defecto
  }
});
```

Cuando está configurado globalmente, aún puedes anular para clases legacy específicas:

```typescript
// Anular política global localmente para modelos legacy/flexibles
@Quick({}, { unknownPropertyPolicy: 'keep' })
class LegacyData extends QModel<any> {
  // ...
}
```

## Ejemplos de Uso

### Política: `'error'` (Más Estricto)

```typescript
@Quick({}, { unknownPropertyPolicy: 'error' })
class User extends QModel<IUser> {
  declare name: string;
}

// Uso correcto
User.create({ name: 'Alice' }); // ✅ OK

// Uso incorrecto - Lanza Error
User.create({ 
  name: 'Alice', 
  isAdmin: true // ❌ Error: Strict Mode: Property 'isAdmin' is not defined in model User
});
```

### Política: `'strip'` (Sanitización)

```typescript
@Quick({}, { unknownPropertyPolicy: 'strip' })
class User extends QModel<IUser> {
  declare name: string;
}

const user = User.create({ 
  name: 'Alice', 
  isAdmin: true // Será eliminado silenciosamente
});

console.log(user.name); // 'Alice'
console.log((user as any).isAdmin); // undefined (eliminado)
```

### Política: `'keep'` (Predeterminado - Flexible)

```typescript
@Quick({}, { unknownPropertyPolicy: 'keep' })
class User extends QModel<IUser> {
  declare name: string;
}

const user = User.create({ 
  name: 'Alice', 
  isAdmin: true // Será preservado
});

console.log(user.name); // 'Alice'
console.log((user as any).isAdmin); // true (mantenido)
```

## Requisitos de Propiedades para Política `'error'`

Para que una propiedad sea "aceptada" al usar `unknownPropertyPolicy: 'error'`, debe cumplir al menos una de estas condiciones:

1. **Estar en el mapa de transformaciones**:
   ```typescript
   @Quick({ createdAt: Date }) // 'createdAt' es conocida
   ```

2. **Estar decorada con `@QType`**:
   ```typescript
   @QType() declare name: string; // 'name' es conocida por metadata
   ```

3. **Existir físicamente en runtime (inicializada)**:
   ```typescript
   class User {
     role: string = 'guest'; // 'role' es conocida porque existe en la instancia
   }
   ```

::: warning Atención con `declare`
Si usas `declare property: type;` sin `@QType` ni `@Quick({...})`, esa propiedad **no existe** en tiempo de ejecución (JavaScript). Con `unknownPropertyPolicy: 'error'`, intentar asignar un valor fallará.

**Solución**: Registra la propiedad en `@Quick` (ej. `{ name: String }`) o usa `@QType()`.
:::

## Ejemplo Completo

```typescript
interface IProduct {
  id: number;
  tags: string[];
}

@Quick({
  tags: [String] // Registrada explícitamente
}, { 
  unknownPropertyPolicy: 'error' // 🛡️ Validación estricta
})
class Product extends QModel<IProduct> {
  declare id: number; // ⚠️ ADVERTENCIA: Si no está registrada, fallará
  declare tags: string[];
}

// ❌ Esto fallará porque 'id' es 'declare' y no está en @Quick
Product.create({ id: 1, tags: ['a'] }); 

// ✅ Solución Correcta:
@Quick({
  id: Number,     // Registrar primitivo
  tags: [String]
}, { unknownPropertyPolicy: 'error' })
class ProductFixed extends QModel<IProduct> {
  declare id: number; 
  declare tags: string[];
}
```

## Migración desde la opción `strict` deprecada

::: info Migrando desde versiones anteriores
Si estás actualizando desde una versión que usaba `strict: true/false`:

```typescript
// ANTIGUO (deprecado):
@Quick({}, { strict: true })
@Quick({}, { strict: false })

// NUEVO (actual):
@Quick({}, { unknownPropertyPolicy: 'error' })
@Quick({}, { unknownPropertyPolicy: 'keep' })
```
:::

## Consideraciones de Seguridad

Para aplicaciones críticas de seguridad (APIs, procesamiento de datos):

- ✅ **Usa `'error'`** para APIs públicas para prevenir ataques de asignación masiva
- ✅ **Usa `'strip'`** para sanitizar entrada no confiable antes de procesar
- ⚠️ **Usa `'keep'`** solo para fuentes de datos internas/confiables

Consulta [SECURITY.md](../../../SECURITY.md) para directrices completas de seguridad.
