# Propuesta: Reestructuración de la documentación de QuickModel

> **Estado:** ✅ Implementado  
> **Fecha:** 28 de febrero de 2026  
> **Afecta a:** `docs-vitepress/.vitepress/config.ts` (sidebar EN + ES), componente `BenchmarkChart`, páginas `.md` de la guía

---

## 1. Problema actual

La sección **"Advanced"** (EN) / **"Avanzado"** (ES) del sidebar agrupa 13 páginas de naturaleza completamente distinta. Un usuario que busca validación, formularios o mocks tiene que explorar un cajón de sastre junto a bundle size y troubleshooting. No escala al crecer la librería.

---

## 2. Nueva estructura del sidebar

### Secciones resultantes

| #   | Sección (EN)      | Sección (ES)        | Páginas                                                                                                        |
| --- | ----------------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | **Introduction**  | **Introducción**    | Getting Started, Installation, Quick Start                                                                     |
| 2   | **Core**          | **Núcleo**          | QModel, IQImplements, @Quick, @QType, TC39 Decorators, Transformers, Serialization, Aliases Reference, @QAlias |
| 3   | **Validation**    | **Validación**      | Validation (@QRule), Built-in Validators                                                                       |
| 4   | **Forms**         | **Formularios**     | Form Validation (/forms), Form Schema (@QField), FormData                                                      |
| 5   | **Mocks**         | **Mocks**           | Mock Generation                                                                                                |
| 6   | **Customization** | **Personalización** | Custom Transformers, Nested Models, Dot Notation, Unknown Property Policy                                      |
| 7   | **Performance**   | **Rendimiento**     | Bundle Size & Tree-shaking                                                                                     |
| 8   | **Reference**     | **Referencia**      | Troubleshooting                                                                                                |

> **Sin cambios:** secciones top-level Examples, Integrations y MCP.  
> **Sin cambios de rutas:** ningún `.md` cambia de carpeta. Solo cambia su posición en el sidebar.  
> **`formdata.md`:** existe con 327 líneas de contenido completo pero no estaba en el sidebar — se añade a Forms.  
> **`@QAlias`:** va en Core junto a `aliases.md` (es mapeo de claves en serialización, no utilidad de formulario).  
> **Performance:** solo contiene `bundle-size.md`. Los benchmarks van embebidos en cada página (ver punto 3).

### Mapa completo de movimientos

| Página                       | Sección actual        | Sección nueva |
| ---------------------------- | --------------------- | ------------- |
| `qmodel.md`                  | Core Concepts         | Core          |
| `iq-implements.md`           | Core Concepts         | Core          |
| `quick-decorator.md`         | Core Concepts         | Core          |
| `qtype-decorator.md`         | Core Concepts         | Core          |
| `tc39-decorators.md`         | Core Concepts         | Core          |
| `transformers.md`            | Core Concepts         | Core          |
| `serialization.md`           | Core Concepts         | Core          |
| `aliases.md`                 | Core Concepts         | Core          |
| `qalias.md`                  | Advanced              | Core          |
| `validation.md`              | Advanced              | Validation    |
| `validators.md`              | Advanced              | Validation    |
| `forms.md`                   | Advanced              | Forms         |
| `qfield.md`                  | Advanced              | Forms         |
| `formdata.md`                | _(fuera del sidebar)_ | Forms         |
| `mocks.md`                   | Advanced              | Mocks         |
| `custom-transformers.md`     | Advanced              | Customization |
| `nested-models.md`           | Advanced              | Customization |
| `dot-notation.md`            | Advanced              | Customization |
| `unknown-property-policy.md` | Advanced              | Customization |
| `bundle-size.md`             | Advanced              | Performance   |
| `troubleshooting.md`         | Advanced              | Reference     |

---

## 3. Paso 1 — Código exacto del nuevo sidebar en `config.ts`

### Bloque EN — reemplaza el actual `/en/guide/`

