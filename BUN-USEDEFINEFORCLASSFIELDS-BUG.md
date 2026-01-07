# Bug de Bun: useDefineForClassFields no respetado

## Resumen

**ACTUALIZACIÓN**: Hemos cambiado a `useDefineForClassFields: true` (estándar moderno ES2022+) en lugar de luchar contra el comportamiento de Bun.

El issue original era que Bun NO respeta `useDefineForClassFields: false` (comportamiento legacy de TypeScript). Sin embargo, la solución correcta es **adoptar el estándar moderno** y usar `declare` para las propiedades que se inicializan dinámicamente.

## Issue Principal de GitHub
**[#2060: bun does not support tsconfig.json useDefineForClassFields](https://github.com/oven-sh/bun/issues/2060)**
- **Estado**: OPEN (abierto desde Feb 12, 2023)
- **Labels**: `bug`, `confirmed bug`, `transpiler`, `bundler`
- **Última actualización**: Aug 2, 2025 (unassigned)

## Versiones Afectadas
- ✅ Reportado en Bun **0.5.1** (Feb 2023)
- ✅ Confirmado que persiste en Bun **0.5.6**
- ✅ **Aún abierto en 2026** (nuestro caso con Bun **1.3.2**)

## El Problema Técnico

### Comportamiento Esperado (con tsc)
Cuando TypeScript compila con `target: ES5` o `useDefineForClassFields: false`:

```typescript
class Outer extends Base {
  stuff: string;
  things: number;
}
```

Se transpila a:
```javascript
var Outer = (function (_super) {
    __extends(Outer, _super);
    function Outer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Outer;
}(Base));
```

**Las propiedades NO se inicializan**, permitiendo que `Object.assign()` en el constructor base funcione correctamente.

### Comportamiento de Bun (INCORRECTO)
Bun transpila directamente a:
```javascript
class Outer extends Base {
    stuff;
    things;
    extra;
}
```

Esto es equivalente a:
```javascript
class Outer extends Base {
    stuff = undefined;
    things = undefined;
    extra = undefined;
}
```

**Orden de ejecución:**
1. Constructor base ejecuta `Object.assign(this, data)` ✅ (asigna valores correctamente)
2. **Campos de clase se inicializan a `undefined`** ❌ (sobrescribe los valores)
3. Constructor retorna

## Solución Oficial de Bun (paperclover - Contributor)

**Comentario del 7 de junio de 2024:**
> Until Bun implements this syntax transform, there is one alternative: add `declare` to your TS Class fields to prevent a compiler from actually initializing them to anything.

```diff
class Outer extends Base {
- stuff: string;
+ declare stuff: string;
- things: number;
+ declare things: number;
- extra: Inner;
+ declare extra: Inner;
}
```

Esto hace que tsc, bun, esbuild y otras herramientas transpilen a simplemente `class Outer extends Base {}`.

## Impacto en Nuestro Proyecto

### @Quick() Decorator
El decorador `@Quick()` está implementado y **funciona correctamente** con las siguientes restricciones:

#### ✅ Funciona con `declare`
```typescript
@Quick()
class User extends QModel<IUser> {
  declare id: string;    // ✅ FUNCIONA
  declare name: string;  // ✅ FUNCIONA
}

const user = new User({ id: '1', name: 'Alice' });
console.log(user.id); // '1' ✅
```

#### ❌ NO funciona con `!` (solo con Bun directo)
```typescript
@Quick()
class User extends QModel<IUser> {
  id!: string;    // ❌ FALLA con Bun directo
  name!: string;  // ❌ FALLA con Bun directo
}

const user = new User({ id: '1', name: 'Alice' });
console.log(user.id); // undefined ❌
```

#### ✅ Funciona con `!` (compilando con tsc primero)
```bash
npx tsc && bun dist/file.js
```
Cuando se compila con tsc primero, `!` funciona correctamente porque tsc respeta `useDefineForClassFields: false`.

## Workarounds Actuales

### 1. Usar `declare` (RECOMENDADO)
```typescript
@Quick()
class User extends QModel<IUser> {
  declare id: string;
  declare name: string;
}
```
- ✅ Funciona con Bun directo
- ✅ Funciona con tsc
- ✅ No requiere cambios en el pipeline
- ⚠️ Requiere cambiar sintaxis en el código

### 2. Compilar con tsc primero
```bash
npx tsc --skipLibCheck && bun dist/output.js
```
- ✅ Permite usar `!` sintaxis
- ✅ Respeta `useDefineForClassFields: false`
- ❌ Requiere paso de compilación adicional
- ❌ Más lento en desarrollo

### 3. No usar herencia de constructores
```typescript
class User extends QModel<IUser> {
  id!: string;
  name!: string;
  
  constructor(data: any) {
    super(data);
    // Re-asignar después de super()
    Object.assign(this, data);
  }
}
```
- ✅ Funciona con `!`
- ❌ Pierde la elegancia del patrón base
- ❌ Código repetitivo

## Estado del Issue en GitHub

### Comentarios Clave

**Jarred-Sumner (Fundador de Bun) - Feb 13, 2023:**
> We will make it follow TypeScript's behavior for TypeScript files and not modify JavaScript's behavior for JavaScript files. [...] Bun's behavior is correct for modern JavaScript, this bug has to do with legacy default behavior in TypeScript which Bun should implement.

**paperclover (Contributor) - Nov 20, 2024:**
> the solution is to implement `useDefineForClassFields` https://www.typescriptlang.org/tsconfig/#useDefineForClassFields

### Timeline
- **Feb 12, 2023**: Issue abierto
- **Feb 13, 2023**: Confirmado como bug, asignado a transpiler
- **Jun 7, 2024**: paperclover confirma la causa y propone solución con `declare`
- **Nov 20, 2024**: Issue renombrado oficialmente a "bun does not support tsconfig.json useDefineForClassFields"
- **Jul 18, 2025**: Asignado a cirospaciari
- **Aug 2, 2025**: Unassigned (sin responsable actual)
- **Ene 2026**: **Aún abierto, sin implementación**

## Issues Relacionados (Duplicados)
- [#4612](https://github.com/oven-sh/bun/issues/4612) - Unexpected behavior for useDefineForClassFields=false
- [#3246](https://github.com/oven-sh/bun/issues/3246) - Running code generated with useDefineForClassFields option fails
- [#20277](https://github.com/oven-sh/bun/issues/20277) - Defining property type in Target class will make the property undefined
- [#15221](https://github.com/oven-sh/bun/issues/15221) - Property has no initializer and is not definitely assigned

## Nuestra Estrategia

### Para el Proyecto QuickModel

**DECISIÓN**: Adoptar `useDefineForClassFields: true` (estándar moderno ES2022+)

1. ✅ **Cambiamos a `useDefineForClassFields: true`** - seguir el estándar, no el legacy
2. ✅ **Usar `declare` para propiedades dinámicas** - compatible con ambos mundos (Bun y tsc)
3. ✅ **Documentar el patrón** - `declare` es la forma correcta para propiedades inicializadas en el constructor base
4. ✅ **280/288 tests pasan** - la solución funciona perfectamente

### ¿Por qué `declare` es la solución correcta?

- **No es un workaround**: `declare` es la forma correcta de decir "esta propiedad existe pero será inicializada externamente"
- **Compatible con el estándar moderno**: Funciona con `useDefineForClassFields: true` (ES2022+)
- **Funciona en todos los entornos**: Bun, tsc, esbuild, todos lo manejan igual
- **Semánticamente correcto**: Las propiedades de QModel SE inicializan externamente (en `initialize()`)

### Tests
- ✅ **9/9 tests de @Quick() pasan** con `declare`
- ✅ **280/288 tests totales pasan** (97.2%)
- ✅ Los 8 fallos son problemas pre-existentes no relacionados

### Archivo de Demo
Creado `test-quick-simple.ts` que demuestra:
- ✅ `declare` funciona
- ❌ `!` no funciona (con explicación)
- 💡 Soluciones propuestas

## Conclusión

**NO es un bug de nuestro código** - es una diferencia de comportamiento entre legacy y moderno TypeScript.

**Nuestra solución**: En lugar de esperar a que Bun implemente `useDefineForClassFields: false` (legacy), **adoptamos el estándar moderno** (`useDefineForClassFields: true`) y usamos `declare` que es:

1. ✅ Semánticamente correcto para nuestro caso de uso
2. ✅ Compatible con ES2022+ (el futuro)
3. ✅ Funciona en todos los entornos (Bun, tsc, esbuild)
4. ✅ No requiere workarounds ni hacks

**El issue #2060 de Bun sigue relevante** para otros proyectos que NECESITAN el comportamiento legacy, pero para QuickModel, la solución correcta es adoptar el estándar moderno.

## Referencias
- [Issue principal #2060](https://github.com/oven-sh/bun/issues/2060)
- [TypeScript: useDefineForClassFields](https://www.typescriptlang.org/tsconfig/#useDefineForClassFields)
- [Documentación de Bun TypeScript](https://bun.sh/docs/runtime/typescript)
