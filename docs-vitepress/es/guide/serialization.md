# Serialización

QuickModel proporciona transformación bidireccional entre tipos en runtime y formatos compatibles con JSON.

## El Patrón de Dos Interfaces

QuickModel usa dos interfaces para representar los mismos datos:

1. **Interfaz de Serialización** - Tipos compatibles con JSON
2. **Interfaz de Runtime** - Tipos de TypeScript

## Deserialización (JSON → Runtime)

Cuando creas una instancia de modelo, QuickModel transforma automáticamente los tipos compatibles con JSON en tipos de runtime.

## Serialización (Runtime → JSON)

El método `toJSON()` revierte todas las transformaciones:

```typescript
const json = user.toJSON();
```

## Reglas de Transformación

- **Date → String ISO**
- **BigInt → String**
- **Set → Array**
- **Map → Array de Tuplas**
- **RegExp → Object**
- **Symbol → String**
- **ArrayBuffer → Base64**
- **TypedArray → Array**
- **URL → String**
- **URLSearchParams → Object**

## Modelos Anidados

Los modelos anidados se serializan recursivamente.

## Trabajando con APIs

### Enviando Datos

```typescript
await fetch('/api/users', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify(user.toJSON()),
});
```

### Recibiendo Datos

```typescript
const response = await fetch(`/api/users/${id}`);
const data = await response.json();
return new User(data);
```

## Integración con JSON.stringify

`toJSON()` se llama automáticamente por `JSON.stringify()`.

## Próximos Pasos

- [Transformadores](/es/guide/transformers) - Ve todas las reglas de transformación
- [Modelos Anidados](/es/guide/nested-models) - Trabaja con estructuras complejas
- [Ejemplos](/es/examples/api-models) - Integración con API del mundo real
