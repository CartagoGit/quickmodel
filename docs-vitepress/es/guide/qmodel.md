# QModel

`QModel` es la clase base para todos los modelos de QuickModel. Proporciona capacidades de serialización, deserialización y generación de mocks.

## Uso Básico

Para crear un modelo, extiende `QModel` con tu interfaz:

```typescript
import { QModel } from '@cartago-git/quickmodel';

interface IUser {
	id: number;
	name: string;
}

class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
}

const user = new User({ id: 1, name: 'John' });
```

## Constructor

El constructor acepta datos que coinciden con tu interfaz.

## Métodos Estáticos

### `create<T>(data: Partial<T>): T`

Método factory para crear instancias con mejor inferencia de tipos.

### `mock(count?: number | Partial<T>, overrides?: Partial<T>): T | T[]`

Genera datos mock para testing.

## Métodos de Instancia

### `toJSON(): T`

Serializa el modelo de vuelta al formato compatible con JSON.

### `clone(): this`

Crea una copia profunda del modelo.

## Próximos Pasos

- [Decorador @Quick](/es/guide/quick-decorator) - Configura transformaciones
- [Transformadores](/es/guide/transformers) - Transformaciones de tipos disponibles
- [Serialización](/es/guide/serialization) - Profundiza en toJSON()
