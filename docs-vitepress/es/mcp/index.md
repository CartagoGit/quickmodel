# Servidor MCP de QuickModel

QuickModel soporta nativamente el **Protocolo de Contexto de Modelo (MCP)**, permitiendo a los agentes de IA interactuar directamente con la librería. Esta integración tiene dos propósitos:

1.  **Uso Público**: Los agentes pueden usar las herramientas de QuickModel para generar, validar y simular modelos en tus proyectos.
2.  **Desarrollo Interno**: Usamos herramientas internas específicas para mantener y mejorar la propia librería.

## Primeros Pasos

Para usar el servidor MCP de QuickModel, necesitas ejecutarlo a través del script `mcp`.

```bash
bun run mcp
```

O usarlo vía `npx` (una vez publicado):

```bash
npx -y @cartago-git/quickmodel mcp
```

## Herramientas Disponibles

### Herramientas Públicas

Estas herramientas están diseñadas para uso general por cualquier agente que trabaje con QuickModel.

- **`create_model`**: Genera una clase TypeScript extendiendo `QModel` basada en una lista de propiedades.
- **`validate_usage`**: Analiza un fragmento de código para verificar errores comunes de uso.
- **`simulate_transformation`**: Simula la lógica de transformación de los decoradores `@Quick` para previsualizar resultados sin ejecutar toda la app.

### Herramientas Internas

Estas herramientas están restringidas para uso dentro del repositorio de QuickModel para mantenimiento.

- **`update_docs`**: Dispara una reconstrucción del sitio de documentación.
- **`generate_test`**: Crea un archivo de prueba unitaria base para un componente fuente dado.

## Configuración

El servidor detecta automáticamente la versión del proyecto desde `package.json`. No se requiere configuración adicional.
