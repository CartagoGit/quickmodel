<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useData } from 'vitepress';

interface IFeature {
	icon: string;
	title: string;
	details: string;
}

const esFeatures: IFeature[] = [
	{
		icon: '🔄',
		title: '30+ Transformadores de Tipos',
		details:
			'Convierte Date, BigInt, Set, Map, RegExp, Symbol, Error, WeakMap, WeakSet, ArrayBuffer, TypedArray y URL — con sintaxis explícita y arrays multi-dimensionales.',
	},
	{
		icon: '🧠',
		title: 'Un Decorador para Gobernarlos a Todos',
		details:
			'@Quick en la clase, @QType por propiedad, @QAlias para renombrar campos y @QComputed para getters serializables. Notación de punto para anidamiento sin decorar clases externas.',
	},
	{
		icon: '✅',
		title: 'Validación en Dos Capas',
		details:
			'checkIntegrity() verifica tipos y límites de seguridad. @QRule + checkRules() aplica lógica de negocio declarativa. isValid() los combina en una sola llamada.',
	},
	{
		icon: '📋',
		title: 'Formularios y Validación por Grupos',
		details:
			'@QField, @QRule y @QGroup en cualquier clase, sin necesidad de QModel. Valida por pasos con qCheckRulesByGroup(). Reglas async con timeout y modo serial/paralelo.',
	},
	{
		icon: '🗂️',
		title: '7 Formatos de Schema',
		details:
			'Exporta tu modelo como JSON Schema, Zod, OpenAPI 3.0, Mongoose, TypeScript interface, GraphQL SDL o AJV con una sola llamada a getSchema(). Documentación siempre sincronizada.',
	},
	{
		icon: '🤖',
		title: 'Servidor MCP con 19 Skills',
		details:
			'Claude, Cursor o VS Code acceden a 19 herramientas (crear modelos, exportar schemas, simular validaciones, diff entre modelos…) y 19 prompts guiados. Tu IA conoce tu código.',
	},
	{
		icon: '🧪',
		title: 'Mocks Instantáneos con Faker',
		details:
			'User.mock() genera un objeto válido y tipado. User.mock(5) devuelve un array. Sobreescribe campos con User.mock({ name: "Alice" }). Sin @faker-js/faker, sin configuración.',
	},
	{
		icon: '🧩',
		title: 'Polimorfismo Automático',
		details:
			'Recibe un array de Payment plano desde la API y obtén instancias de Card o PayPal correctas según la forma del JSON. Sin switch, sin factories manuales.',
	},
	{
		icon: '🔒',
		title: 'Seguridad y Control de Serialización',
		details:
			'Protección contra referencias circulares, inyección en URLs/RegExp y contaminación de prototipos. excludeFields, omit/pick por llamada y unknownPropertyPolicy para APIs públicas.',
	},
	{
		icon: '🔗',
		title: 'Mixin con Cualquier Clase Base',
		details:
			'QModel.extends(BaseClass) añade los superpoderes de QuickModel a entidades TypeORM, DTOs de NestJS o cualquier clase existente sin romper tu jerarquía de herencia.',
	},
	{
		icon: '🏷️',
		title: 'TC39 y Legacy Decorators',
		details:
			'Compatible con TypeScript 3.4+ (experimentalDecorators) y TypeScript 5+ (TC39 estándar). Elige el modo que usa tu proyecto sin cambiar absolutamente nada más.',
	},
	{
		icon: '⚡',
		title: 'Serialización Lossless y Roundtrip',
		details:
			'serialize() y fromJSON() son inversos exactos. WeakMap/WeakSet quedan fuera del JSON (GC-friendly). Roundtrip verificable con la herramienta roundtrip del servidor MCP.',
	},
];

