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

<style>
/* Make the logo inline with the title */
.VPHero .name {
  display: inline-flex !important;
  align-items: center;
  vertical-align: middle;
  margin-bottom: 1rem !important; /* Spacing below title (tagline) */
}

/* Style for the injected logo */
.hero-logo-injected {
  width: auto;
  height: 64px; /* Matches typical hero title size */
  margin-right: 1rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  transition: all 0.3s ease;
}

.hero-logo-injected:hover {
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
  transform: translateY(-2px);
}

/* Adjust mobile layout */
@media (max-width: 640px) {
  .VPHero .name {
    display: flex !important;
    flex-direction: column;
    margin-bottom: 1.5rem !important;
  }
  
  .hero-logo-injected {
    height: 64px;
    margin-right: 0;
    margin-bottom: 0.5rem;
  }
}
</style>

<script setup>
import { onMounted } from 'vue'
import { useData } from 'vitepress'

const { site } = useData()

onMounted(() => {
  const heroNameEl = document.querySelector('.VPHero .name')
  
  if (heroNameEl && !document.querySelector('.hero-logo-injected')) {
    const logo = document.createElement('img')
    
    // Construct path dynamically using site base
    // site.value.base usually ends with '/', e.g., '/quickmodel/'
    const base = site.value.base || '/'
    logo.src = (base + 'quickmodel.png').replace('//', '/')
    
    logo.alt = 'QuickModel Logo'
    logo.className = 'hero-logo-injected'
    
    heroNameEl.insertBefore(logo, heroNameEl.firstChild)
  }
})
</script>

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
	tags: Set,
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
	tags: ['admin', 'user'],
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
