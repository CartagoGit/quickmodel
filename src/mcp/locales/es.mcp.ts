export const esMcp = {
	publicTitle: 'Herramientas MCP Públicas',
	internalTitle: 'Herramientas MCP Internas',
	transformersTitle: 'Transformadores Integrados',
	transformersDesc:
		'QuickModel incluye un conjunto de transformadores integrados para manejar tipos de datos comunes.',
	generatedBy:
		'_Generado automáticamente por QSyncDocsTool. No editar manualmente._',
	transformerHeader: 'Transformador',
	descHeader: 'Descripción',
	customTransformers:
		'Consulta [Transformadores Personalizados](./custom-transformers.md) para añadir los tuyos.',
	inputSchema: 'Esquema de Entrada',
	tools: {
		create_model:
			'Genera el código TypeScript para una clase que extiende QModel basado en una lista de propiedades. Úsalo para crear nuevos modelos rápidamente.',
		validate_usage:
			'Analiza un fragmento de código para verificar errores comunes de uso de QuickModel (ej. falta de declare, herencia incorrecta).',
		list_transformers:
			'Lista todos los transformadores de datos disponibles en QuickModel (ej. string, date, email).',
		generate_mock:
			'Genera datos simulados (mock) para una definición de esquema dada usando QuickModel.',
		inspect_model:
			'Analiza una definición de clase QuickModel y explica su estructura.',
		search_docs:
			'Busca en la documentación de QuickModel por una cadena de consulta.',
		interface_to_model:
			'Convierte una definición de interfaz TypeScript en una clase QuickModel.',
		export_json_schema:
			'Genera una definición de JSON Schema a partir de una clase QuickModel.',
		explain_error:
			'Explica un error de validación de QuickModel en lenguaje humano.',
		simulate_transformation:
			'Simula una transformación de datos QuickModel dado un objeto de entrada y un mapa de configuración.',
		json_to_model:
			'Convierte una cadena JSON en una definición de clase QuickModel con tipos inferidos.',
		simulate_validation:
			'Simula validación de predicados estilo @QRule sobre un objeto de datos. Cada regla tiene un predicado (expresión JS con variables `value` y `data`) y un mensaje. Retorna { valid, errors[], evaluated }.',
		get_model_schema:
			'Genera el schema de un modelo en cualquier formato soportado a partir de una clase QuickModel. Soporta los 7 formatos: json, openapi, zod, mongo, typescript, graphql, ajv. Usa la API real QModel.getSchema().',
		get_form_schema:
			'Extrae el schema de formulario de los decoradores @QField / @QGroup usando la API real QModel.getFormSchema() / getFormSchemaGrouped(). Devuelve metadatos de campo (widget, label, placeholder, required, inputType, options) como array estructurado.',
		check_integrity:
			'Ejecuta comprobaciones de integridad a nivel de transformer sobre un objeto de datos usando la API real instance.checkIntegrity(). Detecta Date inválidos, BigInt fuera de rango, RegExp malformados y otros fallos a nivel de transformer. Devuelve { valid, errors[], evaluated, summary }.',
		simulate_rules:
			'Ejecuta reglas de lógica de negocio a través de la API real instance.checkRules(). Aplica las reglas mediante metadatos @QRule para que el formato del resultado coincida exactamente con el IQRulesResult de producción. Las cadenas de predicado tienen acceso a `value` (valor del campo) y `data` (objeto completo). Usa simulate_validation para evaluaciones independientes de predicados; usa esta herramienta cuando necesites verificar que la salida de @QRule + checkRules() es exactamente la que producirá tu código en runtime. Devuelve { valid, errors[], evaluated }.',
		simulate_async_rules:
			'Ejecuta reglas de lógica de negocio asíncronas a través de la API real instance.checkRulesAsync(). Soporta timeoutMs, timeoutMessage y mode (parallel|serial). Las cadenas de predicado pueden usar async/await y devolver Promises. Devuelve { valid, errors[], evaluated }.',
		roundtrip:
			'Verifica que serializar y recrear una instancia de QuickModel es sin pérdida. Ejecuta: s1 = new Model(data).serialize() → s2 = new Model(s1).serialize() y comprueba si s1 === s2. Devuelve { lossless, input, serialized, roundtrip_serialized, diff, summary }.',
		diff_models:
			'Compara dos definiciones de clase QuickModel (como cadenas de código fuente) y reporta las diferencias: campos añadidos/eliminados, transformers cambiados, decoradores añadidos/eliminados. Análisis estático puro, sin ejecución de código. Devuelve { added_fields, removed_fields, changed_fields, changed_transformers, added_decorators, removed_decorators, summary }.',

		update_docs:
			'Herramienta interna para ejecutar scripts de construcción de documentación.',
		generate_test:
			'Herramienta interna para generar un archivo de prueba inicial para un componente fuente.',
		check_jsdocs:
			'Escanea el código fuente buscando miembros exportados que carecen de documentación JSDoc.',
		check_project_health:
			'Ejecuta una verificación completa de salud: Lint, Typecheck y Tests.',
		get_coverage_report:
			'Ejecuta pruebas con cobertura y reporta el resumen.',
		check_project_rules:
			'Hace cumplir reglas internas: @Quick sobre @QType en tests, sin console.log, id-length (mín 3 chars), max-params (máx 3), naming-convention (prefijo I para interfaces/tipos), no-restricted-imports.',
		update_docs_content:
			'Genera automáticamente archivos de documentación para Herramientas y Transformadores basado en el código actual.',
		scaffold_feature:
			'Genera la estructura básica para una nueva funcionalidad.',
		check_api_compatibility:
			'Verifica la compatibilidad de la API pública.',
		benchmark_performance:
			'Ejecuta pruebas de rendimiento para las transformaciones de QuickModel.',
		list_todos:
			'Escanea archivos fuente en busca de comentarios TODO, FIXME, HACK y XXX. Admite targetDir personalizado y extensiones de archivo. Devuelve { items: [{file, line, type, text}][], total }.',
		check_bundle_size:
			'Compila el proyecto y reporta el tamaño de los archivos generados en dist/. Devuelve { status, files: [{file, bytes}][], total_bytes, summary }.',
		check_changelog:
			'Verifica que CHANGELOG.md contiene una entrada para la versión actual de package.json. Devuelve { found, version, excerpt, status, message? }.',
		lint_check:
			'Ejecuta ESLint sobre un directorio o archivos específicos. Devuelve { passed, errors, warnings, total_errors, total_warnings, summary }.',
		typecheck:
			'Ejecuta la verificación de tipos de TypeScript (tsc --noEmit) sobre src/. Devuelve { passed, errors, total, summary }.',
		pre_commit_check:
			'Simula el hook de pre-commit de Husky: ejecuta ESLint (--fix) y Prettier (--write) sobre los archivos indicados o src/. ' +
			'Devuelve { passed, eslint_errors, eslint_warnings, prettier_changed, issues, summary }. ' +
			'Ejécutalo antes de hacer commit para garantizar que el hook no lo rechazará.',
		run_tests:
			'Ejecuta la suite de tests de Bun (opcionalmente filtrada por ruta/patrón). ' +
			'Parsea los conteos de pass/fail y devuelve detalles estructurados de fallos. ' +
			'Devuelve { passed, total_pass, total_fail, errors[], summary }.',
		get_staged_files:
			'Lista los archivos actualmente en staging (`git diff --cached --name-only`). ' +
			'Úsalo para saber qué archivos necesitan validación lint/typecheck antes de hacer commit. ' +
			'Devuelve { passed, files[], total, summary }.',
	},
};
