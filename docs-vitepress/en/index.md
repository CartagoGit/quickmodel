---
layout: home

hero:
  name: QuickModel
  text: Type-safe Serialization for TypeScript
  tagline: Automatic JSON serialization/deserialization with SOLID architecture
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/CartagoGit/quickmodel

features:
  - icon: 🚀
    title: Zero Configuration
    details: Works out of the box with TypeScript decorators. No complex setup required.
  
  - icon: 🔒
    title: Type-Safe
    details: Full TypeScript support with strict type checking and inference.
  
  - icon: ⚡
    title: Automatic Transformations
    details: Handles Date, BigInt, Map, Set, RegExp, and more without manual conversion.
  
  - icon: 🎯
    title: SOLID Architecture
    details: Clean, extensible design following SOLID principles.
  
  - icon: 🧪
    title: Mock Generation
    details: Built-in mock data generation for testing with faker.js integration.
  
  - icon: 🔄
    title: Bidirectional
    details: Seamless serialization and deserialization with full roundtrip support.
---

## Quick Example

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
