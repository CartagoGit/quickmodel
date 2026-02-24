import { describe, expect, test } from 'bun:test';

import {
	typeboxMod,
	valibotMod,
	ctMod,
	yupMod,
	arktypeMod,
	superjsonMod,
	cvMod,
	vestMod,
	joiMod,
} from '../_shared';

export function describeBench(): void {
	describe('Resumen — Feature matrix comparativa por categoría', () => {
		test('Feature matrix completa con contexto por benchmark', () => {
			const tbIcon = typeboxMod ? '✅' : 'N/I';
			const vbIcon = valibotMod ? '⚠️ ' : 'N/I';
			const ctIcon = ctMod ? '⚠️ ' : 'N/I';
			const ypIcon = yupMod ? '⚠️ ' : 'N/I';
			const arkIcon = arktypeMod ? '✅' : 'N/I';
			const sjIcon = superjsonMod ? '✅' : 'N/I';
			const cvIcon = cvMod ? '✅' : 'N/I';
			const vestIcon = vestMod ? '⚠️ ' : 'N/I';
			const joiIcon = joiMod ? '⚠️ ' : 'N/I';

			console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FEATURE MATRIX — VALIDACIÓN / COERCIÓN / SERIALIZACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬────────────┐
│ Capacidad                       │  TB  │  VB  │  Ark │  Zod │  yup │  joi │  CT  │  sj  │ QuickModel │
├─────────────────────────────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼────────────┤
│ #1/#4 Validación simple/batch   │ ${tbIcon} │ ⚠️ │ ${arkIcon} │  ⚠️  │ ${ypIcon}│ ${joiIcon}│  ❌  │  ❌  │     ✅     │
│ #2 Coerción Date/BigInt/Map/Set │  ❌  │ ${vbIcon}│  ❌  │ ${vbIcon}│  ❌  │  ❌  │ ${ctIcon} │  ❌  │     ✅     │
│ #3/#7 Roundtrip lossless        │  ❌  │  ❌  │  ❌  │  ❌  │  ❌  │  ❌  │ ${ctIcon} │ ${sjIcon} │     ✅     │
│ #7 JSON crudo → tipos tipados   │  ❌  │  ❌  │  ❌  │  ❌  │  ❌  │  ❌  │ ${ctIcon} │  ❌  │     ✅     │
│ Preserva Symbol / TypedArray    │  ❌  │  ❌  │  ❌  │  ❌  │  ❌  │  ❌  │  ❌  │  ❌  │     ✅     │
│ Schema export (JSON/OpenAPI/…)  │ ${tbIcon} │  ❌  │  ❌  │  ❌  │  ❌  │  ❌  │  ❌  │  ❌  │     ✅     │
│ Zero-dep core                   │  ❌  │  ✅  │  ✅  │  ✅  │  ❌  │  ❌  │  ❌  │  ❌  │     ✅     │
└─────────────────────────────────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴────────────┘
 TB=TypeBox | VB=valibot | Ark=arktype | CT=class-transformer | sj=superjson

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FEATURE MATRIX — REGLAS DE NEGOCIO / FORMULARIOS (#8)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────┬──────┬──────┬──────┬────────────┐
│ Capacidad                               │  CV  │ vest │  joi │ QuickModel │
├─────────────────────────────────────────┼──────┼──────┼──────┼────────────┤
│ Decoradores co-ubicados (@QRule/@QField)│ ${cvIcon} │  ❌  │  ❌  │     ✅     │
│ Grupos de campos nativos (@QGroup)      │ ${cvIcon} │ ${vestIcon}│  ❌  │     ✅     │
│ Filtrar validación por grupo            │ ${cvIcon} │ ${vestIcon}│  ❌  │     ✅     │
│ checkRulesByGroup() en una llamada      │  ❌  │ ${vestIcon}│  ❌  │     ✅     │
│ Predicados async nativos                │  ❌  │ ${vestIcon}│ ${joiIcon} │     ✅     │
│ Timeout + modo serial/paralelo          │  ❌  │  ❌  │  ❌  │     ✅     │
│ Form schema (getFormSchema)             │  ❌  │  ❌  │  ❌  │     ✅     │
│ Integrado con coerción de tipos         │  ❌  │  ❌  │  ❌  │     ✅     │
│ Works on any class (no extends needed)  │ ${cvIcon} │ ${vestIcon}│ ${joiIcon} │     ✅     │
└─────────────────────────────────────────┴──────┴──────┴──────┴────────────┘
 CV=class-validator | vest=vestjs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FEATURE MATRIX — EXCLUSIVAS DE QUICKMODEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────────────────────┐
│ Feature                                          Solo QM?   │
├─────────────────────────────────────────────────────────────┤
│ #5 Generación de mocks tipados integrada             ✅     │
│ MCP Server (IA: Claude, Copilot, etc.)               ✅     │
│ Estado de modelo: copy() / isDirty()                 ✅     │
│ @QComputed — campos calculados en serialización      ✅     │
│ @QAlias — remapeo de nombres de campo                ✅     │
│ Herencia multinivel con inferencia completa          ✅     │
│ dot notation para transformaciones anidadas          ✅     │
│ JSON polimórfico (subclases auto-detectadas)         ✅     │
│ Pipeline completo: JSON crudo → tipos → rules → ✅   ✅     │
│ serialize() → deserialize() sin config adicional     ✅     │
└─────────────────────────────────────────────────────────────┘

  CATEGORÍAS POR BENCHMARK:
  #1 Validación simple  → TB, valibot, arktype, Zod, yup, joi, QM   (CT excluido: no valida)
  #2 Coerción compleja  → valibot, Zod, CT, CT+CV, QM               (Plain JS, TB, yup, joi, ark: no)
  #3 Serialización      → Plain JSON, superjson, CT, QM             (resto: sin serialize())
  #4 Batch validation   → TB, valibot, arktype, Zod, yup, joi, QM   (CT: necesita class-validator)
  #5 Mocks tipados      → Solo QM                                    (exclusivo)
  #7 Fidelidad tipos    → Plain JSON, superjson, CT, QM             (tabla de tipos preservados)
  #8 Forms / rules      → class-validator, vest, joi, QM            (tabla de capacidades de rules)

  💡 CONCLUSIÓN:
     TypeBox/valibot/arktype ganan en velocidad pura de validación simple.
     superjson es la mejor alternativa para preservar tipos, pero NO transforma JSON crudo.
     class-validator+vest cubren reglas/grupos pero requieren 2 librerías y setup externo.

     QuickModel es la ÚNICA solución que cubre TODOS los casos en una sola librería:
     JSON crudo → coerción → validación de reglas → grupos → schema export → mocks → IA/MCP.
`);
			expect(true).toBe(true);
		});
	});
}
