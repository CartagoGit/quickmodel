/**
 * TDD Tests: @QTransform pipeline decorator
 * Propuesta H — transformaciones post-deserialización por campo.
 */
import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';
import { QTransform } from '@/core/decorators/qtransform.decorator';

// ─────────────────────────────────────────────────────────────────────────────
// MODELOS DE PRUEBA
// ─────────────────────────────────────────────────────────────────────────────

interface IUser {
	email: string;
	name: string;
	bio: string;
}

@Quick()
class UserModel extends QModel<IUser> {
	@QTransform((val: string) => val.trim().toLowerCase())
	declare email: string;

	@QTransform((val: string) => val.trim())
	declare name: string;

	declare bio: string;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('@QTransform — transformación simple', () => {
	it('aplica la función de transformación al valor deserializado', () => {
		const user = new UserModel({
			email: '  Alice@Example.COM  ',
			name: '  Alice  ',
			bio: 'Some bio',
		});
		expect(user.email).toBe('alice@example.com');
	});

	it('aplica trim en el campo name', () => {
		const user = new UserModel({
			email: 'alice@example.com',
			name: '  Alice  ',
			bio: 'Some bio',
		});
		expect(user.name).toBe('Alice');
	});

	it('no afecta campos sin @QTransform', () => {
		const user = new UserModel({
			email: 'alice@example.com',
			name: 'Alice',
			bio: '  untouched  ',
		});
		expect(user.bio).toBe('  untouched  ');
	});
});

describe('@QTransform — composición (múltiples transformaciones)', () => {
	interface IProduct {
		slug: string;
	}
	@Quick()
	class ProductModel extends QModel<IProduct> {
		// Los decoradores se aplican de abajo a arriba.
		// Orden de ejecución: trim → toLowerCase → replace spaces with dashes
		@QTransform((val: string) => val.replace(/\s+/g, '-'))
		@QTransform((val: string) => val.toLowerCase())
		@QTransform((val: string) => val.trim())
		declare slug: string;
	}

	it('ejecuta las transformaciones en orden (abajo → arriba del stack)', () => {
		const product = new ProductModel({ slug: '  Hello World  ' });
		expect(product.slug).toBe('hello-world');
	});

	it('encadena las transformaciones correctamente', () => {
		// trim → toLowerCase → replace(/\s+/, '-'):
		// '  Foo  Bar  '.trim()  → 'Foo  Bar'
		// .toLowerCase()         → 'foo  bar'
		// .replace(/\s+/g, '-') → 'foo-bar'  (\s+ matches multiple spaces as one)
		const prd = new ProductModel({ slug: '  Foo  Bar  ' });
		expect(prd.slug).toBe('foo-bar');
	});
});

describe('@QTransform — interacción con tipos coercionados', () => {
	interface IEvent {
		title: string;
		startDate: Date;
	}
	@Quick({ startDate: Date })
	class EventModel extends QModel<IEvent> {
		@QTransform((val: string) => val.toUpperCase())
		declare title: string;

		declare startDate: Date;
	}

	it('la transformación se aplica DESPUÉS de la coerción de tipos', () => {
		const evt = new EventModel({
			title: 'concert',
			startDate: '2026-06-01',
		} as unknown as IEvent); // @quickmodel-rule-ignore: no-as-unknown
		expect(evt.title).toBe('CONCERT');
		expect(evt.startDate).toBeInstanceOf(Date);
	});
});

describe('@QTransform — valor undefined/null', () => {
	interface IMaybe {
		label: string;
	}
	@Quick()
	class MaybeModel extends QModel<IMaybe> {
		@QTransform((val: string | undefined) => val?.trim() ?? '')
		declare label: string;
	}

	it('recibe undefined si el campo está ausente', () => {
		const obj = new MaybeModel({} as unknown as IMaybe); // @quickmodel-rule-ignore: no-as-unknown
		expect(obj.label).toBe('');
	});
});

describe('@QTransform — serialize() y copy()', () => {
	it('serialize() devuelve el valor ya transformado', () => {
		const user = new UserModel({
			email: '  Alice@Example.COM  ',
			name: 'Alice',
			bio: '',
		});
		const plain = user.$qSerialize() as Record<string, unknown>;
		expect(plain['email']).toBe('alice@example.com');
	});

	it('copy() preserva el valor transformado del original (no re-aplica transform al partial)', () => {
		// copy() pasa por deserializer, no por new Constructor().
		// Los partials llegan como están; el transform se aplica solo en construcción normal.
		const user = new UserModel({
			email: 'alice@example.com',
			name: 'Alice',
			bio: '',
		});
		// Al no pasar partial en email, el email del original se conserva ya transformado
		const clone = user.$qCopy({});
		expect(clone.email).toBe('alice@example.com');
	});
});

describe('@QTransform — herencia', () => {
	interface IAdmin extends IUser {
		role: string;
	}
	@Quick()
	class AdminModel extends UserModel {
		@QTransform((val: string) => val.trim().toUpperCase())
		declare role: string;
	}

	it('hereda las transformaciones del padre y aplica las propias', () => {
		const admin = new AdminModel({
			email: '  ADMIN@EXAMPLE.COM  ',
			name: '  Admin  ',
			bio: '',
			role: '  superadmin  ',
		} as unknown as IAdmin); // @quickmodel-rule-ignore: no-as-unknown
		expect(admin.email).toBe('admin@example.com'); // del padre
		expect(admin.role).toBe('SUPERADMIN'); // del hijo
	});
});
