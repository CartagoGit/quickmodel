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
    
    const base = site.value.base || '/'
    logo.src = (base + 'quickmodel.png').replace('//', '/')
    
    logo.alt = 'Logo de QuickModel'
    logo.className = 'hero-logo-injected'
    
    heroNameEl.insertBefore(logo, heroNameEl.firstChild)
  }
})
</script>

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
