# Transformadores Personalizados

QuickModel te permite crear transformadores personalizados para tus propios tipos o para sobrescribir el comportamiento integrado.

## Crear un Transformador Personalizado

Un transformador es una clase que implementa la lógica de transformación para un tipo específico.

### Estructura Básica

```typescript
import { IQTransformer } from '@cartago-git/quickmodel/core';

class MyCustomTransformer implements IQTransformer<MyType, SerializedType> {
	deserialize(value: SerializedType, propertyKey: string, className: string): MyType {
		return new MyType(value);
	}

	serialize(value: MyType): SerializedType {
		return value.toJSON();
	}
}
```

### Ejemplo: Tipo Money

```typescript
class Money {
	constructor(
		public amount: number,
		public currency: string
	) {}
}

interface IMoneyJSON {
	amount: number;
	currency: string;
}

class MoneyTransformer implements IQTransformer<Money, IMoneyJSON> {
	deserialize(value: IMoneyJSON): Money {
		return new Money(value.amount, value.currency);
	}

	serialize(value: Money): IMoneyJSON {
		return {
			amount: value.amount,
			currency: value.currency,
		};
	}
}

// Registrar el transformador
import { TransformerRegistry } from '@cartago-git/quickmodel/core';
TransformerRegistry.register(Money, new MoneyTransformer());

// Usar en modelos
@Quick({ price: Money })
class Product extends QModel<IProduct> {
	declare price: Money;
}
```

## Manejo de Null y Undefined

Los transformadores deben manejar `null` y `undefined` de manera elegante.

## Soporte de Arrays

Para soportar arrays de tu tipo personalizado, el transformador funciona automáticamente.

## Mejores Prácticas

1. **Validar Entrada**
2. **Manejar Casos Extremos**
3. **Proporcionar Mensajes de Error Claros**
4. **Mantener Transformadores Puros**
5. **Hacer Transformaciones Reversibles**

## Próximos Pasos

- [Transformadores](/es/guide/transformers) - Ve todos los transformadores integrados
- [Modelos Anidados](/es/guide/nested-models) - Combina tipos personalizados con anidamiento
