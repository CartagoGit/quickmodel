// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import securityPlugin from 'eslint-plugin-security';

export default tseslint.config(
  {
    ignores: [
      "dist/",
      "node_modules/",
      "docs/",
      "docs-vitepress/",
      "coverage/",
      "**/*.js",
      "**/*.mjs",
      "**/*.d.ts",
      "tests/**/mcp/**/*",
      "tsup.config.ts"
    ],
  },
  eslint.configs.recommended,
  securityPlugin.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    rules: {
      'security/detect-object-injection': 'off', // Essential for a reflection/serialization library
      'security/detect-non-literal-fs-filename': 'off', // We validate paths manually in tools
      'security/detect-unsafe-regex': 'warn', // checking manually
    }
  },
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tests/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Manually apply eslint-config-prettier rules (turns off conflicting rules)
      ...prettierConfig.rules,
      
      // Customize typescript-eslint rules
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      "@typescript-eslint/no-non-null-assertion": "off",
      
      // Reflection/serialization libraries require dynamic type access.
      // These rules are intentionally disabled for metadata operations and runtime type transformations.
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-unsafe-enum-comparison": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/no-this-alias": "off",

      // Prettier rule
      // "prettier/prettier": "error",
    },
  }
);
