# Integración con Angular

QuickModel funciona como capa de validación y tipo en cualquier versión de Angular. Reemplaza `@angular/forms` + validators personalizados con un contrato de tipos compilado.

## Patrones principales

| Caso de uso              | Solución QuickModel                      |
| ------------------------ | ---------------------------------------- |
| Reactive Forms           | Clase plana + `qCheckRules()`            |
| Servicios / Repositorios | `QModel` + `merge()` inmutable           |
| Signals                  | `signal(new Model(data))` + `update()`   |
| Interceptores HTTP       | DTO con `unknownPropertyPolicy: 'strip'` |
| Validación asíncrona     | `@QRule` async + `qCheckRulesAsync()`    |

## Reactive Forms

### Formulario de usuario básico

```typescript
// user-form.ts
import { QField, QRule, qCheckRules } from '@cartago-git/quickmodel';

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

## Servicio con QModel

```typescript
// user-record.model.ts
import { QModel, Quick, QField, QRule } from '@cartago-git/quickmodel';

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
		// merge() es INMUTABLE — captura la nueva instancia
		const updated = record.merge(patch);
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
    this.profile.update(prev => prev.merge({ followers: count }));
    //                              ↑ merge() devuelve nueva instancia
  }

  isBioDirty(): boolean {
    const model = this.profile();
    model.bio = 'Nueva bio'; // mutación directa para detectar dirty
    return model.isDirty();
  }
}
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
        return event.clone({ body: dtos.map(d => d.serialize()) });
      }
      return event;
    })
  );
}
```

## Validación asíncrona

```typescript
// async-user.dto.ts
import { qCheckRulesAsync } from '@cartago-git/quickmodel/core/helpers/q-check-rules-async';

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

::: tip merge() es inmutable
`merge()` devuelve una **nueva instancia** — la original no se modifica. Siempre captura el resultado:

```typescript
const updated = record.merge({ score: 90 });
this.store.set(id, updated); // guarda la nueva instancia
```

:::
