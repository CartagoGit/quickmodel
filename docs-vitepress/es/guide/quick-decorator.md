# Decorador @Quick

El decorador `@Quick()` es el núcleo del sistema de transformación de QuickModel. Le dice a QuickModel qué propiedades necesitan transformación de tipo y cómo transformarlas.

## Sintaxis Básica

```typescript
import { Quick, QModel } from '@cartago-git/quickmodel';

@Quick({
	propertyName: TransformerType,
})
class MyModel extends QModel<IMyModel> {
	// ...
}
```

## Sin Argumentos

Usar `@Quick()` sin argumentos decora automáticamente todas las propiedades.

## Con Transformaciones

Especifica qué propiedades necesitan transformación:

```typescript
@Quick({
  createdAt: Date,    // Transforma string → Date
  balance: BigInt     // Transforma string → bigint
})
```

## Transformadores Soportados

- **Primitivos:** `BigInt`, `Date`, `RegExp`, `Symbol`, `Error`
- **Colecciones:** `Set`, `Map`, Arrays
- **Binarios:** `ArrayBuffer`, TypedArrays, `DataView`
- **Web APIs:** `URL`, `URLSearchParams`

## Sintaxis de Arrays

**Siempre usa notación de corchetes `[Type]` para arrays:**

```typescript
@Quick({
  dates: [Date],        // string[] → Date[]
  tags: [Set],          // string[][] → Set<string>[]
  authors: [Author]     // IAuthor[] → Author[]
})
```

## Modelos Anidados

```typescript
@Quick({ birthDate: Date })
class Profile extends QModel<IProfile> {
	declare birthDate: Date;
}

@Quick({ profile: Profile })
class User extends QModel<IUser> {
	declare profile: Profile;
}
```

## Notación de Punto para Propiedades Anidadas

```typescript
@Quick({
  product: Product,
  'product.price': BigInt,      // Transforma propiedad anidada
  'product.createdAt': Date     // Transforma propiedad anidada
})
```

## Próximos Pasos

- [Transformadores](/es/guide/transformers) - Ve todos los transformadores disponibles
- [Modelos Anidados](/es/guide/nested-models) - Trabaja con estructuras complejas
- [Transformadores Personalizados](/es/guide/custom-transformers) - Crea tus propios transformadores
