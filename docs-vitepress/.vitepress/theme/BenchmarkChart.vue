<script setup lang="ts">
import { ref, computed } from 'vue';
import { useData } from 'vitepress';

const { lang } = useData();

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

interface IBenchScenario {
	key: string;
	labelEn: string;
	labelEs: string;
	notesEn: string;
	notesEs: string;
	values: Record<string, number | null>; // null = N/A para esa librería
}

interface ILibraryInfo {
	color: string;
	descEn: string;
	descEs: string;
	prosEn: string[];
	prosEs: string[];
	consEn: string[];
	consEs: string[];
}

type IFeatureValue = boolean | 'partial';

interface IFeatureRow {
	featureEn: string;
	featureEs: string;
	values: Record<string, IFeatureValue>;
}

// ─────────────────────────────────────────────────────────────
// DATOS — escenarios de benchmark
// Valores aproximados obtenidos de los tests en hardware típico.
// Ejecutar `bun run bench:compare` para ver los valores exactos.
// ─────────────────────────────────────────────────────────────

const scenarios: IBenchScenario[] = [
	{
		key: 'simple',
		labelEn: 'Simple Objects',
		labelEs: 'Objetos Simples',
		notesEn:
			'10k iterations — string/number/boolean fields. Plain JS sets the maximum baseline.',
		notesEs:
			'10k iteraciones — campos string/number/boolean. Plain JS establece el baseline máximo.',
		values: { 'Plain JS': 2_100_000, Zod: 32_000, QuickModel: 18_000 },
	},
	{
		key: 'complex',
		labelEn: 'Complex Types (Date + BigInt + Map + Set)',
		labelEs: 'Tipos Complejos (Date + BigInt + Map + Set)',
		notesEn:
			'1k iterations — auto-coercion. Plain JS cannot do this natively. Zod requires manual .transform().',
		notesEs:
			'1k iteraciones — coerción automática. Plain JS no puede hacerlo. Zod requiere .transform() manual.',
		values: { 'Plain JS': null, Zod: 9_500, QuickModel: 8_200 },
	},
	{
		key: 'roundtrip',
		labelEn: 'Serialization Roundtrip',
		labelEs: 'Roundtrip Serialización',
		notesEn:
			'1k iterations — serialize() + deserialize(). QuickModel preserves types; JSON.parse loses them.',
		notesEs:
			'1k iteraciones — serialize() + deserialize(). QuickModel preserva tipos; JSON.parse los pierde.',
		values: { 'Plain JS': 480_000, Zod: null, QuickModel: 28_000 },
	},
	{
		key: 'validation',
		labelEn: 'Runtime Validation',
		labelEs: 'Validación en Runtime',
		notesEn: '1k iterations — full runtime integrity check per object.',
		notesEs:
			'1k iteraciones — verificación completa de integridad en runtime por objeto.',
		values: { 'Plain JS': null, Zod: 34_000, QuickModel: 27_000 },
	},
	{
		key: 'mocks',
		labelEn: 'Typed Mock Generation',
		labelEs: 'Generación de Mocks Tipados',
		notesEn:
			'100 mock instances per cycle — fully typed, no manual setup. Only QuickModel has this built-in.',
		notesEs:
			'100 instancias mock por ciclo — totalmente tipadas, sin configuración manual. Solo QuickModel lo incluye.',
		values: { 'Plain JS': null, Zod: null, QuickModel: 1_200 },
	},
];

