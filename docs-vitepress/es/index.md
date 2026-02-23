---
layout: home

hero:
    name: QuickModel
    text: El Kit Completo de Modelado TypeScript
    tagline: 30+ transformadores de tipos, validación en dos capas, mocks, 7 formatos de schema y servidor MCP para IA — desde un único decorador `@Quick`.
    actions:
        - theme: brand
          text: Comenzar
          link: /es/guide/getting-started
        - theme: alt
          text: ¿Qué es MCP?
          link: /es/mcp/
        - theme: alt
          text: GitHub
          link: https://github.com/CartagoGit/quickmodel
---

<FeaturesCarousel />

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

## 💡 ¿Por qué QuickModel? {.landing-title}

QuickModel es más que una librería de serialización; es una **plataforma de desarrollo** para aplicaciones intensivas en datos.

### 🔄 Transformación de Tipos

- **30+ Transformadores**: `Date`, `BigInt`, `Set`, `Map`, `RegExp`, `Symbol`, `Error`, `WeakMap`, `WeakSet`, `ArrayBuffer`, `TypedArray`, `URL`… Cada tipo tiene su propio transformer especializado.
- **Arrays multi-dimensionales**: sintaxis explícita `[Date]`, `[[Post]]`, `[[[Map]]]` para 1D, 2D o 3D.
- **WeakMap / WeakSet**: cachés en memoria que nunca se serializan. Perfecto para referencias runtime GC-friendly.
- **Notación de punto**: transforma propiedades anidadas directamente en el decorador padre, sin decorar clases externas.

### 🧠 Sistema de Decoradores

- **`@Quick`**: decorador de clase que configura todos los transformadores de golpe.
- **`@QType`**: decorador de propiedad para casos concretos o contextos distintos.
- **`@QAlias`**: renombra campos entre el JSON de entrada y la instancia. Perfecto para snake_case ↔ camelCase.
- **`@QComputed`**: define getters que aparecen en `serialize()` sin existir en el JSON original.
- **`excludeFields`**: excluye campos permanentemente de toda serialización (`password`, `_checksum`, etc.).

### ✅ Validación en Dos Capas

- **Capa 1 — Integridad**: `checkIntegrity()` verifica que cada valor coincide con su transformer (fechas inválidas, BigInt fuera de rango, RegExp peligroso).
- **Capa 2 — Negocio**: `@QRule` aplica predicados declarativos por campo. `checkRules()` recorre todas las reglas y devuelve errores con campo y mensaje.
- **Combinado**: `isValid()` ejecuta ambas capas en una sola llamada. `validationReport()` separa los errores por origen.

### 📋 Formularios y Validación por Grupos

- **Funciona en cualquier clase**: `@QField`, `@QRule` y `@QGroup` no requieren extender `QModel`. Sirve para DTOs, formularios Angular/Vue/React…
- **Grupos como wizard**: `qCheckRulesByGroup()` valida solo el grupo activo, perfecto para formularios multi-paso.
- **Reglas async**: `qCheckRulesAsync()` soporta predicados que retornan `Promise<boolean>` con `timeoutMs` y modo `serial`/`parallel`.

### 🗂️ 7 Formatos de Schema

Un solo método `getSchema(format)` exporta tu modelo como:
`json` · `zod` · `openapi` · `mongo` · `typescript` · `graphql` · `ajv`

Documentación, validación y contratos de API siempre sincronizados con tu código.

### 🤖 Servidor MCP — IA Integrada

**MCP (Model Context Protocol)** es el estándar abierto de Anthropic para conectar IAs con herramientas externas. Piensa en él como un **protocolo USB**: cualquier cliente MCP (Claude, Cursor, VS Code) se conecta sin configuración ad-hoc.

QuickModel incluye **19 herramientas** y **19 prompts guiados**:

- `create_model`, `interface_to_model`, `json_to_model` — genera modelos desde distintos orígenes
- `get_model_schema`, `export_json_schema` — exporta en 7 formatos
- `simulate_validation`, `simulate_rules`, `simulate_async_rules` — prueba reglas sin ejecutar
- `diff_models`, `roundtrip`, `check_integrity` — auditoría y comparación
- `generate_mock`, `inspect_model`, `validate_usage`, `explain_error`…

- **Para novatos**: la IA sabe exactamente cómo escribir QuickModel válido porque la librería se lo dice.
- **Para pros**: genera modelos desde JSON en milisegundos y valida arquitectura sin cambiar de contexto.

### 🧪 Mocks Sin Fixtures

- `User.mock()` → objeto válido y tipado con datos realistas.
- `User.mock(5)` → array de 5 instancias.
- `User.mock({ name: 'Alice' })` → objeto con campos sobreescritos.
- Powered by `@faker-js/faker`. Perfecto para desarrollar UI antes de que la API exista.

### 🧩 Polimorfismo Automático

Las APIs devuelven objetos variados en la misma lista (`Payment` puede ser `Card` o `PayPal`). QuickModel instancia la subclase correcta **automáticamente** según la forma del dato. Sin switch, sin factories.

### 🔒 Seguridad y Protección

- **Referencias circulares**: `toJSON()` no crashea, devuelve `{ __circular: true }`.
- **Inyección**: valida URLs (bloquea `javascript:`) y limita longitud de RegExp.
- **Contaminación de prototipos**: propiedades `__proto__` excluidas automáticamente.
- **Modo estricto**: `unknownPropertyPolicy: 'error'` lanza error ante propiedades inesperadas en APIs públicas.

### 🔗 Compatibilidad

- **Mixin `QModel.extends(BaseClass)`**: añade superpoderes a entidades TypeORM, DTOs de NestJS o cualquier clase sin tocar la jerarquía.
- **TC39 + Legacy**: compatible con `experimentalDecorators` (TS 3.4+) y el estándar TC39 (TS 5+).
- **Tres estilos de propiedad**: `declare`, `!` y `?` funcionan igual.

<BenchmarkChart />

## 🚀 Ejemplo Rápido {.landing-title}

```typescript
import { QModel, Quick } from '@cartago-git/quickmodel';

// 1. Define tu interfaz
interface IUser {
	name: string;
	balance: bigint;
	lastLogin: Date;
	metadata: Map<string, any>;
}

// 2. Aplica el decorador mágico
@Quick({
	balance: 'bigint', // Usa literales para tipos simples
	lastLogin: Date, // Usa constructores para objetos nativos
	metadata: Map, // Maneja estructuras complejas automáticamente
})
class User extends QModel<IUser> {}

// 3. Respuesta de API (Strings JSON -> Objetos)
const user = new User({
	name: 'Alice',
	balance: '500000000000000000',
	lastLogin: '2024-03-15T10:00:00Z',
	metadata: [
		['role', 'admin'],
		['theme', 'dark'],
	],
});

console.log(user.balance + 1n); // 500000000000000001n (¡Es un BigInt!)
console.log(user.lastLogin.getFullYear()); // 2024 (¡Es un Date!)
console.log(user.metadata.get('role')); // "admin" (¡Es un Map!)

// 4. Enviar de vuelta a API (Objetos -> JSON)
const payload = user.toJSON();

// 5. ¿Necesitas Datos de Prueba?
const fakeUser = User.mock().random();
// ¡Genera una instancia de User totalmente poblada con datos realistas y aleatorios!
```
