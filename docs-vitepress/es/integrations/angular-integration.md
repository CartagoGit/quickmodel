# Integración con Angular

QuickModel funciona como capa de validación y tipo en cualquier versión de Angular. Reemplaza `@angular/forms` + validators personalizados con un contrato de tipos compilado.

## Patrones principales

| Caso de uso              | Solución QuickModel                      |
| ------------------------ | ---------------------------------------- |
| Reactive Forms           | Clase plana + `qCheckRules()`            |
| Servicios / Repositorios | `QModel` + `$qCopy()` inmutable          |
| Signals                  | `signal(new Model(data))` + `update()`   |
| Interceptores HTTP       | DTO con `unknownPropertyPolicy: 'strip'` |
| Validación asíncrona     | `@QRule` async + `qCheckRulesAsync()`    |

## Reactive Forms

### Formulario de usuario básico

```typescript
// user-form.ts
import { QField, QRule } from 'quickmodel';
import { qCheckRules } from 'quickmodel/forms';

class UserForm {
	@QField({ label: 'Nombre de usuario', required: true })
	@QRule((v: string) => v.length >= 3, 'Demasiado corto')
	username = '';

	@QField({ label: 'Email', widget: 'email' })
	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Email inválido'
	)
	email = '';
}

// En el componente Angular:
const form = new UserForm();
form.username = control.value;
const { valid, errors } = qCheckRules(form);
```

### Integración con FormGroup

```typescript
// user-form.component.ts
@Component({ ... })
export class UserFormComponent {
  form = new UserForm();

  validate(): void {
    const { valid, errors } = qCheckRules(this.form);
    if (valid) {
      this.userService.create(this.form);
    }
  }
}
```

::: tip Dos patrones disponibles

- **Clase plana** (arriba): solo `@QRule` + `@QField` — sin herencia de `QModel`. Ideal para Reactive Forms con validación pura.
- **Con `QModel` + `@Quick`** (abajo): añade coerción de tipos, `$qCopy()` inmutable, `$qSerialize()` y `@QComputed`. Ideal para servicios, repositorios e interceptores HTTP.
  :::

## Servicio con QModel

```typescript
// user-record.model.ts
import { QModel, Quick, QField, QRule } from 'quickmodel';

@Quick({ id: 'string', name: 'string', score: 'number', active: 'boolean' })
class UserRecord extends QModel<IUser> {
	@QField({ label: 'Nombre', required: true })
	declare name: string;

	@QField({ label: 'Puntuación' })
	@QRule((v: number) => v >= 0 && v <= 100, 'Rango inválido')
	declare score: number;

	declare id: string;
	declare active: boolean;
}
```

### UserDataService

```typescript
// user-data.service.ts
@Injectable({ providedIn: 'root' })
export class UserDataService {
	private store = new Map<string, UserRecord>();

	add(data: IUser): void {
		const record = new UserRecord(data);
		this.store.set(record.id, record);
	}

	update(id: string, patch: Partial<IUser>): boolean {
		const record = this.store.get(id);
		if (!record) return false;
		// $qCopy() es INMUTABLE — captura la nueva instancia
		const updated = record.$qCopy(patch);
		this.store.set(id, updated);
		return true;
	}
}
```

## Signals

```typescript
// profile-signal.component.ts
@Component({ ... })
export class ProfileComponent {
  // Inicializa la señal con un QModel
  profile = signal(new ProfileModel({ bio: '', followers: 0 }));

  updateFollowers(count: number): void {
    this.profile.update(prev => prev.$qCopy({ followers: count }));
    //                              ↑ $qCopy() devuelve nueva instancia
  }

  isBioDirty(): boolean {
    const model = this.profile();
    model.bio = 'Nueva bio'; // mutación directa para detectar dirty
    return model.$qIsDirty();
  }
}
```

### `$qCopy()` vs `$qPatch()` — distinción crítica para señales

