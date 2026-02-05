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
			'Hace cumplir reglas internas del proyecto: usar @Quick sobre @QType en tests, y no console.log.',
		update_docs_content:
			'Genera automáticamente archivos de documentación para Herramientas y Transformadores basado en el código actual.',
		scaffold_feature:
			'Genera la estructura básica para una nueva funcionalidad.',
		check_api_compatibility:
			'Verifica la compatibilidad de la API pública.',
		benchmark_performance:
			'Ejecuta pruebas de rendimiento para las transformaciones de QuickModel.',
	},
};
