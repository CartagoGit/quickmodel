# Solución de Problemas

Problemas comunes y soluciones al trabajar con QuickModel.

## Las Propiedades No se Transforman

**Síntoma:** Accedes a `user.createdAt` pero sigue siendo un string, no un `Date`.

**Causa:** Inicializadores de Propiedades de TypeScript.
Si defines una propiedad con un valor por defecto, TypeScript genera código que se ejecuta _después_ del constructor padre, sobrescribiendo el valor deserializado.

```typescript
// ❌ MAL
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	// ¡Esto se ejecuta DESPUÉS de la deserialización, reseteando el valor!
	createdAt: Date = new Date();
}
```

**Solución:** Usa `declare` o inicialización estricta (`!`).

```typescript
// ✅ BIEN
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	declare createdAt: Date; // No genera código en tiempo de ejecución
}

// ✅ O: Usa @Quick() en la clase (Recomendado)
// Esto asegura que QuickModel se ejecute antes del inicializador
@Quick()
class User extends QModel<IUser> {
	createdAt: Date = new Date();
}
```

## Error "Property has no initializer"

**Síntoma:** Error de TypeScript `TS2564: Property 'name' has no initializer and is not definitely assigned in the constructor.`

**Causa:** Verificación estricta de inicialización de clases en `tsconfig.json`.

**Solución:** Usa el operador de asignación definitiva (`!`).

```typescript
class User extends QModel<IUser> {
	name!: string; // Créeme, esto será asignado
}
```

## Dependencias Circulares

**Síntoma:** `ReferenceError: Cannot access 'User' before initialization` o bucles infinitos durante la serialización.

**Causa:** Dos modelos importándose mutuamente.

**Solución:**
QuickModel maneja las referencias circulares en la serialización automáticamente usando `WeakSet`.
Para importaciones en tiempo de ejecución, asegúrate de no crear ciclos de importación inmediatos.

## "User.from is not a function"

**Síntoma:** Usar métodos que recuerdas de otras librerías pero que no existen aquí.

**Solución:**

- Usa `new User(data)` (Constructor)
- Usa `User.create(data)` (Factoría)
- Usa `User.fromJSON(str)` (Parseo de String)

## Mocks devolviendo "Builder"

**Síntoma:** `User.mock()` devuelve un objeto con métodos como `random` en lugar de la instancia de usuario.

**Causa:** `User.mock()` inicia el patrón builder.

**Solución:** Encadena `.random()` o `.array()`.

```typescript
// ❌ INCORRECTO
const user = User.mock();

// ✅ CORRECTO
const user = User.mock().random();
```
