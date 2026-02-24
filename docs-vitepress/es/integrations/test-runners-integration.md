# Otros frameworks de testing

Los matchers de QuickModel exponen funciones `{ pass, message() }` puras que se integran
con **cualquier** framework de testing JavaScript independientemente de su API de aserciones.

## Cobertura de esta guía

| Framework                    | Estilo de API       | ¿Necesita adaptador? |
| ---------------------------- | ------------------- | -------------------- |
| [Mocha + Chai](#mocha--chai) | Plugin `chai.use()` | Wrapper ligero       |
| [Node:test](#nodetest)       | `assert.*`          | Helpers de assert    |
| [AVA](#ava)                  | Macros `t.*`        | Helpers de macro     |

## Mocha + Chai

Los plugins de Chai extienden el prototipo de `chai.Assertion` vía `chai.use()`.
Crea un plugin y llámalo una vez en tu fichero de setup:

### Plugin

```typescript
// test/setup/quickmodel-chai.ts
import type * as Chai from 'chai';
import { quickmodelMatchers } from '@cartago-git/quickmodel/matchers';

export function quickmodelChaiPlugin(chai: Chai.ChaiStatic): void {
	chai.Assertion.addMethod('validQModel', function () {
		const result = quickmodelMatchers.toBeValidQModel(this._obj);
		this.assert(result.pass, result.message(), result.message());
	});

	chai.Assertion.addMethod(
		'qRuleError',
		function (field: string, message?: string) {
			const result = quickmodelMatchers.toHaveQRuleError(
				this._obj,
				field,
				message
			);
			this.assert(result.pass, result.message(), result.message());
		}
	);

	chai.Assertion.addMethod('qField', function (fieldName: string) {
		const result = quickmodelMatchers.toHaveQField(this._obj, fieldName);
		this.assert(result.pass, result.message(), result.message());
	});

	chai.Assertion.addMethod('matchQModel', function (expected: object) {
		const result = quickmodelMatchers.toMatchQModel(this._obj, expected);
		this.assert(result.pass, result.message(), result.message());
	});

	chai.Assertion.addMethod('intact', function () {
		const result = quickmodelMatchers.toBeIntact(this._obj);
		this.assert(result.pass, result.message(), result.message());
	});

	chai.Assertion.addMethod('dirtyField', function (field: string) {
		const result = quickmodelMatchers.toHaveDirtyField(this._obj, field);
		this.assert(result.pass, result.message(), result.message());
	});
}
```

### Registro (`.mocharc.ts` / `--require`)

```typescript
// test/setup/setup.ts  (cargado vía --require)
import * as chai from 'chai';
import { quickmodelChaiPlugin } from './quickmodel-chai';
chai.use(quickmodelChaiPlugin);
```

```bash
# .mocharc.cjs
module.exports = { require: ['test/setup/setup.ts'] };
```

### Uso

```typescript
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { SubscriptionDto } from '../src/dtos';

describe('SubscriptionDto', () => {
	it('debe ser válida', () => {
		const dto = new SubscriptionDto({
			planId: 'pro',
			seatsCount: 5,
			pricePerSeat: 9.99,
		});
		expect(dto).to.be.validQModel();
	});

	it('debe reportar plan inválido', () => {
		const dto = new SubscriptionDto({
			planId: 'gold',
			seatsCount: 5,
			pricePerSeat: 9.99,
		});
		expect(dto).to.have.qRuleError(
			'planId',
			'El plan debe ser free, pro o enterprise'
		);
	});

	it('debe detectar campo sucio tras mutación', () => {
		const dto = new SubscriptionDto({
			planId: 'pro',
			seatsCount: 5,
			pricePerSeat: 9.99,
		});
		dto.seatsCount = 10;
		expect(dto).to.have.dirtyField('seatsCount');
		expect(dto).to.not.have.dirtyField('planId');
	});
});
```

---

## Node:test

Node.js 18+ incluye un runner nativo (`node:test`) que usa aserciones estilo `assert.*`.
Construye una capa de helpers delgada sobre `quickmodelMatchers`:

### Helpers

```typescript
// test/helpers/quickmodel-assert.ts
import { quickmodelMatchers } from '@cartago-git/quickmodel/matchers';

class AssertionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AssertionError';
	}
}

export const assertQModel = {
	isValid(instance: object): void {
		const res = quickmodelMatchers.toBeValidQModel(instance);
		if (!res.pass) throw new AssertionError(res.message());
	},
	isInvalid(instance: object): void {
		const res = quickmodelMatchers.toBeValidQModel(instance);
		if (res.pass) throw new AssertionError(res.message());
	},
	hasRuleError(instance: object, field: string, message?: string): void {
		const res = quickmodelMatchers.toHaveQRuleError(
			instance,
			field,
			message
		);
		if (!res.pass) throw new AssertionError(res.message());
	},
	hasQField(instance: object, fieldName: string): void {
		const res = quickmodelMatchers.toHaveQField(instance, fieldName);
		if (!res.pass) throw new AssertionError(res.message());
	},
	matches(received: object, expected: object): void {
		const res = quickmodelMatchers.toMatchQModel(received, expected);
		if (!res.pass) throw new AssertionError(res.message());
	},
	isIntact(instance: object): void {
		const res = quickmodelMatchers.toBeIntact(instance);
		if (!res.pass) throw new AssertionError(res.message());
	},
	isDirty(instance: object, field: string): void {
		const res = quickmodelMatchers.toHaveDirtyField(instance, field);
		if (!res.pass) throw new AssertionError(res.message());
	},
	isClean(instance: object, field: string): void {
		const res = quickmodelMatchers.toHaveDirtyField(instance, field);
		if (res.pass) throw new AssertionError(res.message());
	},
};
```

### Uso

```typescript
// test/invoice.test.ts
import { describe, it } from 'node:test';
import { assertQModel } from './helpers/quickmodel-assert';
import { InvoiceDto } from '../src/dtos';

describe('InvoiceDto', () => {
	it('factura válida pasa todas las reglas', () => {
		const inv = new InvoiceDto({
			invoiceId: 'FAC-000001',
			totalAmount: 1234.56,
			vatRate: 21,
		});
		assertQModel.isValid(inv);
	});

	it('detecta importe negativo', () => {
		const inv = new InvoiceDto({
			invoiceId: 'FAC-000001',
			totalAmount: -100,
			vatRate: 21,
		});
		assertQModel.hasRuleError(
			inv,
			'totalAmount',
			'El importe total no puede ser negativo'
		);
	});

	it('rastrea campo sucio tras mutación', () => {
		const inv = new InvoiceDto({
			invoiceId: 'FAC-000001',
			totalAmount: 500,
			vatRate: 21,
		});
		inv.totalAmount = 999;
		assertQModel.isDirty(inv, 'totalAmount');
		assertQModel.isClean(inv, 'vatRate');
	});
});
```

---

## AVA

AVA es un runner concurrente con API `t.*`.
El patrón más sencillo son **helpers de macro** que reciben el contexto de ejecución `t`:

### Helpers de macro

```typescript
// test/helpers/quickmodel-ava.ts
import type { ExecutionContext } from 'ava';
import { quickmodelMatchers } from '@cartago-git/quickmodel/matchers';

export const qModelMacros = {
	assertValid(ctl: ExecutionContext, model: object): void {
		const res = quickmodelMatchers.toBeValidQModel(model);
		ctl.true(res.pass, res.message());
	},
	assertInvalid(ctl: ExecutionContext, model: object): void {
		const res = quickmodelMatchers.toBeValidQModel(model);
		ctl.false(res.pass, res.message());
	},
	assertRuleError(
		ctl: ExecutionContext,
		model: object,
		field: string,
		msg?: string
	): void {
		const res = quickmodelMatchers.toHaveQRuleError(model, field, msg);
		ctl.true(res.pass, res.message());
	},
	assertHasField(ctl: ExecutionContext, model: object, field: string): void {
		const res = quickmodelMatchers.toHaveQField(model, field);
		ctl.true(res.pass, res.message());
	},
	assertMatches(
		ctl: ExecutionContext,
		received: object,
		expected: object
	): void {
		const res = quickmodelMatchers.toMatchQModel(received, expected);
		ctl.true(res.pass, res.message());
	},
	assertIntact(ctl: ExecutionContext, model: object): void {
		const res = quickmodelMatchers.toBeIntact(model);
		ctl.true(res.pass, res.message());
	},
	assertDirty(ctl: ExecutionContext, model: object, field: string): void {
		const res = quickmodelMatchers.toHaveDirtyField(model, field);
		ctl.true(res.pass, res.message());
	},
	assertClean(ctl: ExecutionContext, model: object, field: string): void {
		const res = quickmodelMatchers.toHaveDirtyField(model, field);
		ctl.false(res.pass, res.message());
	},
};
```

### Uso

```typescript
// test/report.test.ts
import test from 'ava';
import { qModelMacros as qm } from './helpers/quickmodel-ava';
import { ReportDto } from '../src/dtos';

test('informe válido pasa', (t) => {
	const report = new ReportDto({
		reportId: 'RPT-AB1234',
		title: 'Q4 2025',
		score: 87,
	});
	qm.assertValid(t, report);
	qm.assertIntact(t, report);
	qm.assertHasField(t, report, 'title');
});

test('informe inválido falla', (t) => {
	const report = new ReportDto({ reportId: 'mal', title: 'X', score: 150 });
	qm.assertInvalid(t, report);
	qm.assertRuleError(t, report, 'reportId', 'ID de informe inválido');
	qm.assertRuleError(t, report, 'title', 'El título es demasiado corto');
	qm.assertRuleError(
		t,
		report,
		'score',
		'La puntuación debe estar entre 0 y 100'
	);
});

test('rastrea campos sucios', (t) => {
	const report = new ReportDto({
		reportId: 'RPT-AB1234',
		title: 'Q4 2025',
		score: 87,
	});
	report.score = 100;
	qm.assertDirty(t, report, 'score');
	qm.assertClean(t, report, 'title');
});
```

---

## ¿Cuál elegir?

| Tu runner        | Enfoque recomendado                                  |
| ---------------- | ---------------------------------------------------- |
| Vitest           | `expect.extend(quickmodelMatchers)` — soporte nativo |
| Bun              | `expect.extend(quickmodelMatchers)` — soporte nativo |
| **Jest**         | `expect.extend(quickmodelMatchers)` — API idéntica   |
| **Jasmine**      | Adaptador `toJasmineMatchers()`                      |
| **Mocha + Chai** | Plugin `quickmodelChaiPlugin`                        |
| **Node:test**    | Helpers `assertQModel.*`                             |
| **AVA**          | Helpers `qModelMacros.*`                             |

## Véase también

- [Vitest Custom Matchers](./vitest-matchers.md)
- [Integración con Jest](./jest-integration.md)
- [Validación con @QRule](../guide/validation.md)
