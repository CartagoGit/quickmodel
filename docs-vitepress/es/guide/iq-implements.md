# Seguridad de Tipos con `IQImplements`

`IQImplements` es un tipo auxiliar diseñado para reforzar una estricta seguridad de tipos entre tu interfaz de datos sin procesar (JSON) y tu clase de modelo en tiempo de ejecución (TypeScript).

Asegura que tu clase **implemente todas las propiedades** de la interfaz, manejando correctamente cualquier **transformación de tipos** definida por lógica personalizada o decoradores.

> [!NOTE] Recomendado pero Opcional
> Puedes trabajar estrictamente sin `IQImplements`, pero es **altamente recomendado** usarlo. Sin él, pierdes el puente entre tu interfaz JSON y tu clase en tiempo de ejecución, lo que puede llevar a posibles errores de tipo y comprobaciones de propiedades faltantes.

## ¿Por qué usarlo?

Cuando transformas datos (por ejemplo, convirtiendo una fecha ISO `string` desde JSON a un objeto `Date` en tu clase), a menudo hay una desconexión entre la interfaz de entrada y las propiedades de la clase.

Sin `IQImplements`:

1.  **Propiedades Faltantes**: Podrías olvidar declarar una propiedad en tu clase que existe en la interfaz.
2.  **Discordancia de Tipos**: TypeScript podría insistir en que tu propiedad es un `string` (debido a la interfaz) cuando en realidad es un `Date` en tiempo de ejecución.
3.  **Riesgos de Refactorización**: Agregar un nuevo campo a tu interfaz de API no activará automáticamente un error en tu clase de modelo, lo que lleva a errores en tiempo de ejecución.

`IQImplements` resuelve todos estos problemas imponiendo un contrato estricto.

## Uso

El tipo acepta dos argumentos genéricos:

1.  **TInterface**: La interfaz base que representa la estructura JSON sin procesar.
2.  **TTransforms**: Un tipo de objeto que describe _solo_ las propiedades que han cambiado de tipo.

```typescript
implements IQImplements<InterfazBase, InterfazTransformaciones>
```

## Ejemplos

### 1. Transformación Básica

Escenario: Tu API envía un `string` para `createdAt`, pero quieres trabajar con un objeto `Date`.

```typescript
import { QModel, Quick, IQImplements } from 'quickmodel';

// 1. Datos Sin Procesar (JSON)
interface IUser {
	id: number;
	name: string;
	createdAt: string; // Cadena ISO
}

// 2. Transformaciones
// Define SOLO los campos que cambian
interface IUserTransforms {
	createdAt: Date;
}

// 3. Definición del Modelo
@Quick({ createdAt: Date })
class User
	extends QModel<IUser>
	implements IQImplements<IUser, IUserTransforms>
{
	declare id: number;
	declare name: string;
	declare createdAt: Date; // ✅ Tipado correctamente como Date
}
```

### 2. Transformaciones en Línea (Simplificado)

Para modelos simples, no necesitas una interfaz separada para las transformaciones. Puedes pasar un objeto literal directamente.

```typescript
interface IProduct {
	price: string; // "100.50"
	active: number; // 0 o 1
}

@Quick({
	price: 'number',
	active: 'boolean',
})
class Product
	extends QModel<IProduct>
	implements
		IQImplements<
			IProduct,
			{
				price: number;
				active: boolean;
			}
		>
{
	declare price: number;
	declare active: boolean;
}
```

## Cómo Funciona

Internamente, `IQImplements` hace aproximadamente esto:

```typescript
type IQImplements<T, Transforms> = Omit<T, keyof Transforms> & Transforms;
```

Toma tu interfaz base `T`, elimina las claves que se están transformando y las reemplaza con los nuevos tipos de `Transforms`. Esto crea un tipo híbrido perfecto que tu clase debe satisfacer.

## Errores Comunes

### Olvidar `declare`

Cuando usas `IQImplements` (o `implements` estándar), generalmente querrás usar la palabra clave `declare` para tus propiedades para evitar errores de TypeScript sobre propiedades no inicializadas, ya que `QModel` maneja la asignación internamente.

```typescript
// ❌ Error: La propiedad 'name' no tiene inicializador
class User extends QModel<IUser> implements IQImplements<IUser, {}> {
	name: string;
}

// ✅ Correcto
class User extends QModel<IUser> implements IQImplements<IUser, {}> {
	declare name: string;
}
```

### Discordancia entre Decoradores y Tipos

`IQImplements` verifica tus _tipos de TypeScript_, pero no sabe sobre los decoradores en tiempo de ejecución. Asegúrate de que tu decorador `@Quick` coincida con tus definiciones de tipo.

```typescript
@Quick({ date: Date }) // Transformación en tiempo de ejecución
class Event
	extends QModel<IEvent>
	implements IQImplements<IEvent, { date: Date }>
{
	declare date: Date; // Tipo en tiempo de compilación
}
```
