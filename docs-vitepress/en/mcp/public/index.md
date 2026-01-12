# Public MCP Tools

These tools are designed to help developers **use** QuickModel effectively in their applications.

## Model Creation & Validation

### `create_model`

Generates a complete TypeScript class definition for a `QModel` from a simple description.

- **Usage**: "Create a User model with name, email, and age."
- **Output**: A fully decorated class using `@Quick` and `@QType`.

### `validate_usage`

Analyzes a snippet of code checking for common QuickModel usage errors.

- **Usage**: "Check if this model definition is correct: [code]"
- **Checks**: Missing `declare` keyword, incorrect decorator usage, type mismatches.

## Data Simulation

### `simulate_transformation`

Simulates how `QuickModel` will transform a raw JSON object into a model instance without running code.

- **Usage**: "What happens if I pass `{ "date": "invalid" }` to this model?"
- **Output**: JSON showing the transformed values (e.g., `Date` object or `null`).

### `generate_mock`

Generates valid mock data examples for a given schema.

- **Usage**: "Generate 5 mock users with name and email."
- **Output**: JSON array of mock objects.

## Inspection & Utilities

### `inspect_model`

Analyzes a QuickModel class structure and lists its transformers and configuration.

- **Usage**: "Explain structure of this class."
- **Output**: Summary of fields and applied transformers.

### `list_transformers`

Lists all available data transformers registered in the system.

- **Usage**: "What types can I use in QuickModel?"
- **Output**: List of strings like `string`, `date`, `email`, `currency`.