| Método             | Retorna                | ¿Dispara Change Detection? | Uso con señales |
| ------------------ | ---------------------- | -------------------------- | --------------- |
| `$qCopy(partial)`  | Nueva instancia        | ✅ Sí — nueva referencia   | ✅ Siempre      |
| `$qPatch(partial)` | `void` (muta in-place) | ❌ No                      | ❌ Nunca        |

```typescript
// ❌ Anti-patrón: $qPatch() muta in-place, la versión de la señal NO incrementa
//    El template de Angular NO se re-renderiza
signal.update((model) => {
	model.$qPatch({ score: 98 }); // void — instancia original mutada
	return model; // misma referencia → sin change detection
});

// ✅ Correcto: $qCopy() devuelve nueva instancia → incrementa versión → re-render
signal.update((model) => model.$qCopy({ score: 98 }));
```

::: warning La mutación directa es invisible para las señales de Angular
Incluso sin `.update()`, mutar una propiedad del modelo directamente (`model.score = 98`) **NO notifica a la señal**. Angular solo dispara change detection cuando se llama a `.set()` o `.update()`:

```typescript
const cartSignal = signal(new Cart({ userId: 'u1', total: 50 }));

// ❌ Mutación silenciosa — el template NO se actualiza
cartSignal().total = 100;

// ✅ Actualización consciente de la señal — el template se actualiza
cartSignal.update((cart) => cart.$qCopy({ total: 100 }));
```

:::

### `reactiveModel()` — hacer que la mutación directa sea reactiva

Puedes convertir la mutación directa en una notificación de la señal envolviendo el modelo en un `Proxy` que intercepta cada trap `set` y llama internamente a `sig.update(m => m.$qCopy({...}))`. Esto crea una nueva instancia en cada asignación, que Angular detecta como cambio de referencia.

Copia esta utilidad en tu proyecto Angular (Angular no es una dependencia de QuickModel, por lo que no puede incluirse directamente en la librería):

```typescript
// utils/reactive-model.ts
import { signal, type WritableSignal } from '@angular/core';
import { QModel } from 'quickmodel';

type IReactiveModel<T extends QModel<any>> = T & {
	/** La señal subyacente. Úsala para computed() / effect(). */
	readonly $signal: WritableSignal<T>;
};

export function reactiveModel<T extends QModel<any>>(
	instance: T
): IReactiveModel<T> {
	const sig = signal(instance);

	return new Proxy(instance, {
		get(_, key) {
			if (key === '$signal') return sig;
			const current = sig();
			const val = (current as Record<string, unknown>)[key as string];
			if (typeof val === 'function')
				return (val as Function).bind(current);
			return val;
		},
		set(_, key, value) {
			if (typeof key !== 'string') return false;
			// $qCopy() → nueva instancia → nueva referencia → Angular detecta el cambio
			sig.update((mdl) => mdl.$qCopy({ [key]: value } as Partial<T>));
			return true;
		},
	}) as IReactiveModel<T>;
}
```

Uso en un componente:

```typescript
@Component({ ... })
export class CartComponent {
	readonly cart = reactiveModel(
		new Cart({ userId: 'u1', total: 0, updatedAt: new Date() })
	);

	// ✅ Asignación directa — Angular re-renderiza automáticamente
	addItem(price: number): void {
		this.cart.total += price; // internamente: sig.update(m => m.$qCopy({ total: ... }))
	}

	// Derived desde la señal subyacente
	readonly totalConIva = computed(() => this.cart.$signal().total * 1.21);

	// Para actualizaciones masivas, usa $signal directamente
	replaceCart(data: ICart): void {
		this.cart.$signal.set(new Cart(data));
	}
}
```

::: details Cómo funciona

1. Cada `this.cart.total = x` activa el trap `set` del Proxy.
2. El trap llama a `sig.update(m => m.$qCopy({ total: x }))`, que produce una **nueva instancia**.
3. Angular detecta la nueva referencia y programa un re-render.
4. Cada lectura `this.cart.total` activa el trap `get`, que lee de `sig()` — siempre el valor más reciente.

