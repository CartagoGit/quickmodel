# Transformadores

QuickModel incluye transformadores integrados para más de 30 tipos de JavaScript y TypeScript.

## Tipos Primitivos

### Date

Transforma strings de fecha ISO en objetos `Date`.

### BigInt

Transforma representaciones en string de enteros grandes en `bigint`.

### RegExp

Transforma strings u objetos en instancias `RegExp`.

### Symbol

Transforma strings en instancias `Symbol` usando `Symbol.for()`.

### Error

Transforma objetos de error.

## Tipos de Colección

### Set

Transforma arrays en instancias `Set`.

### Map

Transforma arrays de tuplas en instancias `Map`.

### Arrays con Transformaciones

Usa notación de corchetes para arrays de tipos transformados.

## Tipos Binarios

- `ArrayBuffer`
- TypedArrays (`Int8Array`, `Uint8Array`, etc.)
- `DataView`

## Tipos de Web API

- `URL`
- `URLSearchParams`

## Modelos Anidados

Transforma objetos anidados en instancias de modelo.

## Arrays Multidimensionales

Anidamiento explícito con notación de corchetes:

```typescript
@Quick({
  matrix: [[Date]],      // Date[][]
  cube: [[[BigInt]]],    // bigint[][][]
  grid: [[Product]]      // Product[][]
})
```

## Reglas de Transformación

### 1. Declaración Explícita Requerida

QuickModel **no auto-detecta** tipos. Todas las transformaciones deben declararse explícitamente.

### 2. Sintaxis de Arrays

Siempre usa corchetes para arrays.

### 3. Null y Undefined

Los transformadores manejan `null` y `undefined` de manera elegante.

## Próximos Pasos

- [Transformadores Personalizados](/es/guide/custom-transformers) - Crea tus propios transformadores
- [Modelos Anidados](/es/guide/nested-models) - Trabaja con estructuras complejas
- [Serialización](/es/guide/serialization) - Entiende toJSON()
