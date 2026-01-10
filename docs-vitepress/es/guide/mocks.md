# Generación de Mocks

QuickModel incluye generación de mocks integrada usando [@faker-js/faker](https://fakerjs.dev/), facilitando la creación de datos de prueba.

## Instalación

La generación de mocks requiere `@faker-js/faker` como dependencia de desarrollo:

```bash
npm install --save-dev @faker-js/faker
```

## Uso Básico

Usa el método estático `mock()` para generar datos mock:

```typescript
@Quick()
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare email: string;
}

// Generar un solo mock
const mockUser = User.mock();

// Generar múltiples mocks
const users = User.mock(5);

// Mock con valores personalizados
const customUser = User.mock({
	name: 'Alice Smith',
	email: 'alice@example.com',
});
```

## Mocks Específicos por Tipo

QuickModel genera datos mock apropiados basados en los tipos de propiedad:

- **Primitivos:** Números, strings, booleanos aleatorios
- **Dates:** Fechas recientes aleatorias
- **BigInt:** Números grandes aleatorios
- **Collections:** Sets y Maps aleatorios
- **Arrays:** Arrays con transformaciones

## Modelos Anidados

Los mocks se generan recursivamente para modelos anidados.

## Generadores de Mock Personalizados

Sobrescribe la generación de mock predeterminada para propiedades específicas.

## Patrones de Testing

### Tests Unitarios

```typescript
describe('UserService', () => {
	it('should create a user', () => {
		const mockUser = User.mock({
			name: 'Test User',
		});
		const result = userService.create(mockUser);
		expect(result.name).toBe('Test User');
	});
});
```

### Fixtures

Crea fixtures de prueba reutilizables.

### Poblar Bases de Datos

Usa mocks para poblar bases de datos de prueba.

## Mejores Prácticas

1. **Usa Mocks Solo en Tests**
2. **Sobrescribe Campos Críticos**
3. **Crea Fixtures Reutilizables**
4. **Pobla Datos Realistas**

## Próximos Pasos

- [Ejemplos](/es/examples/basic) - Ve mocks en ejemplos reales
- [QModel](/es/guide/qmodel) - Aprende más sobre métodos del modelo