const libraries: Record<string, ILibraryInfo> = {
	'Plain JS': {
		color: '#64748b',
		descEn: 'Raw JavaScript objects — maximum speed, zero safety',
		descEs: 'Objetos JavaScript puros — velocidad máxima, sin seguridad',
		prosEn: [
			'Blazing fast (~100% baseline)',
			'Zero dependencies',
			'No overhead at all',
		],
		prosEs: [
			'Ultra rápido (~100% baseline)',
			'Sin dependencias',
			'Sin overhead',
		],
		consEn: [
			'No type coercion (Date, BigInt, Map, Set)',
			'No serialization / deserialization',
			'No runtime type integrity',
			'No mock generation',
			'No AI / MCP integration',
			'No model state (copy, isDirty)',
			'No form schemas',
			'No computed fields',
			'No business rules (@QRule)',
		],
		consEs: [
			'Sin coerción de tipos (Date, BigInt, Map, Set)',
			'Sin serialización / deserialización',
			'Sin integridad de tipos en runtime',
			'Sin generación de mocks',
			'Sin integración IA / MCP',
			'Sin estado de modelo (copy, isDirty)',
			'Sin form schemas',
			'Sin campos computados',
			'Sin reglas de negocio (@QRule)',
		],
	},
	TypeBox: {
color: '#0ea5e9',
descEn: 'Ultra-fast JSON Schema validation — compiled checks, zero overhead',
descEs: 'Validación JSON Schema ultra-rápida — checks compilados, sin overhead',
prosEn: [
'Fastest validation (~70% of Plain JS) ✅',
'Compiled JSON Schema checks ✅',
'Type inference from schemas ✅',
'Tiny bundle size ✅',
'JSON Schema export ✅',
],
prosEs: [
'Validación más rápida (~70% de Plain JS) ✅',
'Checks JSON Schema compilados ✅',
'Inferencia de tipos desde schemas ✅',
'Bundle muy pequeño ✅',
'Exportar JSON Schema ✅',
],
consEn: [
'No type coercion (Date, BigInt, Map, Set)',
'No serialization / deserialization',
'No mock generation',
'No AI / MCP integration',
'No form schemas or computed fields',
],
consEs: [
'Sin coerción de tipos (Date, BigInt, Map, Set)',
'Sin serialización / deserialización',
'Sin generación de mocks',
'Sin integración IA / MCP',
'Sin form schemas ni campos computados',
],
},
valibot: {
color: '#f59e0b',
descEn: 'Modular, tree-shakeable validation — smallest bundle in the ecosystem',
descEs: 'Validación modular y tree-shakeable — bundle más pequeño del ecosistema',
prosEn: [
'Tree-shakeable (tiny bundle) ✅',
'Fast validation (~32% of Plain JS) ✅',
'pipe() transforms for type coercion ✅',
'Type-safe schemas ✅',
],
prosEs: [
'Tree-shakeable (bundle mínimo) ✅',
'Validación rápida (~32% de Plain JS) ✅',
'pipe() con transforms para coerción ✅',
'Schemas con seguridad de tipos ✅',
],
consEn: [
'Coercion requires manual pipe(transform()) per field',
'No serialization / deserialization',
'No mock generation',
'No AI / MCP integration',
'No model state, form schemas, or computed fields',
],
consEs: [
'Coerción requiere pipe(transform()) manual por campo',
'Sin serialización / deserialización',
'Sin generación de mocks',
'Sin integración IA / MCP',
'Sin estado, form schemas ni campos computados',
],
},
	Zod: {
		color: '#8b5cf6',
		descEn: 'Schema validation library — great for validation, not full modeling',
		descEs: 'Librería de validación — excelente para validar, no para modelado completo',
		prosEn: [
			'Fast validation',
			'Type-safe schemas',
			'Runtime integrity ✅',
			'Large ecosystem',
		],
		prosEs: [
			'Validación rápida',
			'Schemas tipados',
			'Integridad en runtime ✅',
			'Gran ecosistema',
		],
		consEn: [
			'No built-in serialization (needs superjson or similar)',
			'Date/BigInt/Map/Set require manual .transform() per field',
			'No mock generation (needs @faker-js/faker + manual mapping)',
			'No built-in AI / MCP Server',
			'No model state (copy, isDirty, hasIntegrity)',
			'No polymorphic JSON (subclass instantiation)',
			'No form schemas from decorators',
			'No computed fields',
		],
		consEs: [
			'Sin serialización built-in (necesita superjson u otro)',
			'Date/BigInt/Map/Set requieren .transform() manual por campo',
			'Sin mocks (necesita @faker-js/faker + mapeo manual)',
			'Sin servidor IA / MCP integrado',
			'Sin estado de modelo (copy, isDirty, hasIntegrity)',
			'Sin JSON polimórfico (instanciación de subclases)',
			'Sin form schemas desde decoradores',
			'Sin campos computados',
		],
	},
	QuickModel: {
		color: '#3b82f6',
		descEn: 'Full TypeScript modeling platform with AI built-in',
		descEs: 'Plataforma de modelado TypeScript completa con IA integrada',
		prosEn: [
			'Auto coercion Date/BigInt/Map/Set ✅',
			'Native serialize() / deserialize() ✅',
			'Typed mock generation built-in ✅',
			'AI/MCP Server built-in ✅',
			'Automatic polymorphic JSON ✅',
			'Model state: copy(), isDirty(), hasIntegrity() ✅',
			'Form schemas: @QField, @QGroup, getFormSchema() ✅',
			'Computed fields: @QComputed ✅',
			'Async business rules: @QRule, checkRulesAsync() ✅',
			'Multi-level inheritance inference ✅',
			'Schema export: JSON / Zod / OpenAPI / GraphQL ✅',
			'Zero-dep core ✅',
		],
		prosEs: [
			'Coerción automática Date/BigInt/Map/Set ✅',
			'serialize() / deserialize() nativo ✅',
			'Generación de mocks tipados built-in ✅',
			'Servidor IA/MCP integrado ✅',
			'JSON polimórfico automático ✅',
			'Estado: copy(), isDirty(), hasIntegrity() ✅',
			'Form schemas: @QField, @QGroup, getFormSchema() ✅',
			'Campos computados: @QComputed ✅',
			'Reglas async: @QRule, checkRulesAsync() ✅',
			'Inferencia de herencia multinivel ✅',
			'Exportar schemas: JSON / Zod / OpenAPI / GraphQL ✅',
			'Core sin dependencias externas ✅',
		],
		consEn: [
			'~4x slower than plain JS for simple primitives',
			'(still <0.1ms per typical API operation — not noticeable in practice)',
		],
		consEs: [
			'~4x más lento que Plain JS para primitivos simples',
			'(sigue siendo <0.1ms por operación típica de API — imperceptible en práctica)',
		],
	},
	'class-transformer': {
		color: '#ef4444',
		descEn: 'Annotation-based class serialization — @Type decorators for Date, not BigInt/Map/Set',
		descEs: 'Serialización de clases por anotaciones — @Type para Date, sin soporte BigInt/Map/Set',
		prosEn: [
			'instanceToPlain() / plainToInstance() ✅',
			'@Type(() => Date) for Date fields ✅',
			'Polymorphic deserializeation with @Type ✅',
			'Works with existing class definitions ✅',
		],
		prosEs: [
			'instanceToPlain() / plainToInstance() ✅',
			'@Type(() => Date) para campos Date ✅',
			'Deserialización polimórfica con @Type ✅',
			'Funciona con clases existentes ✅',
		],
		consEn: [
			'No validation — needs class-validator separately',
			'BigInt, Map, Set require manual @Transform per field',
			'No mock generation',
			'No AI / MCP integration',
			'No form schemas or computed fields',
			'No async business rules',
		],
		consEs: [
			'Sin validación — necesita class-validator por separado',
			'BigInt, Map, Set requieren @Transform manual por campo',
			'Sin generación de mocks',
			'Sin integración IA / MCP',
			'Sin form schemas ni campos computados',
			'Sin reglas de negocio async',
		],
	},
	yup: {
		color: '#6b7280',
		descEn: 'Schema-based validation with async support — mature but heavy',
		descEs: 'Validación basada en schemas con soporte async — maduro pero pesado',
		prosEn: [
			'Async validation support ✅',
			'Mixed schemas (any/lazy) ✅',
			'Large ecosystem / well-known ✅',
		],
		prosEs: [
			'Soporte validación async ✅',
			'Schemas mixtos (any/lazy) ✅',
			'Gran ecosistema / muy conocido ✅',
		],
		consEn: [
			'~20x slower than TypeBox for simple validation',
			'No type coercion for BigInt, Map, Set',
			'No serialization / deserialization',
			'No mock generation',
			'No AI / MCP integration',
			'No form schemas or computed fields',
		],
		consEs: [
			'~20x más lento que TypeBox para validación simple',
			'Sin coerción para BigInt, Map, Set',
			'Sin serialización / deserialización',
			'Sin generación de mocks',
			'Sin integración IA / MCP',
			'Sin form schemas ni campos computados',
		],
	},
};

