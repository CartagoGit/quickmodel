/**
 * QuickModel - Advanced Utilities
 *
 * This entry point exports runtime classes and utilities intended for advanced usage,
 * plugins, or custom integrations.
 *
 * @module @cartago-git/quickmodel/advanced
 */

export { MockGenerator } from './core/services/mock-generator.service';
export {
	TransformerRegistry,
	type TransformerKey,
} from './core/registry/transformer.registry';
