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
	tags: Set,
})
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare createdAt: Date;
	declare tags: Set<string>;
}

// Crear desde datos de API
const user = new User({
	id: 1,
	name: 'John',
	createdAt: '2024-01-01T00:00:00.000Z',
	tags: ['admin', 'user'],
});

console.log(user.createdAt instanceof Date); // true
console.log(user.tags instanceof Set); // true

// Serializar de vuelta a JSON
const json = user.toJSON();
// { id: 1, name: 'John', createdAt: '2024-01-01T00:00:00.000Z', tags: ['admin', 'user'] }
```

## ¿Por Qué QuickModel?

Trabajar con modelos de TypeScript y APIs JSON a menudo requiere conversión manual tediosa entre tipos de JavaScript y formatos compatibles con JSON. QuickModel automatiza este proceso mientras mantiene la seguridad de tipos y proporciona una arquitectura limpia y extensible.

Perfecto para:

- 🌐 Clientes de API REST
- 📦 Serialización/deserialización de datos
- 🧪 Testing con datos mock realistas
- 🏗️ Aplicaciones con arquitectura limpia
