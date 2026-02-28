/**
 * Centralized re-export of `zod` for the MCP layer.
 *
 * **Purpose:** All `src/mcp/**` files import `z` from here instead of importing
 * directly from `'zod'`. This creates a single seam: if zod ever changes its
 * export shape, sub-package name, or import path, only THIS file needs to change
 * and all ~45 MCP files remain untouched.
 *
 * **Why not lazy-load like ZodSchemaGenerator does?**
 * The MCP server itself is a runtime CLI process, not a library bundle — tree-shaking
 * and bundle size are irrelevant here. The static import is intentional and gives
 * full TypeScript inference to all tools and prompts at compile time.
 *
 * @module
 * @see {@link QAbstractTool} — base class for all tools that import `z` from this module
 * @see {@link ZodSchemaGenerator} — the library-side zod consumer that lazy-loads instead
 */

export { z } from 'zod';
