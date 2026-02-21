/**
 * CommitLint configuration for QuickModel.
 * Enforces Conventional Commits format.
 *
 * @see .github/COMMIT_CONVENTIONS.md for full documentation
 */

export default {
	extends: ['@commitlint/config-conventional'],

	rules: {
		// Types allowed (mirrors COMMIT_CONVENTIONS.md)
		'type-enum': [
			2,
			'always',
			[
				'feat', // New feature → MINOR bump
				'fix', // Bug fix → PATCH bump
				'perf', // Performance improvement → PATCH bump
				'refactor', // Code refactoring → no bump
				'docs', // Documentation only → no bump
				'style', // Formatting, no code change → no bump
				'test', // Adding/modifying tests → no bump
				'chore', // Maintenance tasks → no bump
				'ci', // CI/CD changes → no bump
				'build', // Build system changes → no bump
			],
		],

		// Scopes are optional but must match known values if used
		'scope-enum': [
			1, // warn (not error) — allows omitting scope freely
			'always',
			[
				'transformers', // Transformer classes
				'decorators', // @Quick or @QType decorators
				'services', // Serializer/deserializer/mock services
				'core', // Core QModel class
				'mcp', // MCP server and tools
				'tests', // Test files
				'docs', // Documentation
				'build', // Build configuration
				'deps', // Dependency updates
				'errors', // Error classes
				'types', // Type definitions
			],
		],

		// Subject rules
		'subject-empty': [2, 'never'],
		'subject-full-stop': [2, 'never', '.'],
		'subject-max-length': [0], // Disabled: no arbitrary length limit
		'subject-min-length': [0], // Disabled
		'subject-case': [0], // Disabled: allows acronyms (URL, BigInt, etc.)

		// Type must be lowercase
		'type-case': [2, 'always', 'lower-case'],
		'type-empty': [2, 'never'],

		// Header max length disabled — descriptive messages are welcome
		'header-max-length': [0],
	},
};
