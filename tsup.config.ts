import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  outDir: 'dist',
  external: ['reflect-metadata'],
  // Soporte para path aliases (@/*)
  esbuildOptions(options) {
    options.alias = {
      '@': './src'
    };
  }
});