```typescript
'/en/guide/': [
    {
        text: 'Introduction',
        items: [
            { text: 'Getting Started', link: '/en/guide/getting-started' },
            { text: 'Installation',    link: '/en/guide/installation' },
            { text: 'Quick Start',     link: '/en/guide/quick-start' },
        ],
    },
    {
        text: 'Core',
        items: [
            { text: 'QModel',                link: '/en/guide/qmodel' },
            { text: 'IQImplements Helper',   link: '/en/guide/iq-implements' },
            { text: '@Quick Decorator',      link: '/en/guide/quick-decorator' },
            { text: '@QType Decorator',      link: '/en/guide/qtype-decorator' },
            { text: 'TC39 Decorators',       link: '/en/guide/tc39-decorators' },
            { text: 'Transformers',          link: '/en/guide/transformers' },
            { text: 'Serialization',         link: '/en/guide/serialization' },
            { text: 'Aliases Reference',     link: '/en/guide/aliases' },
            { text: 'Key Aliases (@QAlias)', link: '/en/guide/qalias' },
        ],
    },
    {
        text: 'Validation',
        items: [
            { text: 'Validation (@QRule)',  link: '/en/guide/validation' },
            { text: 'Built-in Validators', link: '/en/guide/validators' },
        ],
    },
    {
        text: 'Forms',
        items: [
            { text: 'Form Validation (/forms)', link: '/en/guide/forms' },
            { text: 'Form Schema (@QField)',    link: '/en/guide/qfield' },
            { text: 'FormData & Streaming',     link: '/en/guide/formdata' },
        ],
    },
    {
        text: 'Mocks',
        items: [
            { text: 'Mock Generation', link: '/en/guide/mocks' },
        ],
    },
    {
        text: 'Customization',
        items: [
            { text: 'Custom Transformers',     link: '/en/guide/custom-transformers' },
            { text: 'Nested Models',           link: '/en/guide/nested-models' },
            { text: 'Dot Notation',            link: '/en/guide/dot-notation' },
            { text: 'Unknown Property Policy', link: '/en/guide/unknown-property-policy' },
        ],
    },
    {
        text: 'Performance',
        items: [
            { text: 'Bundle Size & Tree-shaking', link: '/en/guide/bundle-size' },
        ],
    },
    {
        text: 'Reference',
        items: [
            { text: 'Troubleshooting', link: '/en/guide/troubleshooting' },
        ],
    },
],
```

### Bloque ES — reemplaza el actual `/es/guide/`

```typescript
'/es/guide/': [
    {
        text: 'Introducción',
        items: [
            { text: 'Comenzando',    link: '/es/guide/getting-started' },
            { text: 'Instalación',   link: '/es/guide/installation' },
            { text: 'Inicio Rápido', link: '/es/guide/quick-start' },
        ],
    },
    {
        text: 'Núcleo',
        items: [
            { text: 'QModel',                   link: '/es/guide/qmodel' },
            { text: 'Ayuda de IQImplements',    link: '/es/guide/iq-implements' },
            { text: 'Decorador @Quick',         link: '/es/guide/quick-decorator' },
            { text: 'Decorador @QType',         link: '/es/guide/qtype-decorator' },
            { text: 'Decoradores TC39',         link: '/es/guide/tc39-decorators' },
            { text: 'Transformadores',          link: '/es/guide/transformers' },
            { text: 'Serialización',            link: '/es/guide/serialization' },
            { text: 'Referencia de Alias',      link: '/es/guide/aliases' },
            { text: 'Alias de Claves (@QAlias)',link: '/es/guide/qalias' },
        ],
    },
    {
        text: 'Validación',
        items: [
            { text: 'Validación (@QRule)',    link: '/es/guide/validation' },
            { text: 'Validadores Integrados', link: '/es/guide/validators' },
        ],
    },
    {
        text: 'Formularios',
        items: [
            { text: 'Validación de Formularios (/forms)', link: '/es/guide/forms' },
            { text: 'Esquema de Formulario (@QField)',    link: '/es/guide/qfield' },
            { text: 'FormData y Streaming',              link: '/es/guide/formdata' },
        ],
    },
    {
        text: 'Mocks',
        items: [
            { text: 'Generación de Mocks', link: '/es/guide/mocks' },
        ],
    },
    {
        text: 'Personalización',
        items: [
            { text: 'Transformadores Personalizados',       link: '/es/guide/custom-transformers' },
            { text: 'Modelos Anidados',                     link: '/es/guide/nested-models' },
            { text: 'Notación por Puntos',                  link: '/es/guide/dot-notation' },
            { text: 'Política de Propiedades Desconocidas', link: '/es/guide/unknown-property-policy' },
        ],
    },
    {
        text: 'Rendimiento',
        items: [
            { text: 'Tamaño de Bundle y Tree-shaking', link: '/es/guide/bundle-size' },
        ],
    },
    {
        text: 'Referencia',
        items: [
            { text: 'Solución de Problemas', link: '/es/guide/troubleshooting' },
        ],
    },
],
```

