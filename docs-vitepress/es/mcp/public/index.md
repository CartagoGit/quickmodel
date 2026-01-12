# Herramientas MCP Públicas

Estas herramientas están diseñadas para ayudar a los desarrolladores a **usar** QuickModel efectivamente en sus aplicaciones.

## Creación y Validación de Modelos

### `create_model`

Genera una definición completa de clase TypeScript para un `QModel` a partir de una descripción simple.

- **Uso**: "Crea un modelo Usuario con nombre, email y edad."
- **Salida**: Una clase totalmente decorada usando `@Quick` y `@QType`.

### `validate_usage`

Analiza un fragmento de código buscando errores comunes de uso de QuickModel.

- **Uso**: "Revisa si esta definición de modelo es correcta: [código]"
- **Comprobaciones**: Falta de `declare`, uso incorrecto de decoradores, tipos incorrectos.

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
