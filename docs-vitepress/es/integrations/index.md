# Integraciones

QuickModel se integra de forma transparente con los frameworks y librerías más populares del ecosistema TypeScript/JavaScript.

## Frameworks Frontend

### [Angular](/es/integrations/angular-integration)

Integración con Angular usando servicios, interceptores HTTP y formularios reactivos.

### [React / Next.js](/es/integrations/react-integration)

Modelos con React hooks, Server Components y gestión automática de transformaciones.

### [Svelte 5 / SvelteKit](/es/integrations/svelte-integration)

Integración con el sistema de reactividad de Svelte 5 y rutas de SvelteKit.

### [Vue 3 / Nuxt](/es/integrations/vue-integration)

Composables reactivos, Pinia stores y rutas de servidor con Nuxt.

## Backend

### [Express / Fastify / Hono](/es/integrations/backend-integration)

Validación y transformación de DTOs en APIs REST con los frameworks de Node.js más populares.

### [Bun.js](/es/integrations/bun-integration)

Handler HTTP nativo con `Bun.serve`, soporte WebSocket y carga masiva con `Bun.file()` + DTOs de QuickModel.

### [NestJS](/es/integrations/nestjs-integration)

Integración con el sistema de módulos de NestJS, pipes de validación y guards.

### [tRPC](/es/integrations/trpc-integration)

Type-safety de extremo a extremo con tRPC usando QuickModel como capa de serialización.

### [GraphQL / Apollo Server](/es/integrations/graphql-integration)

Resolvers de GraphQL con transformación automática de tipos complejos.

## ORM y Bases de Datos

### [Prisma ORM](/es/integrations/prisma-integration)

Mapeo entre modelos de Prisma y QModel con transformaciones automáticas.

### [TypeORM](/es/integrations/typeorm-integration)

Entidades de TypeORM como QModels con soporte para relaciones y herencia.

### [Mongoose](/es/integrations/mongoose-integration)

Schemas de Mongoose con serialización de tipos complejos (Map, Set, Date).

## Gestión de Estado y Formularios

### [Redux Toolkit (RTK)](/es/integrations/redux-toolkit-integration)

Slices de Redux con QuickModel en reducers, thunks y RTK Query.

### [Zustand](/es/integrations/zustand-integration)

Stores de Zustand con modelos tipados y persistencia automática.

### [React Hook Form](/es/integrations/react-hook-form-integration)

Validación de formularios con `@QRule` integrado en React Hook Form.

### [Formik](/es/integrations/formik-integration)

Uso de QuickModel como validador y transformador de datos en formularios Formik.

## Testing y Herramientas

### [MSW (Mock Service Worker)](/es/integrations/msw-integration)

Interceptación de peticiones HTTP en tests con modelos realistas generados por QuickModel.

### [Matchers Personalizados para Vitest](/es/integrations/vitest-matchers)

Matchers de Vitest específicos para validar instancias de QModel en tests.

### [Jest Integration](/es/integrations/jest-integration)

Uso de `quickmodelMatchers` con Jest mediante `expect.extend()` — sin adaptadores adicionales.

### [Otros Test Runners (Mocha/Chai, Node:test, AVA)](/es/integrations/test-runners-integration)

Integración de los matchers de QuickModel con Mocha + Chai, Node:test y AVA.

### [TanStack Query](/es/integrations/tanstack-query-integration)

Queries y mutaciones con transformación automática de respuestas de API.

### [OpenAPI / Swagger](/es/integrations/openapi-integration)

Generación de schemas OpenAPI desde modelos QuickModel.

## Formatos de Schema

### [JSON Schema](/es/integrations/json-schema-integration)

Exporta cualquier QModel como JSON Schema (Draft 7) con `getSchema('json')`, cárgalo en AJV, genera documentos OpenAPI, o genera scaffolding de una clase QModel desde un JSON Schema existente con `fromSchema('json', ...)`.

### [Interfaz TypeScript](/es/integrations/typescript-schema-integration)

Exporta cualquier QModel como un string de interfaz TypeScript con `getSchema('typescript')`, comparte contratos entre paquetes, genera clases QModel desde interfaces existentes con `fromSchema('typescript', ...)`, o genera archivos de declaración `.d.ts`.

## Librerías de Validación

### [Zod](/es/integrations/zod-integration)

Uso de Zod junto con QuickModel: validar input crudo con Zod, coercionar y serializar con QModel, y generar scaffolding de clases desde schemas Zod.

### [Valibot](/es/integrations/valibot-integration)

Validación ligera con Valibot junto con coerción y serialización de QModel, más `getSchema('valibot')` para exportar schemas.

### [Yup](/es/integrations/yup-integration)

Schemas Yup encadenables para validación, QModel para coerción y serialización, más `getSchema('yup')` para exportar schemas.

### [AJV](/es/integrations/ajv-integration)

Validación JSON Schema con AJV y coerción con QModel. Bidireccional: `getSchema('ajv')` exporta schemas AJV activos, `fromSchema('ajv', ...)` genera clases QModel desde schemas existentes.

### [TypeBox](/es/integrations/typebox-integration)

Schemas TypeBox para tipos estáticos y validación en runtime, QModel para coerción y serialización, más `getSchema('typebox')` para exportar schemas.

### [Effect Schema](/es/integrations/effect-schema-integration)

Effect Schema para parseo y encoding declarativo en backends basados en Effect, QModel para coerción y validación de reglas de negocio, más `getSchema('effect-schema')` para exportar schemas.

## Otras Integraciones

### [Mobile (React Native / Capacitor)](/es/integrations/mobile-integration)

Uso de QuickModel en aplicaciones móviles con React Native y Capacitor.

### [Storage & Persistence](/es/integrations/storage-integration)

Persistencia en localStorage, sessionStorage e IndexedDB con serialización automática.

### [Electron IPC](/es/integrations/electron-integration)

Comunicación entre procesos de Electron usando QuickModel para serialización segura.

### [WebSocket y Sockets en Tiempo Real](/es/integrations/websocket-integration)

Integración con WebSocket nativo, Socket.IO, SSE, uWebSockets.js y STOMP con serialización de mensajes tipada y seguridad.

## Enlaces Rápidos

- [Instalación](/es/guide/installation) - Comenzar con QuickModel
- [Transformadores](/es/guide/transformers) - Tipos soportados nativamente
- [Validación](/es/guide/validation) - Reglas de negocio con `@QRule`
- [Referencia API](/tsdoc/) - Documentación completa