---

## 4. Paso 2 — Refactor del componente `BenchmarkChart`

### 4.1 Tipos (añadir en `BenchmarkChart.ts` antes de la función)

```typescript
type ITab = 'features' | 'coverage' | 'performance';

export interface IBenchmarkChartProps {
	/** Whitelist de scenario keys. undefined = mostrar todos. */
	onlyScenarios?: string[];
	/** Whitelist de nombres de librerías. undefined = mostrar todas. */
	onlyLibs?: string[];
	/** Whitelist de tabs visibles. undefined = mostrar los tres. */
	onlyTabs?: ITab[];
	/** Tab activo inicial. Default: primer tab de onlyTabs o 'features'. */
	defaultTab?: ITab;
}
```

### 4.2 Cambio en `BenchmarkChart.vue`

Añadir `defineProps` y pasar props al composable. El template (`BenchmarkChart.html`) y los estilos (`BenchmarkChart.scss`) **no se tocan**:

```vue
<script setup lang="ts">
import { useBenchmarkChart } from './BenchmarkChart';
import type { IBenchmarkChartProps } from './BenchmarkChart';

const props = withDefaults(defineProps<IBenchmarkChartProps>(), {
	onlyScenarios: undefined,
	onlyLibs: undefined,
	onlyTabs: undefined,
	defaultTab: undefined,
});

const {
	/* ... todo igual que antes ... */
} = useBenchmarkChart(props);
</script>

<template src="./BenchmarkChart.html"></template>
<style lang="scss" src="./BenchmarkChart.scss" scoped />
```

### 4.3 Cambios en el composable `useBenchmarkChart`

**A) Firma — aceptar props opcionales:**

```typescript
// Antes:
export function useBenchmarkChart() {

// Después:
export function useBenchmarkChart(props?: IBenchmarkChartProps) {
```

**B) `TAB_ORDER` y `activeTab` inicial — filtrar según `onlyTabs`:**

```typescript
// Antes:
const TAB_ORDER = ['features', 'coverage', 'performance'] as const;
type ITab = (typeof TAB_ORDER)[number];
const activeTab = ref<ITab>('features');

// Después:
const TAB_ORDER_FULL = ['features', 'coverage', 'performance'] as const;
const TAB_ORDER = computed(() =>
	props?.onlyTabs
		? (TAB_ORDER_FULL.filter((tab) =>
				(props.onlyTabs as string[]).includes(tab)
			) as ITab[])
		: ([...TAB_ORDER_FULL] as ITab[])
);
const activeTab = ref<ITab>(
	props?.defaultTab ?? props?.onlyTabs?.[0] ?? 'features'
);
```

**C) Escenarios base — filtrar según `onlyScenarios`:**

```typescript
// Añadir justo después de la importación de `scenarios` desde las constantes:
const baseScenarios = computed(() =>
	props?.onlyScenarios
		? scenarios.filter((scn) => props.onlyScenarios!.includes(scn.key))
		: scenarios
);
```

Luego sustituir todos los usos directos de `scenarios` (que no sean la exportación del return) por `baseScenarios.value`.

**D) Librerías base — filtrar según `onlyLibs`:**

