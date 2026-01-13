# Herramientas MCP Públicas

Estas herramientas están diseñadas para ayudar a los desarrolladores a **usar** QuickModel efectivamente en sus aplicaciones.

> **[Ver Referencia Completa de API](./tools.md)** (Generado automáticamente con Esquemas)

## Herramientas Disponibles

Las siguientes herramientas están disponibles para uso público. Por favor consulta la [Referencia de API](./tools.md) para esquemas detallados y ejemplos de uso.

- **Creación de Modelos**: Genera clases `QModel` completas desde descripciones.
- **Validación**: Analiza código para el uso correcto de `@Quick` y decoradores.
- **Simulación**: Prueba cómo se transforman los datos sin ejecutar todo el código de la aplicación.
- **Mocking**: Genera datos simulados realistas para pruebas.
- **Inspección**: Analiza estructuras de modelos y transformadores disponibles.


## Simulación de Datos

### `simulate_transformation`

Simula cómo `QuickModel` transformará un objeto JSON crudo en una instancia del modelo sin ejecutar código.

- **Uso**: "¿Qué pasa si paso `{ "date": "invalid" }` a este modelo?"
- **Salida**: JSON mostrando los valores transformados (ej: objeto `Date` o `null`).

### `generate_mock`

Genera datos de prueba válidos para un esquema dado.

- **Uso**: "Genera 5 usuarios mock con nombre y email."
- **Salida**: Array JSON de objetos mock.

## Inspección y Utilidades

### `inspect_model`

Analiza la estructura de una clase QuickModel y lista sus transformadores y configuración.

- **Uso**: "Explica la estructura de esta clase."
- **Salida**: Resumen de campos y transformadores aplicados.

### `list_transformers`

Lista todos los transformadores de datos disponibles registrados en el sistema.

- **Uso**: "¿Qué tipos puedo usar en QuickModel?"
- **Salida**: Lista de cadenas como `string`, `date`, `email`, `currency`.
