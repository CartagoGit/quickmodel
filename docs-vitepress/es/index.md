---
layout: home

hero:
  name: QuickModel
  text: Serialización Type-safe para TypeScript
  tagline: Serialización/deserialización JSON automática con arquitectura SOLID
  actions:
    - theme: brand
      text: Comenzar
      link: /es/guide/getting-started
    - theme: alt
      text: Ver en GitHub
      link: https://github.com/CartagoGit/quickmodel

features:
  - icon: 🚀
    title: Sin Configuración
    details: Funciona directamente con decoradores TypeScript. Sin configuración compleja.
  
  - icon: 🔒
    title: Type-Safe
    details: Soporte completo TypeScript con verificación estricta de tipos e inferencia.
  
  - icon: ⚡
    title: Transformaciones Automáticas
    details: Maneja Date, BigInt, Map, Set, RegExp y más sin conversión manual.
  
  - icon: 🎯
    title: Arquitectura SOLID
    details: Diseño limpio y extensible siguiendo principios SOLID.
  
  - icon: 🧪
    title: Generación de Mocks
    details: Generación de datos de prueba integrada con faker.js.
  
  - icon: 🔄
    title: Bidireccional
    details: Serialización y deserialización fluida con soporte completo de ida y vuelta.
---

## Ejemplo Rápido

```typescript
import { QModel, Quick } from '@cartago-git/quickmodel';

interface IUser {
  id: number;
  name: string;
  createdAt: Date;
  tags: Set<string>;
}

@Quick({
  createdAt: Date,
  tags: Set
})
class User extends QModel<IUser> {
  id!: number;
  name!: string;
  createdAt!: Date;
  tags!: Set<string>;
}

// Create from API data
const user = new User({
  id: 1,
  name: 'John',
  createdAt: '2024-01-01T00:00:00.000Z',
  tags: ['admin', 'user']
});

console.log(user.createdAt instanceof Date); // true
console.log(user.tags instanceof Set); // true

// Serialize back to JSON
const json = user.serialize();
// { id: 1, name: 'John', createdAt: '2024-01-01T00:00:00.000Z', tags: ['admin', 'user'] }
```

## Why QuickModel?

Working with TypeScript models and JSON APIs often requires tedious manual conversion between JavaScript types and JSON-compatible formats. QuickModel automates this process while maintaining type safety and providing a clean, extensible architecture.

Perfect for:
- 🌐 REST API clients
- 📦 Data serialization/deserialization
- 🧪 Testing with realistic mock data
- 🏗️ Clean architecture applications