const featureRows: IFeatureRow[] = [
	{
		featureEn: 'Auto coercion (Date/BigInt/Map/Set)',
		featureEs: 'Coerción automática (Date/BigInt/Map/Set)',
		values: { 'Plain JS': false, TypeBox: false, valibot: 'partial', Zod: 'partial', 'class-transformer': 'partial', QuickModel: true, yup: false },
	},
	{
		featureEn: 'Native serialization (toJSON)',
		featureEs: 'Serialización nativa (toJSON)',
		values: { 'Plain JS': false, TypeBox: false, valibot: false, Zod: false, 'class-transformer': 'partial', QuickModel: true, yup: false },
	},
	{
		featureEn: 'Typed mock generation',
		featureEs: 'Generación de mocks tipados',
		values: { 'Plain JS': false, TypeBox: false, valibot: false, Zod: false, 'class-transformer': false, QuickModel: true, yup: false },
	},
	{
		featureEn: 'Built-in AI / MCP Server',
		featureEs: 'IA / Servidor MCP integrado',
		values: { 'Plain JS': false, TypeBox: false, valibot: false, Zod: false, 'class-transformer': false, QuickModel: true, yup: false },
	},
	{
		featureEn: 'Polymorphic JSON (subclass auto-instantiation)',
		featureEs: 'JSON polimórfico (subclases automáticas)',
		values: { 'Plain JS': false, TypeBox: false, valibot: false, Zod: false, 'class-transformer': 'partial', QuickModel: true, yup: false },
	},
	{
		featureEn: 'Model state: copy() / isDirty()',
		featureEs: 'Estado del modelo: copy() / isDirty()',
		values: { 'Plain JS': false, TypeBox: false, valibot: false, Zod: false, 'class-transformer': false, QuickModel: true, yup: false },
	},
	{
		featureEn: 'Form schemas (@QField / @QGroup)',
		featureEs: 'Form schemas (@QField / @QGroup)',
		values: { 'Plain JS': false, TypeBox: false, valibot: false, Zod: false, 'class-transformer': false, QuickModel: true, yup: false },
	},
	{
		featureEn: 'Computed fields (@QComputed)',
		featureEs: 'Campos computados (@QComputed)',
		values: { 'Plain JS': false, TypeBox: false, valibot: false, Zod: false, 'class-transformer': false, QuickModel: true, yup: false },
	},
	{
		featureEn: 'Async business rules (@QRule)',
		featureEs: 'Reglas de negocio async (@QRule)',
		values: { 'Plain JS': false, TypeBox: false, valibot: false, Zod: 'partial', 'class-transformer': false, QuickModel: true, yup: 'partial' },
	},
	{
		featureEn: 'Runtime integrity (hasIntegrity)',
		featureEs: 'Integridad en runtime (hasIntegrity)',
		values: { 'Plain JS': false, TypeBox: true, valibot: 'partial', Zod: true, 'class-transformer': false, QuickModel: true, yup: 'partial' },
	},
	{
		featureEn: 'Multi-level inheritance inference',
		featureEs: 'Herencia multinivel con inferencia',
		values: { 'Plain JS': false, TypeBox: false, valibot: false, Zod: false, 'class-transformer': false, QuickModel: true, yup: false },
	},
	{
		featureEn: 'Schema export (JSON / Zod / OpenAPI / GraphQL)',
		featureEs: 'Exportar schema (JSON / Zod / OpenAPI / GraphQL)',
		values: { 'Plain JS': false, TypeBox: true, valibot: false, Zod: false, 'class-transformer': false, QuickModel: true, yup: false },
	},
];