const enFeatures: IFeature[] = [
	{
		icon: '🔄',
		title: '30+ Type Transformers',
		details:
			'Automatically convert Date, BigInt, Set, Map, RegExp, Symbol, Error, WeakMap, WeakSet, ArrayBuffer, TypedArray, and URL — with explicit syntax and multi-dimensional arrays.',
	},
	{
		icon: '🧠',
		title: 'One Decorator to Rule Them All',
		details:
			'@Quick on the class, @QType per property, @QAlias to rename fields and @QComputed for serializable getters. Dot-notation for nested transforms without decorating external classes.',
	},
	{
		icon: '✅',
		title: 'Two-Layer Validation',
		details:
			'checkIntegrity() checks types and security limits. @QRule + checkRules() applies declarative business logic. isValid() combines both in a single call.',
	},
	{
		icon: '📋',
		title: 'Forms and Group Validation',
		details:
			'@QField, @QRule and @QGroup on any class — no QModel needed. Validate step-by-step with qCheckRulesByGroup(). Async rules with timeout and serial/parallel mode.',
	},
	{
		icon: '🗂️',
		title: '7 Schema Formats',
		details:
			'Export as JSON Schema, Zod, OpenAPI 3.0, Mongoose, TypeScript interface, GraphQL SDL, or AJV with a single getSchema() call. Documentation always in sync with your code.',
	},
	{
		icon: '🤖',
		title: 'Built-in MCP Server with 19 Skills',
		details:
			'Claude, Cursor, or VS Code access 19 tools (create models, export schemas, simulate validations, diff models…) and 19 guided prompts. Your AI understands your codebase.',
	},
	{
		icon: '🧪',
		title: 'Instant Mocks with Faker',
		details:
			'User.mock() generates a valid, typed object. User.mock(5) returns an array. Override fields with User.mock({ name: "Alice" }). Powered by @faker-js/faker, zero config.',
	},
	{
		icon: '🧩',
		title: 'Automatic Polymorphism',
		details:
			'Receive a flat Payment array from the API and get correct Card or PayPal instances based on the JSON shape. No switch statements, no manual factories.',
	},
	{
		icon: '🔒',
		title: 'Security and Serialization Control',
		details:
			'Built-in protection against circular references, URL/RegExp injection, and prototype pollution. excludeFields, omit/pick per-call, and unknownPropertyPolicy for public APIs.',
	},
	{
		icon: '🔗',
		title: 'Mixin with Any Base Class',
		details:
			'QModel.extends(BaseClass) adds QuickModel superpowers to TypeORM entities, NestJS DTOs, or any existing class without breaking your inheritance hierarchy.',
	},
	{
		icon: '🏷️',
		title: 'TC39 and Legacy Decorators',
		details:
			'Compatible with TypeScript 3.4+ (experimentalDecorators) and TypeScript 5+ (TC39 standard). Choose the mode your project uses without changing anything else.',
	},
	{
		icon: '⚡',
		title: 'Lossless Serialization & Roundtrip',
		details:
			'serialize() / fromJSON() are exact inverses. WeakMap/WeakSet stay out of JSON (GC-friendly). Roundtrip verifiable with the MCP roundtrip tool.',
	},
];

const { lang } = useData();

const features = computed(() =>
	lang.value.startsWith('es') ? esFeatures : enFeatures
);

const ITEMS_PER_PAGE = 4;
const currentPage = ref(0);
const isTransitioning = ref(false);

const totalPages = computed(() =>
	Math.ceil(features.value.length / ITEMS_PER_PAGE)
);

const pageFeatures = (page: number) => {
	const start = page * ITEMS_PER_PAGE;
	return features.value.slice(start, start + ITEMS_PER_PAGE);
};

const allPages = computed(() =>
	Array.from({ length: totalPages.value }, (_, idx) => pageFeatures(idx))
);

function goTo(page: number) {
	if (isTransitioning.value) return;
	isTransitioning.value = true;
	currentPage.value =
		((page % totalPages.value) + totalPages.value) % totalPages.value;
	setTimeout(() => {
		isTransitioning.value = false;
	}, 450);
}

function next() {
	goTo(currentPage.value + 1);
}

function prev() {
	goTo(currentPage.value - 1);
}

const paused = ref(false);
let timer: ReturnType<typeof setInterval> | null = null;

function startTimer() {
	timer = setInterval(() => {
		if (!paused.value) next();
	}, 5000);
}

function stopTimer() {
	if (timer) clearInterval(timer);
}

onMounted(startTimer);
onUnmounted(stopTimer);
</script>

