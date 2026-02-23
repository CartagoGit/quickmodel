---
layout: home

hero:
    name: QuickModel
    text: The Complete TypeScript Modeling Kit
    tagline: 30+ type transformers, two-layer validation, mocks, 7 schema formats, and a built-in MCP server for AI — all driven by a single `@Quick` decorator.
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

<BenchmarkChart />

## 💡 Why QuickModel? {.landing-title}

QuickModel is more than a serialization library; it's a **development platform** for data-intensive applications.

### 🔄 Type Transformation

- **30+ Transformers**: `Date`, `BigInt`, `Set`, `Map`, `RegExp`, `Symbol`, `Error`, `WeakMap`, `WeakSet`, `ArrayBuffer`, `TypedArray`, `URL`… Each type has its own specialized transformer.
- **Multi-dimensional arrays**: explicit syntax `[Date]`, `[[Post]]`, `[[[Map]]]` for 1D, 2D or 3D.
- **WeakMap / WeakSet**: in-memory caches that are never serialized. Perfect for GC-friendly runtime references.
- **Dot notation**: transform nested properties directly in the parent decorator, without decorating external classes.

### 🧠 Decorator System

- **`@Quick`**: class-level decorator that configures all transformers at once.
- **`@QType`**: property-level decorator for specific cases or different contexts.
- **`@QAlias`**: renames fields between incoming JSON and the instance. Perfect for snake_case ↔ camelCase.
- **`@QComputed`**: defines getters that appear in `serialize()` without existing in the original JSON.
- **`excludeFields`**: permanently excludes fields from all serialization (`password`, `_checksum`, etc.).

### ✅ Two-Layer Validation

- **Layer 1 — Integrity**: `checkIntegrity()` verifies each value matches its transformer (invalid dates, BigInt out of range, dangerous RegExp).
- **Layer 2 — Business**: `@QRule` applies declarative predicates per field. `checkRules()` iterates all rules and returns errors with field and message.
- **Combined**: `isValid()` runs both layers in a single call. `validationReport()` separates errors by origin.

### 📋 Forms and Group Validation

- **Works on any class**: `@QField`, `@QRule` and `@QGroup` don't require extending `QModel`. Useful for DTOs, Angular/Vue/React forms…
- **Groups as wizard steps**: `qCheckRulesByGroup()` validates only the active group, perfect for multi-step forms.
- **Async rules**: `qCheckRulesAsync()` supports predicates returning `Promise<boolean>` with `timeoutMs` and `serial`/`parallel` mode.

### 🗂️ 7 Schema Formats

A single `getSchema(format)` call exports your model as:
`json` · `zod` · `openapi` · `mongo` · `typescript` · `graphql` · `ajv`

Documentation, validation, and API contracts always in sync with your code.

### 🤖 MCP Server — Native AI Integration

**MCP (Model Context Protocol)** is Anthropic's open standard for connecting AIs to external tools. Think of it as a **USB protocol**: any MCP client (Claude, Cursor, VS Code) connects without ad-hoc configuration.

QuickModel includes **19 tools** and **19 guided prompts**:

- `create_model`, `interface_to_model`, `json_to_model` — generate models from different sources
- `get_model_schema`, `export_json_schema` — export in 7 formats
- `simulate_validation`, `simulate_rules`, `simulate_async_rules` — test rules without running code
- `diff_models`, `roundtrip`, `check_integrity` — auditing and comparison
- `generate_mock`, `inspect_model`, `validate_usage`, `explain_error`…

- **For beginners**: your AI knows exactly how to write valid QuickModel code because the library tells it.
- **For pros**: generate models from JSON in milliseconds and validate architecture without context switching.

### 🧪 Zero-Boilerplate Mocks

- `User.mock()` → valid, typed object with realistic data.
- `User.mock(5)` → array of 5 instances.
- `User.mock({ name: 'Alice' })` → object with overridden fields.
- Powered by `@faker-js/faker`. Perfect for building UI before the API exists.

### 🧩 Automatic Polymorphism

APIs return different object shapes in the same list (`Payment` can be `Card` or `PayPal`). QuickModel instantiates the correct subclass **automatically** based on the data shape. No switch, no factories.

### 🔒 Security and Protection

- **Circular references**: `toJSON()` doesn't crash, returns `{ __circular: true }`.
- **Injection**: validates URLs (blocks `javascript:`) and limits RegExp length.
- **Prototype pollution**: `__proto__` properties automatically excluded.
- **Strict mode**: `unknownPropertyPolicy: 'error'` throws on unexpected properties in public APIs.

### 🔗 Compatibility

- **Mixin `QModel.extends(BaseClass)`**: adds superpowers to TypeORM entities, NestJS DTOs, or any class without touching the hierarchy.
- **TC39 + Legacy**: compatible with `experimentalDecorators` (TS 3.4+) and TC39 standard (TS 5+).
- **Three property styles**: `declare`, `!` and `?` all work identically.

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
