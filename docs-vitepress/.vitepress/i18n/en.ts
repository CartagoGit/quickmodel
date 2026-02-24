export const en = {
	mcp: {
		title: 'Model Context Protocol',
		overview: 'Overview',
		publicTools: 'Public Tools',
		publicSkills: 'Public Skills',
		installationMaintainers: 'Installation (Maintainers)',
		internalToolsMaintainers: 'Internal Tools (Maintainers)',
		internalSkillsMaintainers: 'Internal Skills (Maintainers)',
	},
	benchmark: {
		// ─── UI labels ────────────────────────────────────────────
		featureTitle: 'Feature Comparison',
		featureSubtitle: 'QuickModel vs other libraries with similar features',
		matrixTitle: '🎯 Features offered by each library',
		matrixHint: '⚠️ = available with extra manual code',
		typeLabel: 'Type:',
		librariesLabel: 'Libraries:',
		featuresLabel: 'Features:',
		perfTitle: 'Performance Benchmark',
		perfSubtitle: 'Hover the bars to see details',
		scenarioLabel: 'Scenario:',
		muchFaster: 'much faster',
		seeNote: '(see note ↑)',
		notApplicable: 'Not applicable in this scenario',
		slower: 'slower',
		faster: 'faster',
		tooltipIncludes: '✅ Includes',
		tooltipMissing: '❌ Missing',
		coverageTitle: 'Coverage Map — Features & Speed',
		coverageSubtitle:
			'Which libraries support each benchmark scenario. Click a chip to jump to that benchmark.',
		coverageSpeed: 'ops/sec',
		tabFeatures: 'Feature Comparison',
		tabCoverage: 'Coverage Map',
		tabPerf: 'Performance',

		// ─── Scenario labels and notes ────────────────────────────
		scenarios: {
			validation: {
				label: 'Schema Validation (10k)',
				notes: '10k validations — TypeBox compiles to raw JSON Schema checks (fastest), valibot is tree-shakeable, Zod is the most popular, yup is mature. QM adds auto-coercion on top of validation. Plain JS and class-transformer excluded: no schema validation. arktype is fastest TypeScript-native validator. joi is mature but slower.',
			},
			coercion: {
				label: 'Type Coercion (Date + BigInt + Map + Set)',
				notes: '1k objects — auto vs manual coercion. QM: one decorator, zero extra code. Zod/valibot: manual transform per field. class-transformer: only Date via @Type, not BigInt/Map/Set. Plain JS, TypeBox, yup, joi, vest, superjson and arktype cannot do model-level coercion.',
			},
			serialization: {
				label: 'Serialization Roundtrip (type-safe)',
				notes: '1k round-trips. Plain JS (JSON.parse/stringify) is the fastest but loses Date→string, BigInt→error, Map/Set→{}. class-transformer preserves Date only via @Type. superjson preserves Date, BigInt, Set, Map, RegExp and more. QuickModel preserves all types natively — bars for Plain JS and arktype are clipped for readability.',
			},
			batch: {
				label: 'Batch Validation (1k objects)',
				notes: '10 cycles of 1k objects — throughput validation. class-transformer excluded (not a validator — needs class-validator separately). Plain JS excluded (no validation). arktype is fastest native TS validator. joi and vest are focused on form/business logic rules.',
			},
			mocks: {
				label: 'Test Data Generation (100 instances)',
				notes: '100 typed instances per cycle. faker (manual) is raw-faster but requires 10-20 lines of per-model factory code, no type constraints, needs manual maintenance on schema changes. QM is built-in: zero setup, fully typed, respects field constraints automatically. Bar for faker is clipped — it runs at 80k ops/s. arktype, joi, superjson, class-validator and vest have no built-in mock generation.',
			},
			forms: {
				label: 'Business Rules / Forms (5k)',
				notes: '5k validations — class-validator: @IsEmail/@MinLength/@Matches decorators with validateSync(), vest: create() suite with individual test() assertions, joi: schema.validate() with fluent API, QuickModel @QRule: co-located rule decorators + qCheckRules(), native group filtering and async support with timeouts built-in.',
			},
			rules: {
				label: 'Business Rules / @QRule (5k iterations)',
				notes: '5k iterations. QuickModel @QRule: inline co-located decorators, zero external setup. class-validator: @IsEmail/@MinLength/@Matches with validateSync(). joi: schema.validate() with fluent API. vest: new suite per field via create() + test() assertions.',
			},
			typeSerialization: {
				label: 'Type-Safe Serialization Fidelity (1k)',
				notes: '1k iterations — type fidelity. Plain JSON.parse/stringify loses Date→string, BigInt throws, Map/Set→{}. superjson preserves most types. QuickModel preserves Date, BigInt, Map, Set, RegExp natively with zero extra code.',
			},
		},

		// ─── Library descriptions, pros and cons ─────────────────
		libraries: {
			plainJs: {
				desc: 'Raw JavaScript objects — maximum speed, zero safety',
				pros: [
					'Blazing fast (~100% baseline)',
					'Zero dependencies',
					'No overhead at all',
				],
				cons: [
					'No type coercion (Date, BigInt, Map, Set)',
					'No serialization / deserialization',
					'No runtime type integrity',
					'No mock generation',
					'No AI / MCP integration',
					'No model state (copy, isDirty)',
					'No form schemas',
					'No computed fields',
					'No business rules (@QRule)',
				],
			},
			typebox: {
				desc: 'Ultra-fast JSON Schema validation — compiled checks, zero overhead',
				pros: [
					'Fastest validation (~70% of Plain JS) ✅',
					'Compiled JSON Schema checks ✅',
					'Type inference from schemas ✅',
					'Tiny bundle size ✅',
					'JSON Schema export ✅',
				],
				cons: [
					'No type coercion (Date, BigInt, Map, Set)',
					'No serialization / deserialization',
					'No mock generation',
					'No AI / MCP integration',
					'No form schemas or computed fields',
				],
			},
			valibot: {
				desc: 'Modular, tree-shakeable validation — smallest bundle in the ecosystem',
				pros: [
					'Tree-shakeable (tiny bundle) ✅',
					'Fast validation (~32% of Plain JS) ✅',
					'pipe() transforms for type coercion ✅',
					'Type-safe schemas ✅',
				],
				cons: [
					'Coercion requires manual pipe(transform()) per field',
					'No serialization / deserialization',
					'No mock generation',
					'No AI / MCP integration',
					'No model state, form schemas, or computed fields',
				],
			},
			zod: {
				desc: 'Schema validation library — great for validation, not full modeling',
				pros: [
					'Fast validation',
					'Type-safe schemas',
					'Runtime integrity ✅',
					'Large ecosystem',
				],
				cons: [
					'No built-in serialization (needs superjson or similar)',
					'Date/BigInt/Map/Set require manual .transform() per field',
					'No mock generation (needs @faker-js/faker + manual mapping)',
					'No built-in AI / MCP Server',
					'No model state (copy, isDirty, hasIntegrity)',
					'No polymorphic JSON (subclass instantiation)',
					'No form schemas from decorators',
					'No computed fields',
				],
			},
			quickmodel: {
				desc: 'Full TypeScript modeling platform with AI built-in',
				pros: [
					'Auto coercion Date/BigInt/Map/Set ✅',
					'Native serialize() / deserialize() ✅',
					'Typed mock generation built-in ✅',
					'AI/MCP Server built-in ✅',
					'Automatic polymorphic JSON ✅',
					'Model state: copy(), isDirty(), hasIntegrity() ✅',
					'Form schemas: @QField, @QGroup, getFormSchema() ✅',
					'Computed fields: @QComputed ✅',
					'Async business rules: @QRule, checkRulesAsync() ✅',
					'Multi-level inheritance inference ✅',
					'Schema export: JSON / Zod / OpenAPI / GraphQL ✅',
					'Zero-dep core ✅',
				],
				cons: [
					'~4x slower than plain JS for simple primitives',
					'(still <0.1ms per typical API operation — not noticeable in practice)',
				],
			},
			classTransformer: {
				desc: 'Annotation-based class serialization — @Type decorators for Date, not BigInt/Map/Set',
				pros: [
					'instanceToPlain() / plainToInstance() ✅',
					'@Type(() => Date) for Date fields ✅',
					'Polymorphic deserializeation with @Type ✅',
					'Works with existing class definitions ✅',
				],
				cons: [
					'No validation — needs class-validator separately',
					'BigInt, Map, Set require manual @Transform per field',
					'No mock generation',
					'No AI / MCP integration',
					'No form schemas or computed fields',
					'No async business rules',
				],
			},
			yup: {
				desc: 'Schema-based validation with async support — mature but heavy',
				pros: [
					'Async validation support ✅',
					'Mixed schemas (any/lazy) ✅',
					'Large ecosystem / well-known ✅',
				],
				cons: [
					'~20x slower than TypeBox for simple validation',
					'No type coercion for BigInt, Map, Set',
					'No serialization / deserialization',
					'No mock generation',
					'No AI / MCP integration',
					'No form schemas or computed fields',
				],
			},
			fakerManual: {
				desc: '@faker-js/faker — fast random data generation, manual model mapping required',
				pros: [
					'Very fast raw generation (~80k/s) ✅',
					'Huge variety of data types ✅',
					'Well-known, large ecosystem ✅',
				],
				cons: [
					'Must write a manual factory function per model',
					'Factory breaks on every schema change — manual maintenance',
					'No type constraints (min/max, regex, enum) automatically',
					'No model state, validation, or coercion',
					'No relationship between fields (e.g. createdAt < updatedAt)',
				],
			},
			arktype: {
				desc: 'TypeScript-native validator with compile-time inference — blazing fast schema validation',
				pros: [
					'Fastest TypeScript-native validator (5M+ ops/s) ✅',
					'Compile-time type inference from string syntax ✅',
					'Tiny bundle footprint ✅',
					'Expressive syntax: "string | number", "string[]" ✅',
				],
				cons: [
					'No type coercion (Date, BigInt, Map, Set)',
					'No serialization / deserialization',
					'No mock generation',
					'No AI / MCP integration',
					'No model state (copy, isDirty)',
					'No form schemas or computed fields',
					'No async business rules',
				],
			},
			superjson: {
				desc: 'JSON superset that preserves Date, BigInt, Map, Set, RegExp, undefined across serialization',
				pros: [
					'Preserves Date, BigInt, Map, Set, RegExp, undefined ✅',
					'Drop-in replacement for JSON.stringify/parse ✅',
					'Works with any existing class or plain object ✅',
					'Small bundle, well-maintained ✅',
				],
				cons: [
					'No schema validation',
					'No type coercion via decorators',
					'No mock generation',
					'No AI / MCP integration',
					'No model state or computed fields',
					'No form schemas or business rules',
					'Requires superjson on both client and server',
				],
			},
			classValidator: {
				desc: 'Decorator-based validation for TypeScript classes — typically paired with class-transformer',
				pros: [
					'Rich set of built-in decorators (@IsEmail, @MinLength…) ✅',
					'Async validation support ✅',
					'Custom constraint decorators ✅',
					'Works with existing class definitions ✅',
				],
				cons: [
					'No type coercion — needs class-transformer separately',
					'No serialization beyond class-transformer combination',
					'No mock generation',
					'No AI / MCP integration',
					'No model state (copy, isDirty)',
					'No form schemas or computed fields',
				],
			},
			vest: {
				desc: 'Form validation framework inspired by testing suites — groups and async rules for UI forms',
				pros: [
					'Suite/group structure mirrors @QGroup concept ✅',
					'Async rule support ✅',
					'Great DX for form validation scenarios ✅',
					'Framework-agnostic ✅',
				],
				cons: [
					'~130x slower than @QRule for business rules',
					'No schema validation or type coercion',
					'No serialization / deserialization',
					'No mock generation',
					'No AI / MCP integration',
					'No model state or inheritance inference',
				],
			},
			joi: {
				desc: 'Battle-tested schema description and data validator for Node.js — expressive API, mature ecosystem',
				pros: [
					'Very expressive, chainable API ✅',
					'Async validation and custom rules ✅',
					'Conditional validation (.when()) ✅',
					'Large ecosystem / battle-tested ✅',
				],
				cons: [
					'~75x slower than TypeBox for validation',
					'No type coercion for BigInt, Map, Set',
					'No serialization / deserialization',
					'No mock generation',
					'No AI / MCP integration',
					'No model state or computed fields',
					'No decorator-based approach',
				],
			},
		},

		// ─── Feature row labels and per-lib warning notes ─────────
		features: {
			autoCoercion: {
				label: 'Auto coercion',
				notes: {
					valibot: 'Requires manual pipe + transform per field',
					zod: 'Requires z.coerce or .transform() per field',
					classTransformer:
						'Only Date via @Type — no BigInt, Map or Set',
				},
			},
			nativeSerialization: {
				label: 'Native serialization (toJSON)',
				notes: {
					classTransformer:
						'Only Date via @Type — no BigInt, Map, Set or RegExp',
				},
			},
			typedMocks: { label: 'Typed mock generation' },
			aiMcp: { label: 'Built-in AI / MCP Server' },
			polymorphicJson: {
				label: 'Polymorphic JSON',
				notes: {
					classTransformer:
						'Possible with custom discriminator but requires extra boilerplate',
					superjson:
						'Preserves types but requires an already-typed object in memory',
				},
			},
			copyIsDirty: { label: 'copy() / isDirty()' },
			formSchemas: {
				label: 'Form schemas (@QField)',
				notes: {
					vest: 'Suite-based form structure but no decorator integration with model classes',
				},
			},
			computedFields: { label: 'Computed fields (@QComputed)' },
			asyncRules: {
				label: 'Async business rules (@QRule)',
				notes: {
					zod: 'Async refinements supported but not co-located with model definition',
					yup: 'Async .test() supported but defined separately from the model',
					classValidator:
						'Via @ValidateIf + async custom validators; extra dependency required',
					vest: 'External validation suite, not integrated with model class',
					joi: 'External validation suite, not integrated with model class',
				},
			},
			runtimeIntegrity: {
				label: 'Runtime integrity',
				notes: {
					valibot:
						'Possible with manual parse calls, not enforced by the model itself',
					yup: 'Possible with manual .validate() calls, not built into the model lifecycle',
					classValidator:
						'Requires explicit validate() call; not automatic on assignment',
					vest: 'External suite — must be called manually, not bound to model lifecycle',
					joi: 'External suite — must be called manually, not bound to model lifecycle',
				},
			},
			inheritance: { label: 'Multi-level inheritance inference' },
			schemaExport: { label: 'Schema export (JSON/Zod/OpenAPI)' },
			tsInference: { label: 'Compile-time TS inference' },
			treeShakeable: {
				label: 'Tree-shakeable',
				notes: {
					typebox:
						'Most types are tree-shakeable but the internal compiler/runtime is always included',
				},
			},
			decoratorConstraints: {
				label: 'Decorator constraints (@IsEmail…)',
			},
			preservesTypes: { label: 'Preserves RegExp/undefined/NaN' },
			validationGroups: {
				label: 'Validation groups / suites',
				notes: {
					classValidator:
						'Supported via groups option but requires verbose @ValidateIf setup',
				},
			},
		},

		// ─── Filter option labels ─────────────────────────────────
		appTypes: {
			all: 'All contexts',
			api: 'REST API / Backend',
			ddd: 'Domain Modeling / DDD',
			testing: 'Testing',
			mock: 'Mock / Test Data',
			data: 'Data Pipeline',
		},
		matrixTypes: {
			all: 'All libraries',
			validation: 'Validators',
			serialization: 'Serialization',
			forms: 'Forms / Rules',
			mocks: 'Mocks',
		},
		featureCategories: {
			all: 'All features',
			validation: 'Validation',
			serialization: 'Serialization',
			forms: 'Forms & Rules',
			model: 'Model State',
			exclusive: 'QuickModel Only',
		},
	},
} as const;
