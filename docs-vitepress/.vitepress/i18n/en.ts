export const enLocale = {
	mcp: {
		title: 'Model Context Protocol',
		sectionUsing: 'Using QuickModel',
		sectionDeveloping: 'Developing QuickModel',
		overview: 'Overview',
		installation: 'Installation & Setup',
		publicTools: 'MCP Tools',
		publicSkills: 'Skills / Workflows',
		installationMaintainers: 'Contributor Setup',
		internalToolsMaintainers: 'Internal Tools',
		internalSkillsMaintainers: 'Internal Skills',
	},
	quickExamples: {
		tabBasic: '@Quick + QModel',
		tabForms: 'QField + QGroup + QRule',
		tabMocks: 'Serialization + Mocks',
		basicTitle: 'Type coercion with @Quick and QModel',
		basicSubtitle:
			'A single decorator transforms JSON strings into BigInt, Date, Map and more',
		formsTitle: 'Form schemas, groups and validation rules',
		formsSubtitle:
			'Declarative form schema generation with metadata, groups and business rules',
		mocksTitle: 'Round-trip serialization and mock data',
		mocksSubtitle:
			'Type-safe JSON serialization and automatic realistic mock generation for tests',
	},
	whyQuickModel: {
		tabExplanation: 'Why QuickModel?',
		tabInstallation: 'Installation',
		tabRequirements: 'Requirements',
		explanationIntro:
			'QuickModel is more than a serialization library — it is a complete development platform for data-intensive TypeScript applications.',
		installTitle: 'Get started in seconds',
		installSubtitle: 'Install with your preferred package manager',
		installStep1: 'Install via your package manager',
		installStep2: 'Configure tsconfig.json',
		installStep3: 'Create your first model',
		reqTitle: 'System Requirements',
		reqSubtitle: 'Everything you need to run QuickModel',
		reqNodeDesc:
			'Required. ES2022+ runtime. Works with Node, Bun, Deno, and any modern browser bundle.',
		reqTsDesc:
			'TypeScript 3.4+ for legacy decorators, 5.0+ to use TC39 standard decorators.',
		reqReflectDesc:
			'Already bundled inside QuickModel. No need to import it manually in your project.',
		reqFakerDesc:
			'Bundled as an optional dependency — installed automatically with the package. Only needed when you call <code>mock()</code>.',
		reqTsconfigTitle: 'tsconfig.json Settings',
		reqTsconfigOption: 'Option',
		reqTsconfigLegacy: 'Legacy (TS 3.4+)',
		reqTsconfigTC39: 'TC39 (TS 5+)',
		reqTsconfigNote: 'Notes',
		reqExpDecNote: 'Enable legacy decorator syntax (@Quick, @QType…)',
		reqEmitMetaNote:
			'Emit type metadata at runtime (required for type inference)',
		reqUseDefineNote:
			'⚠️ CRITICAL — must be false with legacy decorators to avoid shadowing',
		reqTargetNote: 'BigInt and modern APIs require ES2020 minimum',
		reqStrictNote: 'Recommended for maximum type safety',
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
		featureColumnHeader: 'Feature',
		perfTitle: 'Performance Benchmark',
		perfSubtitle: 'Hover the bars to see details',
		scenarioLabel: 'Scenario:',
		muchFaster: 'much faster',
		noticeablyFaster: 'noticeably faster',
		slightlyFaster: 'faster ↑',
		seeNote: '(see note ↑)',
		notApplicable: 'Not applicable in this scenario',
		slower: 'slower',
		faster: 'faster',
		tooltipIncludes: '✅ Includes',
		tooltipMissing: '❌ Missing',
		coverageTitle: 'Coverage Map — Features & Speed',
		coverageSubtitle:
			'Which libraries support each benchmark scenario. Click a column header to view the detailed benchmark.',
		coverageSpeed: 'ops/sec',
		coverageViewDetail: 'View detailed benchmark →',
		tabFeatures: 'Features',
		tabCoverage: 'Coverage',
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
				notes: '1k round-trips. Plain JS (JSON.parse/stringify) is the fastest but loses Date→string, BigInt→error, Map/Set→{}. class-transformer preserves Date only via @Type. superjson preserves Date, BigInt, Set, Map, RegExp and more. QuickModel preserves all types natively with zero extra code.',
			},
			batch: {
				label: 'Batch Validation (1k objects)',
				notes: '10 cycles of 1k objects — throughput validation. class-transformer excluded (not a validator — needs class-validator separately). Plain JS excluded (no validation). arktype is fastest native TS validator. joi and vest are focused on form/business logic rules.',
			},
			mocks: {
				label: 'Test Data Generation (100 instances)',
				notes: '100 typed instances per cycle. faker (manual) requires a manual factory function per model — fast but with no type constraints and breaks on every schema change. Plain JS uses a hardcoded factory — fastest but not random. QM is built-in: zero setup, fully typed, respects field constraints automatically. arktype, joi, superjson, class-validator and vest have no built-in mock generation.',
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
			aliasMapping: {
				label: 'Field Alias Mapping / @QAlias (2k)',
				notes: '2k instantiations — snake_case API response → camelCase model. Plain JS: fastest but requires a hardcoded mapper that breaks on every schema change. class-transformer: copies to class instance but keeps original key names without @Expose+@Transform setup. QuickModel @QAlias: zero-boilerplate rename at instantiation, compatible with type coercion and validation.',
			},
			isDirty: {
				label: 'Change Detection / isDirty() (5k)',
				notes: '5k iterations — tracking if a model was mutated. Plain JS: JSON.stringify comparison — O(n) serialization on every check, grows with object size. QuickModel patch()+isDirty(): O(1) field-level Set tracking, reset() restores to initial state, getDirtyFields() lists changed fields. isDirty("name") checks a single field.',
			},
			nestedConstruct: {
				label: 'Nested Model Construction (1k)',
				notes: '1k instantiations — Order with BigInt total, Date placedAt, nested customer object and items array. Plain JS: manual BigInt()+new Date() per field — correct result but brittle. class-transformer: plainToInstance() copies to class but BigInt stays as string (no native transformer). QuickModel @Quick({ total: "bigint", placedAt: Date }): one decorator handles all type coercion automatically.',
			},
			asyncRules: {
				label: 'Async Rules Parallel / qCheckRulesAsync (1k)',
				notes: '1k iterations — async rule orchestration with instant-resolving predicates (measures orchestration overhead). QuickModel parallel mode: Promise.allSettled over all @QRule decorators — optimal for IO-bound rules. joi validateAsync(): Promise per field, sequential. yup validate() async: sequential rule execution. QM unique: timeoutMs per rule + serial/parallel mode switch.',
			},
			bulkConstruct: {
				label: 'Bulk Construction / createMany (5 × 500)',
				notes: '5 cycles of 500 objects — bulk typed import from raw JSON. Plain JS: plain object spread — fastest but no typing or validation. class-transformer: plainToInstance array — maps to class but no integrity checks, BigInt unsupported. Zod: safeParse per item — validates but returns plain objects, not typed instances with methods. QuickModel createMany(): typed instances + integrity check + business rules, separates valid/invalid automatically.',
			},
			schemaMultiFormat: {
				label: 'Schema Multi-Format / getSchema() × 7 (2k)',
				notes: '2k iterations — exporting schema in 7 formats sequentially: JSON Schema, Zod, OpenAPI 3.0, TypeScript interface, GraphQL SDL, MongoDB, AJV. QuickModel is unique: one call covers all 7 formats from a single decorated class. TypeBox: the Type object IS the schema — O(1) access but only JSON Schema natively. Plain JS: static object literal — 1 format, no reuse. No other library generates multi-format schemas from decorated classes.',
			},
			validationReport: {
				label: 'Structured Error Report / validationReport() (3k)',
				notes: '3k iterations with invalid data — getting categorized error objects. QuickModel validationReport(): returns { valid, integrity[], rules: { valid, errors[] } } — two separate categories: type/coercion errors (integrity) and business logic errors (@QRule). Zod safeParse(): flat ZodError.issues array, no categories. yup validateSync(abortEarly:false): flat ValidationError.errors. joi validate(abortEarly:false): flat error.details array. Only QuickModel distinguishes integrity vs rule failures in a single typed call.',
			},
			performanceTargets: {
				label: 'Performance Targets / Throughput (Batch)',
				notes: 'QuickModel throughput on two QM-exclusive scenarios: transformation of 10k Date objects in a single batch pass; and full create+serialize roundtrip of 1k typed instances with BigInt and Date fields. Both verify internal SLAs: 10k Dates < 100ms, 1k roundtrip < 50ms.',
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
				desc: '@faker-js/faker — random data generation, manual factory function required per model',
				pros: [
					'Fast random data generation ✅',
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
			immer: {
				desc: 'Immutable state management via structural sharing — produce() detects changes via reference comparison',
				pros: [
					'O(1) change detection via produce() + reference check ✅',
					'Structural sharing — untouched branches are reused ✅',
					'TypeScript-first with Draft<T> inference ✅',
					'Tree-shakeable and tiny (~6KB) ✅',
				],
				cons: [
					'No field-level tracking (no getDirtyFields())',
					'No patch() / reset() / model lifecycle',
					'No schema validation or type coercion',
					'No mock generation',
					'No AI / MCP integration',
					'No serialization of BigInt, Map, Set',
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
			copyIsDirty: {
				label: 'copy() / isDirty()',
				notes: {
					immer: 'Change detection via reference comparison only (produce()) — no getDirtyFields() or model lifecycle',
				},
			},
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
			inheritance: {
				label: 'Multi-level inheritance inference',
				notes: {
					classTransformer:
						'Decorator metadata (@Type, @Transform) is inherited by subclasses but type inference is manual — no automatic nested type resolution',
				},
			},
			schemaExport: { label: 'Schema export (JSON/Zod/OpenAPI)' },
			tsInference: {
				label: 'Compile-time TS inference',
				notes: {
					immer: 'Only Draft<T> inference inside produce() — no automatic model-level TS inference',
				},
			},
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
			mocks: 'Mocks',
			exclusive: 'QuickModel Only',
		},
	},
	footer: {
		license:
			'Released under the <a href="https://github.com/CartagoGit/quickmodel/blob/main/LICENSE" target="_blank" rel="noopener">QuickModel Custom License</a>.',
		donation:
			'If this project helps you, consider <a href="https://paypal.me/cartagonova" target="_blank" rel="noopener">☕ buying me a coffee</a>!',
	},
} as const;
