# Guía de Instalación y Uso del Paquete

## 📦 Preparación del Paquete

### 1. Instalar Dependencias

```bash
cd pruebas
bun install
```

### 2. Compilar el Paquete

```bash
# Compilar para producción
bun run build

# Desarrollo con watch mode
bun run dev

# Verificar tipos
bun run typecheck
```

Esto generará la carpeta `dist/` con:

- Archivos CommonJS (.js)
- Archivos ES Modules (.mjs)
- Definiciones TypeScript (.d.ts)
- Source maps

### 3. Verificar el Build

```bash
# Ver contenido de dist/
ls -la dist/

# Debe contener:
# - index.js, index.mjs, index.d.ts
# - transformers/
# - core/
# - source maps
```

## 🚀 Uso en Otros Proyectos

### Opción 1: Instalación Local (Recomendado para desarrollo)

```bash
# En el proyecto que quiere usar el paquete
cd /path/to/your-project

# Instalar desde ruta local
npm install /home/cartago/_projects/games/deathblitz/pruebas

# O con link simbólico (para desarrollo activo)
npm link /home/cartago/_projects/games/deathblitz/pruebas
```

### Opción 2: package.json con file:

```json
{
  "dependencies": {
    "@cartago-git/quickmodel": "file:../deathblitz/pruebas"
  }
}
```

Luego:

```bash
npm install
```

### Opción 3: Publicar a npm (Producción)

```bash
cd pruebas

# Login a npm (solo primera vez)
npm login

# Publicar como paquete público
npm publish --access public --access public

# O publicar como paquete privado
npm publish
```

Luego en otros proyectos:

```bash
npm install @cartago-git/quickmodel
```

### Opción 4: GitHub como Registry

```bash
# En package.json del proyecto
{
  "dependencies": {
    "@cartago-git/quickmodel": "github:CartagoGit/quickmodel#main"
  }
}
```

## 💻 Uso en tu Proyecto

### 1. Configurar TypeScript

En tu proyecto, asegúrate de tener estos settings en `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false
  }
}
```

### 2. Importar y Usar

```typescript
import { QuickModel, Field, QuickType, BigIntField } from '@cartago-git/quickmodel';
import 'reflect-metadata'; // Importante: importar al inicio de tu app

interface IUser {
  id: string;
  name: string;
  balance: string;
  createdAt: string;
}

type UserTransforms = {
  balance: bigint;
  createdAt: Date;
};

class User extends QuickModel<IUser> implements QuickType<IUser, UserTransforms> {
  @Field() id!: string;
  @Field() name!: string;
  @Field(BigIntField) balance!: bigint;
  @Field() createdAt!: Date;
}

// Usar
const user = new User({
  id: '1',
  name: 'John',
  balance: '999999',
  createdAt: '2024-01-01T00:00:00.000Z',
});

console.log(user.balance); // bigint
const json = user.toJSON();
const user2 = User.fromJSON(json);
```

### 3. Importaciones Específicas

```typescript
// Solo transformers
import { BigIntField, RegExpField } from '@cartago-git/quickmodel/transformers';

// Solo core
import { transformerRegistry, ITransformer } from '@cartago-git/quickmodel/core';
```

## 🔧 Desarrollo del Paquete

### Estructura de Archivos

```
pruebas/
├── package.json           # Configuración del paquete npm
├── tsconfig.json          # Configuración TypeScript
├── tsup.config.ts         # Configuración del bundler
├── index.ts               # Punto de entrada principal
├── .npmignore             # Archivos excluidos de npm
├── .gitignore             # Archivos excluidos de git
├── LICENSE                # Licencia MIT
├── PACKAGE-README.md      # README para npm
│
├── dist/                  # Build output (generado)
│   ├── index.js           # CommonJS
│   ├── index.mjs          # ES Module
│   ├── index.d.ts         # TypeScript definitions
│   └── ...
│
├── core/                  # Código fuente
├── transformers/
└── models/
```

### Scripts Disponibles

```bash
# Desarrollo
bun run dev              # Watch mode

# Build
bun run build            # Compilar para producción
bun run clean            # Limpiar dist/

# Testing
bun test                 # Tests con Bun
bun run test:all         # Ejecutar todos los tests

# Validación
bun run typecheck        # Verificar tipos sin compilar

# Publicación
bun run prepublishOnly   # Se ejecuta automáticamente antes de npm publish
```

## 📝 Actualizar el Paquete

### Versionado (Semantic Versioning)

```bash
# Patch: 1.0.0 -> 1.0.1 (bug fixes)
npm version patch

# Minor: 1.0.0 -> 1.1.0 (nuevas features)
npm version minor

# Major: 1.0.0 -> 2.0.0 (breaking changes)
npm version major

# Luego publicar
npm publish
```

### En Proyectos que Usan el Paquete

```bash
# Si usas instalación local
cd /path/to/your-project
npm update @cartago-git/quickmodel

# Si está publicado en npm
npm update @cartago-git/quickmodel

# O reinstalar
npm install @cartago-git/quickmodel@latest
```

## 🔍 Verificar el Paquete

### Antes de Publicar

```bash
# Ver qué archivos se incluirán en el paquete
npm pack --dry-run

# Crear tarball local para probar
npm pack

# Esto crea: deathblitz-solid-models-1.0.0.tgz
# Instalar en otro proyecto para probar:
npm install /path/to/deathblitz-solid-models-1.0.0.tgz
```

### Verificar Exports

```bash
# Ver exports del paquete
node -p "require('@cartago-git/quickmodel')"

# Ver tipos
node -p "require('@cartago-git/quickmodel/transformers')"
```

## 📦 Ejemplo Completo: Mover a Otro Proyecto

```bash
# 1. Compilar el paquete
cd /home/cartago/_projects/games/deathblitz/pruebas
bun install
bun run build

# 2. Copiar a otro proyecto (opción simple)
cp -r /home/cartago/_projects/games/deathblitz/pruebas /path/to/other-project/packages/solid-models

# 3. O crear link simbólico
cd /path/to/other-project
mkdir -p packages
ln -s /home/cartago/_projects/games/deathblitz/pruebas packages/solid-models

# 4. Instalar en el proyecto
cd /path/to/other-project
npm install ./packages/solid-models

# 5. Usar
# Ver ejemplo arriba en "Uso en tu Proyecto"
```

## ⚠️ Requisitos

- **Node.js**: >= 18.0.0
- **TypeScript**: >= 5.0.0
- **Decoradores**: Habilitados en tsconfig.json
- **reflect-metadata**: Instalado (dependencia automática)

## 🐛 Troubleshooting

### Error: "Decorators are not enabled"

Solución: Agregar a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### Error: "Cannot find module '@cartago-git/quickmodel'"

Solución:

1. Verificar que el paquete está en `node_modules/`
2. Ejecutar `npm install`
3. Verificar ruta en `package.json`

### Build falla

Solución:

```bash
# Limpiar y rebuildar
bun run clean
bun run build

# Verificar tipos
bun run typecheck
```

## 📚 Recursos

- [README Principal](./README.md)
- [Arquitectura SOLID](./SOLID-ARCHITECTURE.md)
- [Ejemplos de Modelos](./models/examples/)
- [npm docs](https://docs.npmjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