<template>
	<div
		class="features-carousel"
		@mouseenter="paused = true"
		@mouseleave="paused = false">
		<!-- track -->
		<div class="carousel-viewport">
			<div
				class="carousel-track"
				:style="{ transform: `translateX(-${currentPage * 100}%)` }">
				<div
					v-for="(page, pageIdx) in allPages"
					:key="pageIdx"
					class="carousel-page">
					<div class="features-grid">
						<div
							v-for="(feature, fIdx) in page"
							:key="fIdx"
							class="feature-card">
							<div class="feature-icon">{{ feature.icon }}</div>
							<div class="feature-body">
								<p class="feature-title">{{ feature.title }}</p>
								<p class="feature-details">
									{{ feature.details }}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- controls -->
		<div class="carousel-controls">
			<button
				class="carousel-arrow"
				aria-label="Previous"
				@click="prev">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5">
					<polyline points="15 18 9 12 15 6" />
				</svg>
			</button>

			<div class="carousel-dots">
				<button
					v-for="(_, idx) in totalPages"
					:key="idx"
					class="carousel-dot"
					:class="{ active: idx === currentPage }"
					:aria-label="`Page ${idx + 1}`"
					@click="goTo(idx)" />
			</div>

			<button
				class="carousel-arrow"
				aria-label="Next"
				@click="next">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5">
					<polyline points="9 18 15 12 9 6" />
				</svg>
			</button>
		</div>
	</div>
</template>

<style scoped lang="scss">
.features-carousel {
	width: 100%;
	padding: 0 0 32px;
	user-select: none;
}

.carousel-viewport {
	overflow: hidden;
	border-radius: 12px;
}

.carousel-track {
	display: flex;
	transition: transform 0.42s cubic-bezier(0.4, 0, 0.2, 1);
	will-change: transform;
}

.carousel-page {
	flex: 0 0 100%;
	min-width: 100%;
	padding: 4px 2px;
	display: flex;
	flex-direction: column;
}

.features-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	grid-template-rows: repeat(2, 1fr);
	gap: 16px;
	flex: 1;

	@media (max-width: 640px) {
		grid-template-columns: 1fr;
		grid-template-rows: none;
		gap: 10px;
	}
}

.feature-card {
	display: flex;
	align-items: flex-start;
	gap: 16px;
	background-color: var(--vp-c-bg-soft);
	border: 1px solid var(--vp-c-divider);
	border-radius: 12px;
	padding: 20px 22px;
	height: 100%;
	box-sizing: border-box;
	transition:
		border-color 0.25s,
		box-shadow 0.25s,
		transform 0.2s;
	cursor: default;

	&:hover {
		border-color: var(--vp-c-brand-1);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
		transform: translateY(-2px);
	}

	@media (max-width: 640px) {
		padding: 14px 16px;
		gap: 12px;
		border-radius: 10px;
	}
}

.feature-icon {
	font-size: 28px;
	line-height: 1;
	flex-shrink: 0;
	margin-top: 2px;

	@media (max-width: 640px) {
		font-size: 22px;
	}
}

.feature-body {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.feature-title {
	margin: 0;
	font-size: 14px;
	font-weight: 600;
	color: var(--vp-c-text-1);
	line-height: 1.4;

	@media (max-width: 640px) {
		font-size: 13px;
	}
}

.feature-details {
	margin: 0;
	font-size: 13px;
	color: var(--vp-c-text-2);
	line-height: 1.6;

	@media (max-width: 640px) {
		font-size: 12px;
		line-height: 1.5;
	}
}

/* ── Controls ─────────────────────────────────── */

.carousel-controls {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 16px;
	margin-top: 20px;
}

.carousel-arrow {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background-color: var(--vp-c-bg-soft);
	border: 1px solid var(--vp-c-divider);
	color: var(--vp-c-text-2);
	cursor: pointer;
	transition:
		background-color 0.2s,
		border-color 0.2s,
		color 0.2s,
		transform 0.15s;

	svg {
		width: 16px;
		height: 16px;
	}

	&:hover {
		background-color: var(--vp-c-brand-soft);
		border-color: var(--vp-c-brand-1);
		color: var(--vp-c-brand-1);
		transform: scale(1.1);
	}

	&:active {
		transform: scale(0.95);
	}
}

.carousel-dots {
	display: flex;
	gap: 8px;
	align-items: center;
}

.carousel-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background-color: var(--vp-c-divider);
	border: none;
	cursor: pointer;
	transition:
		background-color 0.25s,
		transform 0.25s,
		width 0.25s;
	padding: 0;

	&.active {
		background-color: var(--vp-c-brand-1);
		width: 20px;
		border-radius: 4px;
		transform: none;
	}

	&:hover:not(.active) {
		background-color: var(--vp-c-brand-soft);
		transform: scale(1.2);
	}
}
</style>