**Contrapartida:** cada asignación crea una nueva instancia del modelo mediante `$qCopy()`. Para actualizaciones de alta frecuencia (eventos de puntero, audio...) agrupa los cambios en una sola llamada `$signal.update(m => m.$qCopy({...}))`.
:::

### `computed()` — estado derivado desde una señal de modelo

```typescript
import { signal, computed } from '@angular/core';

const cart = signal(
	new Cart({ userId: 'u1', total: 60, updatedAt: '2025-01-01' })
);

// Los valores derivados se actualizan automáticamente cuando cambia la señal
const totalConIva = computed(() => cart().total * 1.21);
const etiqueta = computed(
	() => `Carrito de ${cart().userId}: $${cart().total}`
);

// Serializado para llamadas a la API
const payload = computed(() => cart().$qSerialize());

cart.update((c) => c.$qCopy({ total: 80 }));
console.log(totalConIva()); // 96.8
console.log(payload().updatedAt); // string ISO — Date serializado
```

### Los tipos complejos (Date, Set, BigInt) sobreviven a los updates de señal

`$qCopy()` ejecuta el pipeline completo de deserialización de QuickModel. Pasar un `Date` o `Set` directamente en el partial preserva el tipo:

```typescript
const product = signal(
	new Product({
		sku: 'X1',
		price: 50,
		releasedAt: '2024-01-01',
		tags: ['oferta'],
	})
);

// Pasando un Date → sigue siendo Date en la nueva instancia ✅
product.update((p) => p.$qCopy({ releasedAt: new Date('2025-06-01') }));
console.log(product().releasedAt instanceof Date); // true

// Pasando un Set → sigue siendo Set ✅
product.update((p) => p.$qCopy({ tags: new Set(['oferta', 'destacado']) }));
console.log(product().tags instanceof Set); // true
```

### Señales múltiples — composición

```typescript
const cart = signal(new Cart({ userId: 'u1', total: 200 }));
const descuento = signal(0.1); // 10%

// computed compuesto — reacciona a cambios en cualquiera de las dos señales
const precioFinal = computed(() => cart().total * (1 - descuento()));

descuento.set(0.2);
console.log(precioFinal()); // 160
```

## Interceptor HTTP

```typescript
// api-item.dto.ts
@Quick(
  { id: 'string', title: 'string', price: 'number', category: 'string' },
  { unknownPropertyPolicy: 'strip' }
)
class ApiItemDto extends QModel<IApiItem> {
  declare id: string;
  declare title: string;
  declare price: number;
  declare category: string;
}

// En el interceptor:
intercept(req: HttpRequest<any>, next: HttpHandler) {
  return next.handle(req).pipe(
    map(event => {
      if (event instanceof HttpResponse && Array.isArray(event.body)) {
        const dtos = event.body.map(item => new ApiItemDto(item));
        return event.clone({ body: dtos.map(d => d.$qSerialize()) });
      }
      return event;
    })
  );
}
```

## Validación asíncrona

```typescript
// async-user.dto.ts
import { qCheckRulesAsync } from 'quickmodel/forms';

class AsyncUserDto {
	@QRule(async (username: string) => {
		const taken = await userService.exists(username);
		return !taken;
	}, 'Nombre de usuario ya en uso')
	username = '';
}

// En el componente
const dto = new AsyncUserDto();
dto.username = value;
const result = await qCheckRulesAsync(dto);
// result.valid, result.errors
```

::: tip $qCopy() es inmutable
`$qCopy()` devuelve una **nueva instancia** — la original no se modifica. Siempre captura el resultado:

```typescript
const updated = record.$qCopy({ score: 90 });
this.store.set(id, updated); // guarda la nueva instancia
```

:::