const libNames = ['Plain JS', 'TypeBox', 'valibot', 'Zod', 'class-transformer', 'QuickModel', 'yup'];

// ─────────────────────────────────────────────────────────────
// ESTADO REACTIVO
// ─────────────────────────────────────────────────────────────

const activeScenario = ref(scenarios[0]!.key);
const hoveredLib = ref<string | null>(null);
const tooltipX = ref(0);
const tooltipY = ref(0);
const tooltipIsRight = ref(true);

// ─────────────────────────────────────────────────────────────
// COMPUTED
// ─────────────────────────────────────────────────────────────

const isEs = computed(() => lang.value === 'es');

const currentScenario = computed(
	() => scenarios.find((s) => s.key === activeScenario.value) ?? scenarios[0]!
);

const maxValue = computed(() => {
	const vals = Object.values(currentScenario.value.values).filter(
		(v): v is number => v !== null
	);
	return Math.max(...vals, 1);
});

function barPercent(lib: string): number {
	const val = currentScenario.value.values[lib];
	if (val === null || val === undefined) return 0;
	return Math.max((val / maxValue.value) * 100, 3);
}

function isNA(lib: string): boolean {
	return currentScenario.value.values[lib] === null;
}

function formatOps(lib: string): string {
	const val = currentScenario.value.values[lib];
	if (val === null || val === undefined) return 'N/A';
	if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M ops/s';
	if (val >= 1_000) return (val / 1_000).toFixed(0) + 'k ops/s';
	return val + ' ops/s';
}

