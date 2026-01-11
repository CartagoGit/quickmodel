---
layout: home

hero:
    name: QuickModel
    text: Modelos Inteligentes, Serialización y Mocks
    tagline: La solución definitiva para manejar modelos complejos, serialización y mocking sin código repetitivo.
    actions:
        - theme: brand
          text: Comenzar
          link: /es/guide/getting-started
        - theme: alt
          text: Ver en GitHub
          link: https://github.com/CartagoGit/quickmodel

features:
    - icon: 🚀
      title: Cero Configuración con @Quick
      details: Define transformaciones sin esfuerzo usando un único decorador potente con soporte para literales y constructores.

    - icon: 🔄
      title: Polimorfismo Automático
      details: Maneja tipos unión y respuestas variadas de API sin esfuerzo. Instancia la clase correcta según el contenido de los datos.

    - icon: 🧪
      title: Mocks Cero-Config
      details: No escribas factorías. QuickModel lee tus decoradores para generar datos realistas y estrictamente tipados al instante.

    - icon: 🛡️
      title: Integridad en Runtime
      details: Los tipos TS se borran en runtime; QuickModel los mantiene vivos. Garantiza que tus objetos coincidan con tus interfaces.

    - icon: 🎯
      title: Arquitectura Limpia
      details: Mantén tus modelos limpios y enfocados. Sigue los principios SOLID para un código mantenible y escalable.

    - icon: ⚡
      title: Alto Rendimiento
      details: Optimizado para velocidad con una sobrecarga mínima, perfecto para procesamiento de datos de alta frecuencia.
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

## Ejemplo Rápido

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

## ¿Por qué QuickModel?

**QuickModel** cierra la brecha entre los tipos estáticos y los datos dinámicos en tiempo de ejecución.

- **🛡️ Verdadera Integridad en Runtime**: TypeScript asegura el código, QuickModel asegura los **datos**. Elimina errores de "undefined is not a function" por respuestas de API no parseadas.
- **🧩 JSON Polimórfico**: Las APIs a menudo devuelven objetos variados en la misma lista (e.g., `Payment` puede ser `Card` o `PayPal`). QuickModel instancia la clase correcta automáticamente.
- **⚡ Mocks sin Boilerplate**: Deja de escribir fixtures a mano. Como ya definiste tus tipos, QuickModel genera escenarios de prueba realistas por ti al instante.