```typescript
// Añadir junto al punto anterior:
const baseLibNames = computed(() =>
	props?.onlyLibs
		? libNames.filter((lib) => props.onlyLibs!.includes(lib))
		: libNames
);
```

Luego sustituir todos los usos directos de `libNames` (que no sean la exportación del return) por `baseLibNames.value`.

**Sin cambios en:**

- `BenchmarkChart.html` — template
- `BenchmarkChart.scss` — estilos
- `useBenchmarkScale.ts`, `useBenchmarkFormatters.ts`, `useBenchmarkInteractions.ts`

**Compatibilidad:** `<BenchmarkChart />` sin props = comportamiento 100% idéntico al actual.

---

## 5. Paso 3 — Mini-charts embebidos en páginas existentes

Cada página recibe un bloque al **final del documento** con el título correspondiente y el componente filtrado. Se aplica tanto en `en/guide/` como en `es/guide/`.

### Tabla completa de filtros por página

| Página             | `only-scenarios`                                                      | `only-libs`                                               | `only-tabs`            | `default-tab` |
| ------------------ | --------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------- | ------------- |
| `validation.md`    | `validation`, `rules`, `asyncRules`, `validationReport`               | QuickModel, class-validator, vest, joi, yup, Zod, valibot | `performance`          | `performance` |
| `validators.md`    | `validation`, `validationReport`                                      | QuickModel, class-validator, vest, joi, yup, Zod, valibot | `performance`          | `performance` |
| `serialization.md` | `serialization`, `coercion`, `typeSerialization`, `schemaMultiFormat` | QuickModel, superjson, class-transformer, Plain JS        | `performance`          | `performance` |
| `transformers.md`  | `coercion`, `typeSerialization`                                       | QuickModel, superjson, class-transformer, Plain JS        | `performance`          | `performance` |
| `mocks.md`         | `mocks`                                                               | QuickModel, faker (manual)                                | `performance`          | `performance` |
| `forms.md`         | `rules`, `asyncRules`, `validationReport`                             | QuickModel, class-validator, vest, joi, yup               | `performance`          | `performance` |
| `qmodel.md`        | `batch`, `isDirty`, `bulkConstruct`                                   | QuickModel, Plain JS, Immer                               | `performance`          | `performance` |
| `nested-models.md` | `nestedConstruct`                                                     | QuickModel, class-transformer, Plain JS                   | `performance`          | `performance` |
| `qalias.md`        | `aliasMapping`                                                        | QuickModel, class-transformer, Plain JS                   | `performance`          | `performance` |
| `bundle-size.md`   | _(sin filtro)_                                                        | _(sin filtro)_                                            | `features`, `coverage` | `features`    |

### Bloque a insertar — páginas de rendimiento (ejemplo `validation.md` EN)

```md
## Performance

<BenchmarkChart
  :only-scenarios="['validation', 'rules', 'asyncRules', 'validationReport']"
  :only-libs="['QuickModel', 'class-validator', 'vest', 'joi', 'yup', 'Zod', 'valibot']"
  :only-tabs="['performance']"
  default-tab="performance"
/>
```

### Bloque especial para `bundle-size.md` (features + coverage, sin barra de rendimiento)

```md
## Feature & Coverage Comparison

<BenchmarkChart
  :only-tabs="['features', 'coverage']"
  default-tab="features"
/>
```

```md
<!-- ES: bundle-size.md -->

## Comparativa de características

<BenchmarkChart
  :only-tabs="['features', 'coverage']"
  default-tab="features"
/>
```

---

## 6. Inventario completo de escenarios

| Scenario key        | benchNum        | Páginas donde se incrusta              |
| ------------------- | --------------- | -------------------------------------- |
| `validation`        | 1               | validation.md, validators.md           |
| `coercion`          | 2               | serialization.md, transformers.md      |
| `serialization`     | 3               | serialization.md                       |
| `batch`             | 4               | qmodel.md                              |
| `mocks`             | 5               | mocks.md                               |
| `typeSerialization` | 7               | serialization.md, transformers.md      |
| `rules`             | 8               | validation.md, forms.md                |
| `aliasMapping`      | 9               | qalias.md                              |
| `isDirty`           | 10              | qmodel.md                              |
| `nestedConstruct`   | 11              | nested-models.md                       |
| `asyncRules`        | 12              | validation.md, forms.md                |
| `validationReport`  | 13              | validation.md, validators.md, forms.md |
| `schemaMultiFormat` | 14              | serialization.md                       |
| `bulkConstruct`     | _(en registry)_ | qmodel.md                              |

