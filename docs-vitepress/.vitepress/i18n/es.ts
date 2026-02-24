export const esLocale = {
	mcp: {
		title: 'Protocolo de Contexto de Modelo',
		overview: 'Descripción General',
		publicTools: 'Herramientas Públicas',
		publicSkills: 'Skills Públicos',
		installationMaintainers: 'Instalación (Mantenedores)',
		internalToolsMaintainers: 'Herramientas Internas (Mantenedores)',
		internalSkillsMaintainers: 'Skills Internos (Mantenedores)',
	},
	quickExamples: {
		tabBasic: '@Quick + QModel',
		tabForms: 'QField + QGroup + QRule',
		tabMocks: 'Serialización + Mocks',
		basicTitle: 'Coerción de tipos con @Quick y QModel',
		basicSubtitle:
			'Un solo decorador transforma strings JSON en BigInt, Date, Map y más',
		formsTitle: 'Esquemas de formulario, grupos y reglas de validación',
		formsSubtitle:
			'Generación declarativa de esquemas de formulario con metadatos, grupos y reglas de negocio',
		mocksTitle: 'Serialización round-trip y datos mock',
		mocksSubtitle:
			'Serialización JSON con tipos seguros y generación automática de mocks realistas para tests',
	},
	whyQuickModel: {
		tabExplanation: '¿Por qué QuickModel?',
		tabInstallation: 'Instalación',
		tabRequirements: 'Requisitos',
		explanationIntro:
			'QuickModel es más que una librería de serialización — es una plataforma de desarrollo completa para aplicaciones TypeScript intensivas en datos.',
		installTitle: 'Empieza en segundos',
		installSubtitle: 'Instala con tu gestor de paquetes preferido',
		installStep1: 'Instala con tu gestor de paquetes',
		installStep2: 'Configura el tsconfig.json',
		installStep3: 'Crea tu primer modelo',
		reqTitle: 'Requisitos del Sistema',
		reqSubtitle: 'Todo lo necesario para ejecutar QuickModel',
		reqNodeDesc:
			'Requerido. Runtime ES2022+. Compatible con Node, Bun, Deno y cualquier bundle moderno de navegador.',
		reqTsDesc:
			'TypeScript 3.4+ para decoradores legacy, 5.0+ para usar los decoradores estándar TC39.',
		reqReflectDesc:
			'Ya viene incluida dentro del bundle de QuickModel. No necesitas importarla manualmente en tu proyecto.',
		reqFakerDesc:
			'Incluida como dependencia opcional. Se instala automáticamente con el paquete. Solo se activa si usas <code>mock()</code>.',
		reqTsconfigTitle: 'Configuración del tsconfig.json',
		reqTsconfigOption: 'Opción',
		reqTsconfigLegacy: 'Legacy (TS 3.4+)',
		reqTsconfigTC39: 'TC39 (TS 5+)',
		reqTsconfigNote: 'Notas',
		reqExpDecNote:
			'Activa la sintaxis de decoradores legacy (@Quick, @QType…)',
		reqEmitMetaNote:
			'Emite metadatos de tipo en runtime (necesario para la inferencia de tipos)',
		reqUseDefineNote:
			'⚠️ CRÍTICO — debe ser false con decoradores legacy para evitar shadowing',
		reqTargetNote: 'BigInt y APIs modernas requieren mínimo ES2020',
		reqStrictNote: 'Recomendado para máxima seguridad de tipos',
	},
	benchmark: {
		// ─── UI labels ────────────────────────────────────────────
		featureTitle: 'Comparativa de características',
		featureSubtitle:
			'QuickModel vs otras librerías con características similares',
		matrixTitle: '🎯 Características ofrecidas por cada librería',
		matrixHint: '⚠️ = disponible con código manual adicional',
		typeLabel: 'Tipo:',
		librariesLabel: 'Librerías:',
		featuresLabel: 'Características:',
		perfTitle: 'Comparativa de rendimiento',
		perfSubtitle: 'Pasa el ratón sobre las barras para ver detalles',
		scenarioLabel: 'Escenario:',
		muchFaster: 'mucho más rápido',
		noticeablyFaster: 'bastante más rápido',
		slightlyFaster: 'más rápido ↑',
		seeNote: '(ver nota ↑)',
		notApplicable: 'No aplica en este escenario',
		slower: 'más lento',
		faster: 'más rápido',
		tooltipIncludes: '✅ Incluye',
		tooltipMissing: '❌ No incluye',
		coverageTitle: 'Mapa de Cobertura — Características & Velocidad',
		coverageSubtitle:
			'Qué librerías soportan cada escenario de benchmark. Haz clic en la cabecera de columna para ver el benchmark detallado.',
		coverageSpeed: 'ops/seg',
		coverageViewDetail: 'Ver benchmark detallado →',
		tabFeatures: 'Comparativa de Características',
		tabCoverage: 'Mapa de Cobertura',
		tabPerf: 'Rendimiento',

		// ─── Scenario labels and notes ────────────────────────────
		scenarios: {
			validation: {
				label: 'Validación de Esquemas (10k)',
				notes: '10k validaciones — TypeBox compila a checks JSON Schema nativo (más rápido), valibot es tree-shakeable, Zod es el más popular, yup es maduro. QM añade coerción automática sobre la validación. Plain JS y class-transformer excluidos: sin validación de esquemas. arktype es el validador TypeScript-nativo más rápido. joi es maduro pero más lento.',
			},
			coercion: {
				label: 'Coerción de Tipos (Date + BigInt + Map + Set)',
				notes: '1k objetos — coerción automática vs manual. QM: un decorador, cero código extra. Zod/valibot: transform manual por campo. class-transformer: solo Date via @Type, no BigInt/Map/Set. Plain JS, TypeBox, yup, joi, vest, superjson y arktype no hacen coerción a nivel de modelo.',
			},
			serialization: {
				label: 'Roundtrip Serialización (con tipos)',
				notes: '1k roundtrips. Plain JS (JSON.parse/stringify) es el más rápido pero pierde Date→string, BigInt→error, Map/Set→{}. class-transformer preserva solo Date via @Type. superjson preserva Date, BigInt, Set, Map, RegExp y más. QuickModel preserva todos los tipos nativamente con cero código adicional.',
			},
			batch: {
				label: 'Validación Batch (1k objetos)',
				notes: '10 ciclos de 1k objetos — rendimiento de validación en masa. class-transformer excluido (no es validador — necesita class-validator por separado). Plain JS excluido (sin validación). arktype es el validador TypeScript-nativo más rápido. joi y vest están orientados a reglas de negocio/formularios.',
			},
			mocks: {
				label: 'Generación de Datos para Tests (100 instancias)',
				notes: '100 instancias tipadas por ciclo. faker (manual) requiere una factory manual por modelo — rápido pero sin restricciones de tipo y se rompe al cambiar el schema. Plain JS usa una factory hardcoded — el más rápido pero sin aleatoriedad real. QM está integrado: cero setup, totalmente tipado, respeta restricciones automáticamente. arktype, joi, superjson, class-validator y vest no tienen generación de mocks integrada.',
			},
			forms: {
				label: 'Reglas de Negocio / Formularios (5k)',
				notes: '5k validaciones — class-validator: decoradores @IsEmail/@MinLength/@Matches con validateSync(), vest: suite create() con aserciones test() individuales, joi: schema.validate() con API fluida, QuickModel @QRule: decoradores co-ubicados + qCheckRules(), filtrado nativo por grupo y soporte async con timeouts integrados.',
			},
			rules: {
				label: 'Reglas de Negocio / @QRule (5k iteraciones)',
				notes: '5k iteraciones. QuickModel @QRule: decoradores co-localizados, sin setup externo. class-validator: @IsEmail/@MinLength/@Matches con validateSync(). joi: schema.validate() con API fluida. vest: nueva suite por campo con create() + aserciones test().',
			},
			typeSerialization: {
				label: 'Fidelidad de Serialización con Tipos (1k)',
				notes: '1k iteraciones — fidelidad de tipos. Plain JSON.parse/stringify pierde Date→string, BigInt falla, Map/Set→{}. superjson preserva la mayoría de tipos. QuickModel preserva Date, BigInt, Map, Set, RegExp de forma nativa sin código adicional.',
			},
			aliasMapping: {
				label: 'Mapeo de Campos / @QAlias (2k)',
				notes: '2k instanciaciones — payload API en snake_case → modelo camelCase. Plain JS: el más rápido pero requiere mapper hardcoded que se rompe con cada cambio de schema. class-transformer: copia a instancia de clase pero mantiene las claves snake_case originales sin configuración @Expose+@Transform. QuickModel @QAlias: renombrado sin boilerplate al instanciar, compatible con coerción de tipos y validación.',
			},
			isDirty: {
				label: 'Detección de Cambios / isDirty() (5k)',
				notes: '5k iteraciones — detectar si un modelo fue mutado. Plain JS: comparación JSON.stringify — O(n) serialización en cada check, crece con el tamaño del objeto. QuickModel patch()+isDirty(): tracking O(1) con Set por campo, reset() restaura al estado inicial, getDirtyFields() lista los campos modificados. isDirty("name") verifica un único campo.',
			},
			nestedConstruct: {
				label: 'Construcción de Modelo Anidado (1k)',
				notes: '1k instanciaciones — Order con total BigInt, placedAt Date, objeto customer anidado y array de items. Plain JS: BigInt()+new Date() manual por campo — resultado correcto pero frágil. class-transformer: plainToInstance() copia a clase pero BigInt queda como string (sin transformer nativo). QuickModel @Quick({ total: "bigint", placedAt: Date }): un solo decorador gestiona toda la coerción de tipos.',
			},
			asyncRules: {
				label: 'Reglas Async Paralelas / qCheckRulesAsync (1k)',
				notes: '1k iteraciones — orquestación de reglas async con predicados de resolución instantánea (mide overhead de orquestación). QuickModel modo parallel: Promise.allSettled sobre todos los @QRule — óptimo para reglas bound a IO. joi validateAsync(): Promise por campo, secuencial. yup validate() async: ejecución de reglas secuencial. QM único: timeoutMs por regla + switch serial/parallel.',
			},
			bulkConstruct: {
				label: 'Construcción Masiva / createMany (5 × 500)',
				notes: '5 ciclos de 500 objetos — importación masiva tipada desde JSON crudo. Plain JS: spread de objeto plano — el más rápido pero sin tipado ni validación. class-transformer: plainToInstance array — mapea a clase pero sin checks de integridad, BigInt no soportado. Zod: safeParse por item — valida pero retorna objetos planos, no instancias tipadas con métodos. QuickModel createMany(): instancias tipadas + integridad + reglas de negocio, separa válidos/inválidos automáticamente.',
			},
			schemaMultiFormat: {
				label: 'Schema Multi-Formato / getSchema() × 7 (2k)',
				notes: '2k iteraciones — exportar schema en 7 formatos secuencialmente: JSON Schema, Zod, OpenAPI 3.0, interfaz TypeScript, GraphQL SDL, MongoDB, AJV. QuickModel es el único: una llamada genera los 7 formatos desde una clase decorada. TypeBox: el objeto Type ES el schema — acceso O(1) pero solo JSON Schema nativo. Plain JS: object literal estático — 1 formato, sin reutilización. Ninguna otra librería genera schemas multi-formato desde clases decoradas.',
			},
			validationReport: {
				label: 'Reporte de Errores Estructurado / validationReport() (3k)',
				notes: '3k iteraciones con datos inválidos — obtener objetos de error categorizados. QuickModel validationReport(): retorna { valid, integrity[], rules: { valid, errors[] } } — dos categorías separadas: errores de tipo/coerción (integrity) y errores de lógica de negocio (@QRule). Zod safeParse(): array plano ZodError.issues, sin categorías. yup validateSync(abortEarly:false): ValidationError.errors plano. joi validate(abortEarly:false): array error.details plano. Solo QuickModel distingue fallos de integridad vs reglas en una sola llamada tipada.',
			},
			performanceTargets: {
				label: 'Objetivos de Rendimiento / Throughput (Lote)',
				notes: 'Throughput de QuickModel en dos escenarios exclusivos: transformación de 10k objetos Date en un único pase; y roundtrip completo create+serialize de 1k instancias tipadas con campos BigInt y Date. Ambas mediciones verifican los SLAs internos: 10k Dates < 100ms, 1k roundtrip < 50ms.',
			},
		},

		// ─── Library descriptions, pros and cons ─────────────────
		libraries: {
			plainJs: {
				desc: 'Objetos JavaScript puros — velocidad máxima, sin seguridad',
				pros: [
					'Ultra rápido (~100% baseline)',
					'Sin dependencias',
					'Sin overhead',
				],
				cons: [
					'Sin coerción de tipos (Date, BigInt, Map, Set)',
					'Sin serialización / deserialización',
					'Sin integridad de tipos en runtime',
					'Sin generación de mocks',
					'Sin integración IA / MCP',
					'Sin estado de modelo (copy, isDirty)',
					'Sin form schemas',
					'Sin campos computados',
					'Sin reglas de negocio (@QRule)',
				],
			},
			typebox: {
				desc: 'Validación JSON Schema ultra-rápida — checks compilados, sin overhead',
				pros: [
					'Validación más rápida (~70% de Plain JS) ✅',
					'Checks JSON Schema compilados ✅',
					'Inferencia de tipos desde schemas ✅',
					'Bundle muy pequeño ✅',
					'Exportar JSON Schema ✅',
				],
				cons: [
					'Sin coerción de tipos (Date, BigInt, Map, Set)',
					'Sin serialización / deserialización',
					'Sin generación de mocks',
					'Sin integración IA / MCP',
					'Sin form schemas ni campos computados',
				],
			},
			valibot: {
				desc: 'Validación modular y tree-shakeable — bundle más pequeño del ecosistema',
				pros: [
					'Tree-shakeable (bundle mínimo) ✅',
					'Validación rápida (~32% de Plain JS) ✅',
					'pipe() con transforms para coerción ✅',
					'Schemas con seguridad de tipos ✅',
				],
				cons: [
					'Coerción requiere pipe(transform()) manual por campo',
					'Sin serialización / deserialización',
					'Sin generación de mocks',
					'Sin integración IA / MCP',
					'Sin estado, form schemas ni campos computados',
				],
			},
			zod: {
				desc: 'Librería de validación — excelente para validar, no para modelado completo',
				pros: [
					'Validación rápida',
					'Schemas tipados',
					'Integridad en runtime ✅',
					'Gran ecosistema',
				],
				cons: [
					'Sin serialización built-in (necesita superjson u otro)',
					'Date/BigInt/Map/Set requieren .transform() manual por campo',
					'Sin mocks (necesita @faker-js/faker + mapeo manual)',
					'Sin servidor IA / MCP integrado',
					'Sin estado de modelo (copy, isDirty, hasIntegrity)',
					'Sin JSON polimórfico (instanciación de subclases)',
					'Sin form schemas desde decoradores',
					'Sin campos computados',
				],
			},
			quickmodel: {
				desc: 'Plataforma de modelado TypeScript completa con IA integrada',
				pros: [
					'Coerción automática Date/BigInt/Map/Set ✅',
					'serialize() / deserialize() nativo ✅',
					'Generación de mocks tipados built-in ✅',
					'Servidor IA/MCP integrado ✅',
					'JSON polimórfico automático ✅',
					'Estado: copy(), isDirty(), hasIntegrity() ✅',
					'Form schemas: @QField, @QGroup, getFormSchema() ✅',
					'Campos computados: @QComputed ✅',
					'Reglas async: @QRule, checkRulesAsync() ✅',
					'Inferencia de herencia multinivel ✅',
					'Exportar schemas: JSON / Zod / OpenAPI / GraphQL ✅',
					'Core sin dependencias externas ✅',
				],
				cons: [
					'~4x más lento que Plain JS para primitivos simples',
					'(sigue siendo <0.1ms por operación típica de API — imperceptible en práctica)',
				],
			},
			classTransformer: {
				desc: 'Serialización de clases por anotaciones — @Type para Date, sin soporte BigInt/Map/Set',
				pros: [
					'instanceToPlain() / plainToInstance() ✅',
					'@Type(() => Date) para campos Date ✅',
					'Deserialización polimórfica con @Type ✅',
					'Funciona con clases existentes ✅',
				],
				cons: [
					'Sin validación — necesita class-validator por separado',
					'BigInt, Map, Set requieren @Transform manual por campo',
					'Sin generación de mocks',
					'Sin integración IA / MCP',
					'Sin form schemas ni campos computados',
					'Sin reglas de negocio async',
				],
			},
			yup: {
				desc: 'Validación basada en schemas con soporte async — maduro pero pesado',
				pros: [
					'Soporte validación async ✅',
					'Schemas mixtos (any/lazy) ✅',
					'Gran ecosistema / muy conocido ✅',
				],
				cons: [
					'~20x más lento que TypeBox para validación simple',
					'Sin coerción para BigInt, Map, Set',
					'Sin serialización / deserialización',
					'Sin generación de mocks',
					'Sin integración IA / MCP',
					'Sin form schemas ni campos computados',
				],
			},
			fakerManual: {
				desc: '@faker-js/faker — generación de datos aleatorios, requiere factory manual por modelo',
				pros: [
					'Generación rápida de datos aleatorios ✅',
					'Gran variedad de tipos de datos ✅',
					'Muy conocido, gran ecosistema ✅',
				],
				cons: [
					'Hay que escribir una factory manual por cada modelo',
					'La factory rompe en cada cambio de schema — mantenimiento manual',
					'Sin restricciones de tipo automáticas (min/max, regex, enum)',
					'Sin estado de modelo, validación ni coerción',
					'Sin relación entre campos (p.ej. createdAt < updatedAt)',
				],
			},
			arktype: {
				desc: 'Validador TypeScript-nativo con inferencia en compile-time — validación de schemas ultra rápida',
				pros: [
					'Validador TypeScript-nativo más rápido (5M+ ops/s) ✅',
					'Inferencia de tipos en compile-time desde sintaxis string ✅',
					'Peso en bundle muy pequeño ✅',
					'Sintaxis expresiva: "string | number", "string[]" ✅',
				],
				cons: [
					'Sin coerción de tipos (Date, BigInt, Map, Set)',
					'Sin serialización / deserialización',
					'Sin generación de mocks',
					'Sin integración IA / MCP',
					'Sin estado de modelo (copy, isDirty)',
					'Sin form schemas ni campos computados',
					'Sin reglas de negocio async',
				],
			},
			superjson: {
				desc: 'Superconjunto de JSON que preserva Date, BigInt, Map, Set, RegExp, undefined en serialización',
				pros: [
					'Preserva Date, BigInt, Map, Set, RegExp, undefined ✅',
					'Reemplazo directo de JSON.stringify/parse ✅',
					'Funciona con cualquier clase u objeto plano ✅',
					'Bundle pequeño, bien mantenido ✅',
				],
				cons: [
					'Sin validación de schemas',
					'Sin coerción de tipos por decoradores',
					'Sin generación de mocks',
					'Sin integración IA / MCP',
					'Sin estado de modelo ni campos computados',
					'Sin form schemas ni reglas de negocio',
					'Requiere superjson tanto en cliente como servidor',
				],
			},
			classValidator: {
				desc: 'Validación basada en decoradores para clases TypeScript — habitualmente junto a class-transformer',
				pros: [
					'Amplio conjunto de decoradores built-in (@IsEmail, @MinLength…) ✅',
					'Soporte de validación asíncrona ✅',
					'Decoradores de restricciones personalizados ✅',
					'Funciona con definiciones de clases existentes ✅',
				],
				cons: [
					'Sin coerción de tipos — necesita class-transformer por separado',
					'Sin serialización más allá de la combinación con class-transformer',
					'Sin generación de mocks',
					'Sin integración IA / MCP',
					'Sin estado de modelo (copy, isDirty)',
					'Sin form schemas ni campos computados',
				],
			},
			vest: {
				desc: 'Framework de validación de formularios inspirado en suites de test — grupos y reglas async para UI',
				pros: [
					'Estructura suite/group paralela al concepto @QGroup ✅',
					'Soporte de reglas async ✅',
					'Excelente DX para escenarios de validación de formularios ✅',
					'Agnóstico al framework ✅',
				],
				cons: [
					'~130x más lento que @QRule para reglas de negocio',
					'Sin validación de schemas ni coerción de tipos',
					'Sin serialización / deserialización',
					'Sin generación de mocks',
					'Sin integración IA / MCP',
					'Sin estado de modelo ni inferencia de herencia',
				],
			},
			joi: {
				desc: 'Validador y descriptor de schemas para Node.js con amplia trayectoria — API expresiva, ecosistema maduro',
				pros: [
					'API muy expresiva y encadenable ✅',
					'Validación async y reglas personalizadas ✅',
					'Validación condicional (.when()) ✅',
					'Gran ecosistema / amplia trayectoria ✅',
				],
				cons: [
					'~75x más lento que TypeBox para validación',
					'Sin coerción para BigInt, Map, Set',
					'Sin serialización / deserialización',
					'Sin generación de mocks',
					'Sin integración IA / MCP',
					'Sin estado de modelo ni campos computados',
					'Sin enfoque basado en decoradores',
				],
			},
		},

		// ─── Feature row labels and per-lib warning notes ─────────
		features: {
			autoCoercion: {
				label: 'Coerción automática',
				notes: {
					valibot: 'Requiere pipe + transform manual por campo',
					zod: 'Requiere z.coerce o .transform() por campo',
					classTransformer:
						'Solo Date mediante @Type — sin BigInt, Map ni Set',
				},
			},
			nativeSerialization: {
				label: 'Serialización nativa (toJSON)',
				notes: {
					classTransformer:
						'Solo Date mediante @Type — sin BigInt, Map, Set ni RegExp',
				},
			},
			typedMocks: { label: 'Generación de mocks tipados' },
			aiMcp: { label: 'IA / Servidor MCP integrado' },
			polymorphicJson: {
				label: 'JSON polimórfico',
				notes: {
					classTransformer:
						'Posible con discriminador custom pero requiere boilerplate extra',
					superjson:
						'Preserva tipos pero necesita el objeto ya tipado en memoria',
				},
			},
			copyIsDirty: { label: 'copy() / isDirty()' },
			formSchemas: {
				label: 'Form schemas (@QField)',
				notes: {
					vest: 'Estructura de formulario basada en suites, sin integración con decoradores de clase',
				},
			},
			computedFields: { label: 'Campos computados (@QComputed)' },
			asyncRules: {
				label: 'Reglas de negocio async (@QRule)',
				notes: {
					zod: 'Soporta refinements async pero no están co-localizados con la definición del modelo',
					yup: 'Soporta .test() async pero se define separado del modelo',
					classValidator:
						'Mediante @ValidateIf + validadores async; requiere dependencia extra',
					vest: 'Suite de validación externa, no integrada con la clase del modelo',
					joi: 'Suite de validación externa, no integrada con la clase del modelo',
				},
			},
			runtimeIntegrity: {
				label: 'Integridad en runtime',
				notes: {
					valibot:
						'Posible con llamadas parse manuales, no aplicado por el modelo',
					yup: 'Posible con llamadas .validate() manuales, no integrado en el ciclo de vida del modelo',
					classValidator:
						'Requiere llamada explícita a validate(); no automático en la asignación',
					vest: 'Suite externa — debe llamarse manualmente, no está ligada al ciclo de vida del modelo',
					joi: 'Suite externa — debe llamarse manualmente, no está ligada al ciclo de vida del modelo',
				},
			},
			inheritance: { label: 'Herencia multinivel con inferencia' },
			schemaExport: { label: 'Exportar schema (JSON/Zod/OpenAPI)' },
			tsInference: { label: 'Inferencia TS compile-time' },
			treeShakeable: {
				label: 'Tree-shakeable',
				notes: {
					typebox:
						'La mayoría de tipos son tree-shakeable pero el compilador/runtime interno siempre se incluye',
				},
			},
			decoratorConstraints: { label: 'Restricciones (@IsEmail…)' },
			preservesTypes: { label: 'Preserva RegExp/undefined/NaN' },
			validationGroups: {
				label: 'Grupos de validación',
				notes: {
					classValidator:
						'Soportado mediante la opción groups pero requiere configuración verbosa con @ValidateIf',
				},
			},
		},

		// ─── Filter option labels ─────────────────────────────────
		appTypes: {
			all: 'Todos los contextos',
			api: 'REST API / Backend',
			ddd: 'Modelado de Dominio / DDD',
			testing: 'Testing',
			mock: 'Mock / Datos de test',
			data: 'Data Pipeline',
		},
		matrixTypes: {
			all: 'Todas las librerías',
			validation: 'Validadores',
			serialization: 'Serialización',
			forms: 'Formularios / Reglas',
			mocks: 'Mocks',
		},
		featureCategories: {
			all: 'Todas las características',
			validation: 'Validación',
			serialization: 'Serialización',
			forms: 'Formularios y Reglas',
			model: 'Estado del Modelo',
			exclusive: 'Solo QuickModel',
		},
	},
	footer: {
		license:
			'Publicado bajo la <a href="https://github.com/CartagoGit/quickmodel/blob/main/LICENSE" target="_blank" rel="noopener">Licencia Personalizada QuickModel</a>.',
		donation:
			'Si este proyecto te es útil, considera <a href="https://paypal.me/cartagonova" target="_blank" rel="noopener">☕ invitarme a un café</a>.',
	},
} as const;
