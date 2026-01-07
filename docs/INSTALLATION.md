# Installation and Usage Guide

## 📦 Package Preparation

### 1. Install Dependencies

```bash
cd pruebas
bun install
```

### 2. Compile the Package

```bash
# Compile for production
bun run build

# Development with watch mode
bun run dev

# Verify types
bun run typecheck
```

This will generate the `dist/` folder with:

- Archivos CommonJS (.js)
- Archivos ES Modules (.mjs)
- Definiciones TypeScript (.d.ts)
- Source maps

### 3. Verify the Build

```bash
# Ver contenido de dist/
ls -la dist/

# Should contain:
# - index.js, index.mjs, index.d.ts
# - transformers/
# - core/
# - source maps
```

## 🚀 Usage in Other Projects

### Option 1: Local Installation (Recommended for development)

```bash
# In the project that wants to use the package
cd /path/to/your-project

# Install from local path
npm install /home/cartago/_projects/games/deathblitz/pruebas

# Or with symbolic link (for active development)
npm link /home/cartago/_projects/games/deathblitz/pruebas
```

### Option 2: package.json with file:

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

### Option 3: Publish to npm (Production)

```bash
cd pruebas

# Login to npm (only first time)
npm login

# Publish as public package
npm publish --access public --access public

# Or publish as private package
npm publish
```

Then in other projects:

```bash
npm install @cartago-git/quickmodel
```

### Option 4: GitHub as Registry

```bash
# En package.json del proyecto
{
  "dependencies": {
    "@cartago-git/quickmodel": "github:CartagoGit/quickmodel#main"
  }
}
```

## 💻 Usage in Your Project

### 1. Configure TypeScript

In your project, make sure to have these settings in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false
  }
}
```

### 2. Import and Use

```typescript
import { QModel, QType, QBigInt } from '@cartago-git/quickmodel';
import type { QInterface } from '@cartago-git/quickmodel';
import 'reflect-metadata'; // Important: import at the start of your app

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

class User extends QModel<IUser> implements QInterface<IUser, UserTransforms> {
  @QType() id!: string;
  @QType() name!: string;
  @QType(QBigInt) balance!: bigint;
  @QType() createdAt!: Date;
}

// Use
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

### 3. Specific Imports

```typescript
// Only transformers
import { QBigInt, QRegExp } from '@cartago-git/quickmodel/transformers';

// Only core
import { qTransformerRegistry, IQTransformer } from '@cartago-git/quickmodel/core';
```

## 🔧 Package Development

### File Structure

```
pruebas/
├── package.json           # npm package configuration
├── tsconfig.json          # TypeScript configuration
├── tsup.config.ts         # Bundler configuration
├── index.ts               # Main entry point
├── .npmignore             # Files excluded from npm
├── .gitignore             # Files excluded from git
├── LICENSE                # MIT License
├── PACKAGE-README.md      # README for npm
│
├── dist/                  # Build output (generated)
│   ├── index.js           # CommonJS
│   ├── index.mjs          # ES Module
│   ├── index.d.ts         # TypeScript definitions
│   └── ...
│
├── core/                  # Source code
├── transformers/
└── models/
```

### Available Scripts

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
bun run typecheck        # Verify types without compiling

# Publicación
bun run prepublishOnly   # Runs automatically before npm publish
```

## 📝 Update the Package

### Versioning (Semantic Versioning)

```bash
# Patch: 1.0.0 -> 1.0.1 (bug fixes)
npm version patch

# Minor: 1.0.0 -> 1.1.0 (new features)
npm version minor

# Major: 1.0.0 -> 2.0.0 (breaking changes)
npm version major

# Then publish
npm publish
```

### In Projects Using the Package

```bash
# If using local installation
cd /path/to/your-project
npm update @cartago-git/quickmodel

# If published to npm
npm update @cartago-git/quickmodel

# Or reinstall
npm install @cartago-git/quickmodel@latest
```

## 🔍 Verify the Package

### Before Publishing

```bash
# See which files will be included in the package
npm pack --dry-run

# Create local tarball to test
npm pack

# This creates: deathblitz-solid-models-1.0.0.tgz
# Install in another project to test:
npm install /path/to/deathblitz-solid-models-1.0.0.tgz
```

### Verify Exports

```bash
# Ver exports del paquete
node -p "require('@cartago-git/quickmodel')"

# Ver tipos
node -p "require('@cartago-git/quickmodel/transformers')"
```

## 📦 Complete Example: Move to Another Project

```bash
# 1. Compile the package
cd /home/cartago/_projects/games/deathblitz/pruebas
bun install
bun run build

# 2. Copy to another project (simple option)
cp -r /home/cartago/_projects/games/deathblitz/pruebas /path/to/other-project/packages/solid-models

# 3. Or create symbolic link
cd /path/to/other-project
mkdir -p packages
ln -s /home/cartago/_projects/games/deathblitz/pruebas packages/solid-models

# 4. Install in the project
cd /path/to/other-project
npm install ./packages/solid-models

# 5. Use
# See example above in "Usage in Your Project"
```

## ⚠️ Requirements

- **Node.js**: >= 18.0.0
- **TypeScript**: >= 5.0.0
- **Decorators**: Enabled in tsconfig.json
- **reflect-metadata**: Installed (automatic dependency)

## 🐛 Troubleshooting

### Error: "Decorators are not enabled"

Solution: Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### Error: "Cannot find module '@cartago-git/quickmodel'"

Solution:

1. Verify that the package is in `node_modules/`
2. Run `npm install`
3. Verify path in `package.json`

### Build fails

Solution:

```bash
# Clean and rebuild
bun run clean
bun run build

# Verify types
bun run typecheck
```

## 📚 Resources

- [Main README](./README.md)
- [SOLID Architecture](./SOLID-ARCHITECTURE.md)
- [Model Examples](./models/examples/)
- [npm docs](https://docs.npmjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
