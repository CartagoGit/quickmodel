# Modo Estricto (Strict Mode)

QuickModel 3.0 introduce un **Modo Estricto** opcional (`strict: true`) diseñado para aplicaciones que requieren una validación rigurosa de los datos de entrada, garantizando que **solo** las propiedades explícitamente definidas en el modelo sean aceptadas.

::: info Default Behavior
Por defecto, el Modo Estricto está **DESACTIVADO** (`false`). QuickModel adopta una postura flexible, permitiendo pasar propiedades adicionales sin errores.
:::

## ¿Qué es el Modo Estricto?

Cuando activas el Modo Estricto, QuickModel inspecciona cada propiedad del objeto de entrada (`data`) antes de asignarla a la instancia. Si encuentra una propiedad que **no** ha sido definida en tu modelo, lanzará un error `QModelError`.

Esto es útil para:
- Evitar "polución" de datos (inyectar campos no deseados).
- Detectar errores tipográficos en el backend o en interfaces.
- Garantizar que el objeto en memoria coincida exactamente con la definición de la clase.

## Cómo activarlo

### Por Clase

Puedes activar el modo estricto pasando `{ strict: true }` en el segundo argumento del decorador `@Quick`.

```typescript
import { QModel, Quick } from '@cartago-git/quickmodel';

interface IUser {
  name: string;
}

// ✅ Activar Strict Mode solo para esta clase
@Quick({}, { strict: true })
class User extends QModel<IUser> {
  declare name: string;
}
```

### Globalmente (Recomendado para Seguridad)

Puedes forzar el Modo Estricto por defecto para toda tu aplicación usando `QConfig`. Este es el enfoque recomendado para garantizar una arquitectura "segura por defecto".

```typescript
import { QConfig } from '@cartago-git/quickmodel';

// Llama a esto al inicio de tu aplicación (ej. index.ts o server.ts)
QConfig.configure({
  defaults: {
    strict: true
  }
});
```

Cuando está habilitado globalmente, aún puedes desactivarlo para clases legacy específicas:

```typescript
// Deshabilitar strict mode localmente para modelos legacy/flexibles
@Quick({}, { strict: false })
class LegacyData extends QModel<any> {
  // ...
}
```
class User extends QModel<IUser> {
  declare name: string;
}

// Uso correcto
User.create({ name: 'Alice' }); // OK

// Uso incorrecto - Lanza Error
User.create({ 
  name: 'Alice', 
  isAdmin: true // ❌ Error: Property 'isAdmin' is not defined in model User
});
```

## Requisitos para Propiedades

Para que una propiedad sea "aceptada" en Modo Estricto, debe cumplir al menos una de estas condiciones:

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
Si usas `declare property: type;` sin `@QType` ni `@Quick({...})`, esa propiedad **no existe** en tiempo de ejecución (JavaScript). En Modo Estricto, si intentas asignar valor a esa propiedad, QuickModel pensará que es una propiedad extra y lanzará un error.

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
  strict: true // 🛡️ Activado
})
class Product extends QModel<IProduct> {
  declare id: number; // ⚠️ CUIDADO: Si no se registra, fallará
  declare tags: string[];
}

// ❌ Esto fallará porque 'id' es 'declare' y no está en @Quick
Product.create({ id: 1, tags: ['a'] }); 

// ✅ Solución Correcta:
@Quick({
  id: Number,     // Registrar primitivo
  tags: [String]
}, { strict: true })
class ProductFixed extends QModel<IProduct> {
  declare id: number; 
  declare tags: string[];
}
```