function featureIcon(val: IFeatureValue): string {
	if (val === true) return '✅';
	if (val === 'partial') return '⚠️';
	return '❌';
}

// ─────────────────────────────────────────────────────────────
// INTERACCIONES
// ─────────────────────────────────────────────────────────────

function onBarMouseEnter(lib: string, evt: MouseEvent): void {
	hoveredLib.value = lib;
	const rect = (evt.currentTarget as HTMLElement).getBoundingClientRect();
	const spaceRight = window.innerWidth - rect.right;
	tooltipIsRight.value = spaceRight >= 360;
	tooltipX.value = tooltipIsRight.value ? rect.right + 12 : rect.left - 352;
	tooltipY.value = Math.min(rect.top, window.innerHeight - 420);
}

function onBarMouseLeave(): void {
	hoveredLib.value = null;
}

function formatNote(scenario: IBenchScenario): string {
	return isEs.value ? scenario.notesEs : scenario.notesEn;
}
</script>

<template>
	<div class="bm-wrapper">
		<!-- Header -->
		<div class="bm-header">
			<h2 class="bm-title">
				⚡
				{{
					isEs
						? 'Comparativa de Rendimiento'
						: 'Performance Benchmark'
				}}
			</h2>
			<p class="bm-subtitle">
				{{
					isEs
						? 'QuickModel vs TypeBox vs valibot vs Zod vs class-transformer vs yup vs Plain JS — pasa el ratón sobre las barras'
						: 'QuickModel vs TypeBox vs valibot vs Zod vs class-transformer vs yup vs Plain JS — hover bars to compare features'
				}}
			</p>
		</div>

		<!-- Scenario tabs -->
		<div
			class="bm-tabs"
			role="tablist">
			<button
				v-for="scenario in scenarios"
				:key="scenario.key"
				role="tab"
				:aria-selected="activeScenario === scenario.key"
				:class="[
					'bm-tab',
					{ 'bm-tab--active': activeScenario === scenario.key },
				]"
				@click="activeScenario = scenario.key">
				{{ isEs ? scenario.labelEs : scenario.labelEn }}
			</button>
		</div>

		<!-- Chart -->
		<div class="bm-chart">
			<p class="bm-chart-note">{{ formatNote(currentScenario) }}</p>

			<div class="bm-bars">
				<div
					v-for="lib in libNames"
					:key="lib"
					class="bm-bar-row">
					<!-- Library name -->
					<div
						class="bm-bar-label"
						:style="{ color: libraries[lib]!.color }">
						{{ lib }}
					</div>

					<!-- Bar track -->
					<div class="bm-bar-track">
						<!-- Active bar -->
						<div
							v-if="!isNA(lib)"
							class="bm-bar-fill"
							:style="{
								width: barPercent(lib) + '%',
								background: libraries[lib]!.color,
							}"
							@mouseenter="onBarMouseEnter(lib, $event)"
							@mouseleave="onBarMouseLeave">
							<span class="bm-bar-value">
								{{ formatOps(lib) }}
							</span>
						</div>

						<!-- N/A state -->
						<div
							v-else
							class="bm-bar-na"
							@mouseenter="onBarMouseEnter(lib, $event)"
							@mouseleave="onBarMouseLeave">
							<span class="bm-na-badge">
								{{ isEs ? 'No disponible' : 'Not available' }}
							</span>
						</div>
					</div>
				</div>
			</div>

			<div class="bm-axis-hint">
				← {{ isEs ? 'más lento' : 'slower' }}
				&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
				{{ isEs ? 'más rápido' : 'faster' }} →
			</div>
		</div>

		<!-- Tooltip — teleport to body for correct layering -->
		<Teleport to="body">
			<Transition name="bm-fade">
				<div
					v-if="hoveredLib"
					class="bm-tooltip"
					:style="{ top: tooltipY + 'px', left: tooltipX + 'px' }">
					<!-- Colored header -->
					<div
						class="bm-tooltip-header"
						:style="{ background: libraries[hoveredLib]!.color }">
						<span class="bm-tooltip-lib">{{ hoveredLib }}</span>
						<span class="bm-tooltip-desc">
							{{
								isEs
									? libraries[hoveredLib]!.descEs
									: libraries[hoveredLib]!.descEn
							}}
						</span>
					</div>

					<!-- Body -->
					<div class="bm-tooltip-body">
						<!-- Pros -->
						<div
							v-if="
								(isEs
									? libraries[hoveredLib]!.prosEs
									: libraries[hoveredLib]!.prosEn
								).length
							"
							class="bm-tooltip-section">
							<div class="bm-tooltip-section-title">
								{{ isEs ? '✅ Incluye' : '✅ Includes' }}
							</div>
							<ul class="bm-tooltip-list">
								<li
									v-for="pro in isEs
										? libraries[hoveredLib]!.prosEs
										: libraries[hoveredLib]!.prosEn"
									:key="pro"
									class="bm-pro">
									{{ pro }}
								</li>
							</ul>
						</div>

						<!-- Cons -->
						<div
							v-if="
								(isEs
									? libraries[hoveredLib]!.consEs
									: libraries[hoveredLib]!.consEn
								).length
							"
							class="bm-tooltip-section">
							<div class="bm-tooltip-section-title">
								{{ isEs ? '❌ No incluye' : '❌ Missing' }}
							</div>
							<ul class="bm-tooltip-list">
								<li
									v-for="con in isEs
										? libraries[hoveredLib]!.consEs
										: libraries[hoveredLib]!.consEn"
									:key="con"
									class="bm-con">
									{{ con }}
								</li>
							</ul>
						</div>
					</div>
				</div>
			</Transition>
		</Teleport>

		<!-- Feature matrix table -->
		<div class="bm-matrix">
			<div class="bm-matrix-header">
				<h3 class="bm-matrix-title">
					{{
						isEs ? '🎯 ¿Por qué QuickModel?' : '🎯 Why QuickModel?'
					}}
				</h3>
				<p class="bm-matrix-hint">
					{{
						isEs
							? '⚠️ = disponible con código manual adicional'
							: '⚠️ = available with extra manual code'
					}}
				</p>
			</div>
			<div class="bm-matrix-scroll">
				<table class="bm-matrix-table">
					<thead>
						<tr>
							<th class="bm-th-feature">Feature</th>
							<th
								v-for="lib in libNames"
								:key="lib"
								class="bm-th-lib"
								:style="{ color: libraries[lib]!.color }">
								{{ lib }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in featureRows"
							:key="row.featureEn">
							<td class="bm-td-feature">
								{{ isEs ? row.featureEs : row.featureEn }}
							</td>
							<td
								v-for="lib in libNames"
								:key="lib"
								class="bm-td-check">
								{{ featureIcon(row.values[lib]!) }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>

<style scoped>
/* ── Wrapper ───────────────────────────────────────────────── */
.bm-wrapper {
	margin: 2.5rem 0 3rem;
}

/* ── Header ────────────────────────────────────────────────── */
.bm-header {
	text-align: center;
	margin-bottom: 1.75rem;
}

.bm-title {
	font-size: 1.65rem;
	font-weight: 700;
	margin: 0 0 0.5rem;
	color: var(--vp-c-text-1);
}

.bm-subtitle {
	color: var(--vp-c-text-2);
	font-size: 0.9rem;
	margin: 0;
	line-height: 1.5;
}

/* ── Tabs ──────────────────────────────────────────────────── */
.bm-tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	justify-content: center;
	margin-bottom: 1.5rem;
}

.bm-tab {
	padding: 0.4rem 1rem;
	border-radius: 9999px;
	border: 1px solid var(--vp-c-divider);
	background: var(--vp-c-bg-soft);
	color: var(--vp-c-text-2);
	font-size: 0.82rem;
	cursor: pointer;
	transition:
		background 0.2s,
		color 0.2s,
		border-color 0.2s,
		box-shadow 0.2s;
}

.bm-tab:hover {
	border-color: var(--vp-c-brand-1);
	color: var(--vp-c-brand-1);
	box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.bm-tab--active {
	background: var(--vp-c-brand-1);
	border-color: var(--vp-c-brand-1);
	color: #fff;
	font-weight: 600;
}

/* ── Chart ─────────────────────────────────────────────────── */
.bm-chart {
	background: var(--vp-c-bg-soft);
	border: 1px solid var(--vp-c-divider);
	border-radius: 12px;
	padding: 1.5rem 1.5rem 1rem;
	margin-bottom: 1.5rem;
}

.bm-chart-note {
	font-size: 0.8rem;
	color: var(--vp-c-text-3);
	margin: 0 0 1.25rem;
	text-align: center;
	line-height: 1.4;
}

.bm-bars {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.bm-bar-row {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.bm-bar-label {
	width: 100px;
	flex-shrink: 0;
	font-weight: 600;
	font-size: 0.88rem;
	text-align: right;
}

.bm-bar-track {
	flex: 1;
	height: 40px;
	background: var(--vp-c-bg);
	border-radius: 8px;
	overflow: hidden;
	border: 1px solid var(--vp-c-divider);
	position: relative;
}

.bm-bar-fill {
	height: 100%;
	border-radius: 7px;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	padding-right: 10px;
	min-width: 72px;
	cursor: pointer;
	transition: width 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.bm-bar-fill:hover {
	filter: brightness(1.12);
}

.bm-bar-value {
	color: #fff;
	font-size: 0.76rem;
	font-weight: 700;
	white-space: nowrap;
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.bm-bar-na {
	height: 100%;
	display: flex;
	align-items: center;
	padding-left: 12px;
	cursor: pointer;
}

.bm-na-badge {
	font-size: 0.78rem;
	color: var(--vp-c-text-3);
	font-style: italic;
}

.bm-axis-hint {
	text-align: center;
	font-size: 0.74rem;
	color: var(--vp-c-text-3);
	margin-top: 1rem;
	letter-spacing: 0.03em;
}

/* ── Tooltip ───────────────────────────────────────────────── */
.bm-tooltip {
	position: fixed;
	z-index: 9999;
	width: 340px;
	background: var(--vp-c-bg);
	border: 1px solid var(--vp-c-divider);
	border-radius: 10px;
	box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
	pointer-events: none;
	overflow: hidden;
}

.bm-tooltip-header {
	padding: 11px 14px 10px;
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.bm-tooltip-lib {
	color: #fff;
	font-size: 1rem;
	font-weight: 700;
}

.bm-tooltip-desc {
	color: rgba(255, 255, 255, 0.8);
	font-size: 0.77rem;
	line-height: 1.4;
}

.bm-tooltip-body {
	padding: 10px 14px 12px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.bm-tooltip-section-title {
	font-size: 0.78rem;
	font-weight: 700;
	color: var(--vp-c-text-1);
	margin-bottom: 4px;
}

.bm-tooltip-list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.bm-tooltip-list li {
	font-size: 0.77rem;
	line-height: 1.6;
}

.bm-pro {
	color: #22c55e;
}

.bm-con {
	color: var(--vp-c-text-3);
}

/* ── Transition ────────────────────────────────────────────── */
.bm-fade-enter-active,
.bm-fade-leave-active {
	transition: opacity 0.15s ease;
}

.bm-fade-enter-from,
.bm-fade-leave-to {
	opacity: 0;
}

/* ── Feature matrix ────────────────────────────────────────── */
.bm-matrix {
	border: 1px solid var(--vp-c-divider);
	border-radius: 12px;
	overflow: hidden;
	background: var(--vp-c-bg-soft);
}

.bm-matrix-header {
	background: var(--vp-c-bg);
	border-bottom: 1px solid var(--vp-c-divider);
	padding: 1rem 1.5rem 0.75rem;
	display: flex;
	align-items: baseline;
	flex-wrap: wrap;
	gap: 0.75rem;
}

.bm-matrix-title {
	margin: 0;
	font-size: 1rem;
	font-weight: 700;
	color: var(--vp-c-text-1);
}

.bm-matrix-hint {
	margin: 0;
	font-size: 0.78rem;
	color: var(--vp-c-text-3);
}

.bm-matrix-scroll {
	overflow-x: auto;
}

.bm-matrix-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 0.84rem;
}

.bm-th-feature,
.bm-td-feature {
	padding: 0.5rem 1rem;
	text-align: left;
	color: var(--vp-c-text-2);
}

.bm-th-feature {
	font-weight: 600;
}

.bm-th-lib {
	padding: 0.5rem 1rem;
	text-align: center;
	font-weight: 700;
	white-space: nowrap;
	min-width: 130px;
}

.bm-td-check {
	text-align: center;
	padding: 0.45rem;
	font-size: 1rem;
}

.bm-matrix-table tbody tr:nth-child(even) {
	background: var(--vp-c-bg);
}

.bm-matrix-table tbody tr:hover {
	background: var(--vp-c-bg-mute);
}

/* ── Mobile ────────────────────────────────────────────────── */
@media (max-width: 640px) {
	.bm-bar-label {
		width: 80px;
		font-size: 0.78rem;
	}

	.bm-title {
		font-size: 1.3rem;
	}

	.bm-tab {
		font-size: 0.76rem;
		padding: 0.32rem 0.7rem;
	}

	.bm-tooltip {
		width: 290px;
	}
}
</style>
