---
layout: home

hero:
    name: QuickModel
    text: Smart Models, Serialization & Mocks
    tagline: The ultimate solution for handling complex data models, serialization, and mocking with zero boilerplate.
    actions:
        - theme: brand
          text: Get Started
          link: /en/guide/getting-started
        - theme: alt
          text: View on GitHub
          link: https://github.com/CartagoGit/quickmodel

features:
    - icon: 🚀
      title: Zero Config with @Quick
      details: Defines transformations seamlessly using a single, powerful decorator with support for string literals and constructors.

    - icon: 🔄
      title: Automatic Polymorphism
      details: Handles union types and varied API responses effortlessly. Instantiates the correct class based on data content.

    - icon: 🧪
      title: Zero-Config Mocks
      details: Don't write factories. QuickModel reads your decorators to generate unlimited, strictly-typed realistic data instantly.

    - icon: 🛡️
      title: Runtime Integrity
      details: TypeScript types are erased at runtime; QuickModel keeps them alive. Guarantees your objects match your interfaces.

    - icon: 🎯
      title: Clean Architecture
      details: Keeps your models clean and focused. Follows SOLID principles for maintainable and scalable code.

    - icon: ⚡
      title: High Performance
      details: Optimized for speed with lightweight overhead, perfect for high-frequency data processing.
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

// 1. Define your interface
interface IUser {
	name: string;
	balance: bigint;
	lastLogin: Date;
	metadata: Map<string, any>;
}

// 2. Apply the magic decorator
@Quick({
	balance: 'bigint', // Use string literals for simple types
	lastLogin: Date, // Use constructors for native objects
	metadata: Map, // Automatically handles complex structures
})
class User extends QModel<IUser> {}

// 3. API Response (JSON strings -> Objects)
const user = new User({
	name: 'Alice',
	balance: '500000000000000000',
	lastLogin: '2024-03-15T10:00:00Z',
	metadata: [
		['role', 'admin'],
		['theme', 'dark'],
	],
});

console.log(user.balance + 1n); // 500000000000000001n (It's a BigInt!)
console.log(user.lastLogin.getFullYear()); // 2024 (It's a Date!)
console.log(user.metadata.get('role')); // "admin" (It's a Map!)

// 4. Send back to API (Objects -> JSON)
const payload = user.toJSON();

// 5. Need Mock Data?
const fakeUser = User.mock().random();
// Generates a fully populated User instance with random, realistic data!
```

## Why QuickModel?

**QuickModel** bridges the gap between static types and dynamic runtime data.

- **🛡️ True Runtime Integrity**: TypeScript ensures correct code, but QuickModel ensures correct **data**. It eliminates "undefined is not a function" errors caused by unparsed API responses.
- **🧩 Polymorphic JSON**: APIs often return different objects in the same list (e.g., `Payment` can be `Card` or `PayPal`). QuickModel automatically instantiates the correct class for each item.
- **⚡ Zero-Boilerplate Mocks**: Stop writing fixtures manually. Since you've already defined your types, QuickModel can generate realistic test scenarios for you instantly.
