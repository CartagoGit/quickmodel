---
layout: home

hero:
    name: QuickModel
    text: Modelos de Datos Listos para IA
    tagline: La primera librería de modelado TypeScript con Cerebro IA (MCP) integrado. Serializa, valida, mockea y genera código automáticamente.
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

features:
    - icon: 🧠
      title: Modelos Inteligentes
      details: Un solo decorador @Quick para estructuras complejas, incluyendo mapas y fechas.

    - icon: 🤖
      title: Cerebro IA Integrado (MCP/Skills)
      details: Conecta Claude, Cursor, VS Code o Antigravity directamente a tu base de código.

    - icon: 🧪
      title: Mocks Instantáneos
      details: Objetos mock infinitos y tipados derivados directamente de tus definiciones.

    - icon: 🛡️
      title: Integridad en Runtime
      details: Valida en tiempo de ejecución que las respuestas de API coinciden con tus definiciones.

    - icon: 🧩
      title: Polimorfismo Automático
      details: Instancia automáticamente la subclase correcta basándose en la forma de los datos.

    - icon: ⚡
      title: Alto Rendimiento
      details: Parseo JSON nativo con arquitectura zero-copy donde es posible.
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

## 💡 ¿Por qué QuickModel? {.landing-title}

QuickModel es más que una simple librería de serialización; es una **plataforma de desarrollo** para aplicaciones intensivas en datos.

### 🌟 Superpoderes de Desarrollo

- **Decorador @Quick**: La varita mágica. Un decorador para gobernarlos a todos (tipos, validación, transformación). Define estructuras complejas, anidamiento, fechas y mapas automáticamente.
- **Clase QModel**: La clase base que da superpoderes a tus objetos (`toJSON`, `fromJSON`, `validate`, `mock`).
- **Mocks Sin Boilerplate**: Deja de escribir fixtures a mano. Simplemente llama a `User.mock().random()` y obtén un objeto User válido y poblado. Perfecto para desarrollar UI antes de que la API esté lista.
- **Verdadera Integridad en Runtime**: Los tipos TypeScript desaparecen al compilar. QuickModel se queda para asegurar que la API devuelve realmente lo que esperas. Elimina errores de "undefined is not a function".
- **JSON Polimórfico**: Las APIs a menudo devuelven objetos variados en la misma lista (e.g., `Payment` puede ser `Card` o `PayPal`). QuickModel instancia la clase correcta automáticamente segun la forma de los datos.

### 🤖 ¿Qué es esto del "MCP"?

**MCP (Model Context Protocol)** es un estándar abierto creado por Anthropic que define cómo las IAs se comunican con herramientas externas. Piensa en él como un **protocolo USB**: cualquier IA compatible (cliente MCP) puede conectarse a cualquier herramienta compatible (servidor MCP) sin configuración ad-hoc. En lugar de integrar cada IA con cada herramienta por separado, MCP ofrece un contrato único universal.

En la práctica, un servidor MCP expone **Skills** (herramientas/acciones) y **contexto** (recursos, prompts) que la IA puede invocar. La IA no adivina — llama a funciones concretas con parámetros tipados y recibe resultados estructurados.

QuickModel trae un **Servidor MCP** integrado con sus propios Skills. Esto significa que puedes conectar tu IA favorita (Claude, Cursor, Antigravity) directamente a la librería.

- **Para Principiantes**: Es como darle a tu IA el manual de instrucciones de tu código. En lugar de adivinar, la IA _sabe_ exactamente cómo escribir código QuickModel válido.
- **Para Pros**: Genera modelos robustos desde JSON en milisegundos, crea suites de tests automáticamente y valida tu arquitectura sin cambiar de contexto.

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
