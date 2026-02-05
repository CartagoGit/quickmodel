---
layout: home

hero:
    name: QuickModel
    text: AI-Ready Data Models
    tagline: The first TypeScript modeling library with a built-in AI Brain (MCP). Serialize, validate, mock, and generate code automatically.
    actions:
        - theme: brand
          text: Get Started
          link: /en/guide/getting-started
        - theme: alt
          text: What is MCP?
          link: /en/mcp/
        - theme: alt
          text: GitHub
          link: https://github.com/CartagoGit/quickmodel

features:
    - icon: 🧠
      title: Smart Models
      details: Single @Quick decorator for complex data structures including maps and dates.

    - icon: 🤖
      title: Built-in AI Brain (MCP)
      details: Connect Claude, Cursor, VS Code, or Antigravity directly to your codebase.

    - icon: 🧪
      title: Instant Mocks
      details: Infinite, type-safe mock objects derived directly from your class definitions.

    - icon: 🛡️
      title: Runtime Integrity
      details: Validates that API responses actually match your TypeScript definitions at runtime.

    - icon: 🧩
      title: Automatic Polymorphism
      details: Instantiates correct subclasses automatically based on the shape of data.

    - icon: ⚡
      title: High Performance
      details: Native JSON parsing with zero-copy architecture where possible.
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

## Why QuickModel?

QuickModel is more than just a library; it's a **development platform** for data-heavy applications.

### 🌟 Development Superpowers

- **✨ @Quick Decorator**: The magic wand. One decorator to rule them all. Define complex data structures, handle nesting, dates, and maps automatically with a single line of code.
- **🚀 QModel Class**: The base class that gives your objects superpowers (`toJSON`, `fromJSON`, `validate`, `mock`).
- **🎭 Zero-Boilerplate Mocks**: Stop writing fixtures manually. Just call `User.mock().random()` and get a valid, populated User object. Perfect for UI development before the API is ready.
- **🛡️ Runtime Integrity**: TypeScript types disappear at runtime. QuickModel stays to ensure API responses actually match what you expect. It eliminates "undefined is not a function" errors caused by unparsed API responses.
- **🧩 Polymorphic JSON**: APIs often return different objects in the same list (e.g., `Payment` can be `Card` or `PayPal`). QuickModel automatically instantiates the correct class for each item.

### 🧠🤖 What is this "MCP" thing?

**MCP (Model Context Protocol)** is like a "universal driver" for AI Tools.

QuickModel comes with an **MCP Server** built-in. This means you can plug your favorite AI (Claude, Cursor, Antigravity) directly into the library.

- **For Beginners**: It's like having a senior engineer explaining the library to your AI. The AI _knows_ how to write valid QuickModel code because the library tells it how.
- **For Pros**: Generate robust models from JSON responses in milliseconds, create test suites automatically, and validate your architecture without context switching.

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