---

## 7. Resumen de archivos afectados

### Modificaciones en el componente

| Archivo                                                                  | Qué cambia                                                                          |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `docs-vitepress/.vitepress/components/BenchmarkChart/BenchmarkChart.vue` | Añadir `defineProps<IBenchmarkChartProps>` + pasar props al composable              |
| `docs-vitepress/.vitepress/components/BenchmarkChart/BenchmarkChart.ts`  | Tipos `IBenchmarkChartProps`, firma, filtrado de `TAB_ORDER`/`scenarios`/`libNames` |

### Modificaciones en la configuración

| Archivo                               | Qué cambia                                                 |
| ------------------------------------- | ---------------------------------------------------------- |
| `docs-vitepress/.vitepress/config.ts` | Reemplazar bloques `/en/guide/` y `/es/guide/` del sidebar |

### Modificaciones en páginas (bloque al final de cada una, EN + ES)

| Página (EN)                 | Página (ES)                 | Bloque añadido                                                        |
| --------------------------- | --------------------------- | --------------------------------------------------------------------- |
| `en/guide/validation.md`    | `es/guide/validation.md`    | Mini-chart validation+rules+asyncRules+validationReport               |
| `en/guide/validators.md`    | `es/guide/validators.md`    | Mini-chart validation+validationReport                                |
| `en/guide/serialization.md` | `es/guide/serialization.md` | Mini-chart serialization+coercion+typeSerialization+schemaMultiFormat |
| `en/guide/transformers.md`  | `es/guide/transformers.md`  | Mini-chart coercion+typeSerialization                                 |
| `en/guide/mocks.md`         | `es/guide/mocks.md`         | Mini-chart mocks                                                      |
| `en/guide/forms.md`         | `es/guide/forms.md`         | Mini-chart rules+asyncRules+validationReport                          |
| `en/guide/qmodel.md`        | `es/guide/qmodel.md`        | Mini-chart batch+isDirty+bulkConstruct                                |
| `en/guide/nested-models.md` | `es/guide/nested-models.md` | Mini-chart nestedConstruct                                            |
| `en/guide/qalias.md`        | `es/guide/qalias.md`        | Mini-chart aliasMapping                                               |
| `en/guide/bundle-size.md`   | `es/guide/bundle-size.md`   | Chart features+coverage (sin performance)                             |

### Sin archivos nuevos

### Sin cambios de rutas — todos los `.md` permanecen en su carpeta actual

---

## 8. Plan de ejecución

| Paso | Archivo(s)                                 | Descripción                                                |
| ---- | ------------------------------------------ | ---------------------------------------------------------- |
| 1    | `config.ts`                                | Reemplazar bloques `/en/guide/` y `/es/guide/` del sidebar |
| 2    | `BenchmarkChart.vue` + `BenchmarkChart.ts` | Añadir tipos, props y lógica de filtrado                   |
| 3    | 10 páginas EN + 10 páginas ES              | Insertar bloque de mini-chart al final de cada página      |

---

## 9. Decisiones tomadas

| Decisión                        | Opción elegida   | Motivo                                                            |
| ------------------------------- | ---------------- | ----------------------------------------------------------------- |
| `@QAlias` sección               | **Core**         | Es mapeo de claves en serialización; `aliases.md` ya está en Core |
| `formdata.md` en sidebar        | **Sí, en Forms** | Contenido completo (327 líneas); solo faltaba estar en el sidebar |
| Páginas dedicadas a benchmarks  | **No**           | Los benchmarks van embebidos en cada página de utilidad           |
| `<BenchmarkChart />` en landing | **Sin cambios**  | Sin props = comportamiento actual                                 |
