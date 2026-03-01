import { describe, expect, test } from 'bun:test';
import { QModel } from '@/index';
import { Quick } from '@/core/decorators/quick.decorator';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

interface IUserFilter {
	role: string;
	age: number;
	active: boolean;
	createdAt: Date;
	tags: string[];
	ids: number[];
}

interface ISimplePrimitive {
	name: string;
	score: number;
	enabled: boolean;
}

interface IArrayOnly {
	items: string[];
	counts: number[];
}

interface INoTypeMap {
	foo: string;
	bar: string;
}

@Quick({ createdAt: Date, tags: [String], ids: [Number], age: Number })
class UserFilterDto extends QModel<IUserFilter> {
	declare role: string;
	declare age: number;
	declare active: boolean;
	declare createdAt: Date;
	declare tags: string[];
	declare ids: number[];
}

@Quick({ score: Number })
class SimplePrimitiveDto extends QModel<ISimplePrimitive> {
	declare name: string;
	declare score: number;
	declare enabled: boolean;
}

@Quick({ items: [String], counts: [Number] })
class ArrayOnlyDto extends QModel<IArrayOnly> {
	declare items: string[];
	declare counts: number[];
}

@Quick()
class NoTypeMapDto extends QModel<INoTypeMap> {
	declare foo: string;
	declare bar: string;
}

interface IWithBoolAndBigInt {
	flag: boolean;
	amount: bigint;
}

@Quick({ flag: Boolean, amount: BigInt })
class BoolBigIntDto extends QModel<IWithBoolAndBigInt> {
	declare flag: boolean;
	declare amount: bigint;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('QModel.fromURL — escalares: coerción de tipos', () => {
	test('convierte string → number para campos con spec Number', () => {
		const params = new URLSearchParams('age=25&role=admin');
		const dto = UserFilterDto.fromURL(params);
		expect(dto.age).toBe(25);
		expect(typeof dto.age).toBe('number');
	});

	test('mantiene string para campos sin spec en typeMap', () => {
		const params = new URLSearchParams('age=30&role=admin');
		const dto = UserFilterDto.fromURL(params);
		expect(dto.role).toBe('admin');
		expect(typeof dto.role).toBe('string');
	});

	test('convierte string → Date para campos con spec Date', () => {
		const params = new URLSearchParams('createdAt=2026-01-15');
		const dto = UserFilterDto.fromURL(params);
		expect(dto.createdAt).toBeInstanceOf(Date);
		expect(dto.createdAt.toISOString()).toContain('2026-01-15');
	});

	test('pasa boolean como string (sin spec boolean nativa)', () => {
		const params = new URLSearchParams('active=true');
		const dto = UserFilterDto.fromURL(params);
		// sin transformer boolean en typeMap → queda como string 'true'
		expect(String(dto.active)).toBe('true');
	});

	test('campo ausente en URLSearchParams → undefined en el modelo', () => {
		const params = new URLSearchParams('role=viewer');
		const dto = UserFilterDto.fromURL(params);
		expect(dto.tags).toBeUndefined();
	});
});

describe('QModel.fromURL — arrays: getAll() para specs [Type]', () => {
	test('múltiples valores → array (string[])', () => {
		const params = new URLSearchParams('tags=read&tags=write&tags=admin');
		const dto = UserFilterDto.fromURL(params);
		expect(dto.tags).toEqual(['read', 'write', 'admin']);
	});

	test('múltiples valores numéricos → number[] con coerción', () => {
		const params = new URLSearchParams('ids=1&ids=2&ids=3');
		const dto = UserFilterDto.fromURL(params);
		expect(dto.ids).toEqual([1, 2, 3]);
		dto.ids.forEach((val) => expect(typeof val).toBe('number'));
	});

	test('un solo valor para campo array → array de un elemento', () => {
		const params = new URLSearchParams('tags=solo');
		const dto = UserFilterDto.fromURL(params);
		expect(dto.tags).toEqual(['solo']);
	});

	test('campo array ausente → undefined (no array vacío)', () => {
		const params = new URLSearchParams('role=admin');
		const dto = UserFilterDto.fromURL(params);
		expect(dto.tags).toBeUndefined();
	});

	test('ArrayOnlyDto — items string[] y counts number[]', () => {
		const params = new URLSearchParams(
			'items=a&items=b&counts=10&counts=20'
		);
		const dto = ArrayOnlyDto.fromURL(params);
		expect(dto.items).toEqual(['a', 'b']);
		expect(dto.counts).toEqual([10, 20]);
	});
});

describe('QModel.fromURL — casos mixtos y edge cases', () => {
	test('mezcla de escalares y arrays en la misma llamada', () => {
		const params = new URLSearchParams(
			'role=admin&age=42&tags=read&tags=write&createdAt=2026-03-01'
		);
		const dto = UserFilterDto.fromURL(params);
		expect(dto.role).toBe('admin');
		expect(dto.age).toBe(42);
		expect(dto.tags).toEqual(['read', 'write']);
		expect(dto.createdAt).toBeInstanceOf(Date);
	});

	test('URLSearchParams vacío → instancia con todos los campos undefined', () => {
		const params = new URLSearchParams('');
		const dto = UserFilterDto.fromURL(params);
		expect(dto.role).toBeUndefined();
		expect(dto.tags).toBeUndefined();
		expect(dto.age).toBeUndefined();
	});

	test('campo en URL no declarado en typeMap → tratado como escalar', () => {
		const params = new URLSearchParams('foo=hello&bar=world');
		const dto = NoTypeMapDto.fromURL(params);
		expect(dto.foo).toBe('hello');
		expect(dto.bar).toBe('world');
	});

	test('clase sin typeMap — todos los campos como escalar', () => {
		const params = new URLSearchParams('foo=x&bar=y');
		const dto = NoTypeMapDto.fromURL(params);
		expect(dto.foo).toBe('x');
		expect(dto.bar).toBe('y');
	});

	test('fromURL devuelve instancia de la subclase correcta', () => {
		const params = new URLSearchParams('name=Ana&score=99');
		const dto = SimplePrimitiveDto.fromURL(params);
		expect(dto).toBeInstanceOf(SimplePrimitiveDto);
		expect(dto.name).toBe('Ana');
		expect(dto.score).toBe(99);
	});

	test('parámetros extra no declarados en el modelo son ignorados o preservados según config', () => {
		const params = new URLSearchParams('role=admin&unknownField=xyz');
		const dto = UserFilterDto.fromURL(params);
		expect(dto.role).toBe('admin');
		// unknownField no es parte del modelo; no debe lanzar error
	});
});

describe('QModel.fromURL — coerciones Boolean y BigInt', () => {
	test('convierte "true" → true con spec Boolean', () => {
		const params = new URLSearchParams('flag=true');
		const dto = BoolBigIntDto.fromURL(params);
		expect(dto.flag).toBe(true);
		expect(typeof dto.flag).toBe('boolean');
	});

	test('convierte "false" → false con spec Boolean', () => {
		const params = new URLSearchParams('flag=false');
		const dto = BoolBigIntDto.fromURL(params);
		expect(dto.flag).toBe(false);
	});

	test('convierte string numérico → BigInt con spec BigInt', () => {
		const params = new URLSearchParams('amount=9007199254740993');
		const dto = BoolBigIntDto.fromURL(params);
		expect(typeof dto.amount).toBe('bigint');
		expect(dto.amount).toBe(9007199254740993n);
	});
});
