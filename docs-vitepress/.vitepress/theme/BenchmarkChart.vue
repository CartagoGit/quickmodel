<script setup lang="ts">
import { featureRows, libNames } from './benchmark-chart.data';
import { useBenchmarkChart } from './useBenchmarkChart';

const {
	libraries,
	appTypeOptions,
	activeAppType,
	activeScenario,
	hoveredLib,
	tooltipX,
	tooltipY,
	isEs,
	filteredScenarios,
	currentScenario,
	activeLibNames,
	excludedLibNames,
	isOverflow,
	barPercent,
	formatOps,
	featureIcon,
	formatNote,
	onBarMouseEnter,
	onBarMouseLeave,
} = useBenchmarkChart();
</script>

<template>
	<div class="bm-wrapper">
		<!-- 🔲 Objetos de objetos de objetos (N niveles) - Header -->
		<div class="bm-header">
			<h2 class="bm-header__title">
				⚡
				{{
					isEs
						? 'Comparativa de Rendimiento'
						: 'Performance Benchmark'
				}}
			</h2>
			<p class="bm-header__subtitle">
				{{
					isEs
						? 'QuickModel vs TypeBox vs valibot vs Zod vs class-transformer vs yup vs faker — pasa el ratón sobre las barras'
						: 'QuickModel vs TypeBox vs valibot vs Zod vs class-transformer vs yup vs faker — hover bars to compare features'
				}}
			</p>
		</div>

		<!-- 🔲 Objetos de objetos de objetos (N niveles) - App-type filter pills -->
		<div class="bm-apptype">
			<span class="bm-apptype__label">
				{{ isEs ? 'Tipo de app:' : 'App type:' }}
			</span>
			<button
				v-for="opt in appTypeOptions"
				:key="opt.key"
				:class="[
					'bm-apptype__pill',
					{ 'bm-apptype__pill--active': activeAppType === opt.key },
				]"
				@click="activeAppType = opt.key">
				{{ isEs ? opt.labelEs : opt.labelEn }}
			</button>
		</div>

		<!-- 🔲 Objetos de objetos de objetos (N niveles) - Scenario tabs (filtered by app type) -->
		<div
			class="bm-tabs"
			role="tablist">
			<button
				v-for="scenario in filteredScenarios"
				:key="scenario.key"
				role="tab"
				:aria-selected="currentScenario.key === scenario.key"
				:class="[
					'bm-tabs__tab',
					{
						'bm-tabs__tab--active':
							currentScenario.key === scenario.key,
					},
				]"
				@click="activeScenario = scenario.key">
				{{ isEs ? scenario.labelEs : scenario.labelEn }}
			</button>
		</div>

		<!-- 🔲 Objetos de objetos de objetos (N niveles) - Chart -->
		<div class="bm-chart">
			<p class="bm-chart__note">{{ formatNote(currentScenario) }}</p>

			<TransitionGroup
				name="bm-bar"
				tag="div"
				class="bm-chart__bars">
				<div
					v-for="lib in activeLibNames"
					:key="lib"
					class="bm-bar">
					<!-- 🔲 Objetos de objetos de objetos (N niveles) - Library name -->
					<div
						:class="[
							'bm-bar__label',
							{ 'bm-bar__label--ours': lib === 'QuickModel' },
						]"
						:style="{ color: libraries[lib]!.color }">
						{{ lib }}
						<span
							v-if="lib === 'QuickModel'"
							class="bm-bar__label-badge">
							★
						</span>
					</div>

					<!-- 🔲 Objetos de objetos de objetos (N niveles) - Bar track -->
					<div class="bm-bar__track">
						<!-- 🔲 Objetos de objetos de objetos (N niveles) - Normal bar -->
						<div
							v-if="!isOverflow(lib)"
							class="bm-bar__fill"
							:style="{
								width: barPercent(lib) + '%',
								background: libraries[lib]!.color,
							}"
							@mouseenter="onBarMouseEnter(lib, $event)"
							@mouseleave="onBarMouseLeave">
							<span class="bm-bar__value">
								{{ formatOps(lib) }}
							</span>
						</div>

						<!-- 🔲 Objetos de objetos de objetos (N niveles) - Overflow bar (outlier — clipped for readability) -->
						<div
							v-else
							class="bm-bar__overflow"
							:style="{ '--bar-color': libraries[lib]!.color }"
							@mouseenter="onBarMouseEnter(lib, $event)"
							@mouseleave="onBarMouseLeave">
							<div
								class="bm-bar__overflow-fill"
								:style="{ background: libraries[lib]!.color }">
								<span class="bm-bar__value">
									{{ formatOps(lib) }}
								</span>
							</div>
							<div
								class="bm-bar__overflow-ext"
								:style="{ color: libraries[lib]!.color }">
								››
								{{ isEs ? 'mucho más rápido' : 'much faster' }}
								<span class="bm-bar__overflow-caveat">
									{{ isEs ? '(ver nota ↑)' : '(see note ↑)' }}
								</span>
							</div>
						</div>
					</div>
				</div>
			</TransitionGroup>

			<!-- 🔲 Objetos de objetos de objetos (N niveles) - Excluded libs note -->
			<p
				v-if="excludedLibNames.length > 0"
				class="bm-chart__excluded-note">
				{{
					isEs
						? 'No aplica en este escenario'
						: 'Not applicable in this scenario'
				}}:
				<span
					v-for="(exLib, idx) in excludedLibNames"
					:key="exLib"
					:style="{ color: libraries[exLib]!.color }"
					class="bm-chart__excluded-lib">
					{{ exLib
					}}{{ idx < excludedLibNames.length - 1 ? ', ' : '' }}
				</span>
			</p>

			<div class="bm-chart__axis-hint">
				&larr; {{ isEs ? 'más lento' : 'slower' }}
				&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
				{{ isEs ? 'más rápido' : 'faster' }} &rarr;
			</div>
		</div>

		<!-- 🔲 Objetos de objetos de objetos (N niveles) - Tooltip — teleport to body for correct layering -->
		<Teleport to="body">
			<Transition name="bm-fade">
				<div
					v-if="hoveredLib"
					class="bm-tooltip"
					:style="{ top: tooltipY + 'px', left: tooltipX + 'px' }">
					<!-- 🔲 Objetos de objetos de objetos (N niveles) - Colored header -->
					<div
						class="bm-tooltip__header"
						:style="{ background: libraries[hoveredLib]!.color }">
						<span class="bm-tooltip__lib">{{ hoveredLib }}</span>
						<span class="bm-tooltip__desc">
							{{
								isEs
									? libraries[hoveredLib]!.descEs
									: libraries[hoveredLib]!.descEn
							}}
						</span>
					</div>

					<!-- 🔲 Objetos de objetos de objetos (N niveles) - Body -->
					<div class="bm-tooltip__body">
						<!-- 🔲 Objetos de objetos de objetos (N niveles) - Pros -->
						<div
							v-if="
								(isEs
									? libraries[hoveredLib]!.prosEs
									: libraries[hoveredLib]!.prosEn
								).length
							"
							class="bm-tooltip__section">
							<div class="bm-tooltip__section-title">
								{{ isEs ? '✅ Incluye' : '✅ Includes' }}
							</div>
							<ul class="bm-tooltip__list">
								<li
									v-for="pro in isEs
										? libraries[hoveredLib]!.prosEs
										: libraries[hoveredLib]!.prosEn"
									:key="pro"
									class="bm-tooltip__pro">
									{{ pro }}
								</li>
							</ul>
						</div>

						<!-- 🔲 Objetos de objetos de objetos (N niveles) - Cons -->
						<div
							v-if="
								(isEs
									? libraries[hoveredLib]!.consEs
									: libraries[hoveredLib]!.consEn
								).length
							"
							class="bm-tooltip__section">
							<div class="bm-tooltip__section-title">
								{{ isEs ? '❌ No incluye' : '❌ Missing' }}
							</div>
							<ul class="bm-tooltip__list">
								<li
									v-for="con in isEs
										? libraries[hoveredLib]!.consEs
										: libraries[hoveredLib]!.consEn"
									:key="con"
									class="bm-tooltip__con">
									{{ con }}
								</li>
							</ul>
						</div>
					</div>
				</div>
			</Transition>
		</Teleport>

		<!-- 🔲 Objetos de objetos de objetos (N niveles) - Feature matrix table -->
		<div class="bm-matrix">
			<div class="bm-matrix__header">
				<h3 class="bm-matrix__title">
					{{
						isEs
							? '🎯 Características ofrecidas por cada librería'
							: '🎯 Features offered by each library'
					}}
				</h3>
				<p class="bm-matrix__hint">
					{{
						isEs
							? '⚠️ = disponible con código manual adicional'
							: '⚠️ = available with extra manual code'
					}}
				</p>
			</div>
			<div class="bm-matrix__scroll">
				<table class="bm-matrix__table">
					<thead>
						<tr>
							<th class="bm-matrix__th-feature">Feature</th>
							<th
								v-for="lib in libNames"
								:key="lib"
								class="bm-matrix__th-lib"
								:style="{ color: libraries[lib]!.color }">
								{{ lib }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in featureRows"
							:key="row.featureEn">
							<td class="bm-matrix__td-feature">
								{{ isEs ? row.featureEs : row.featureEn }}
							</td>
							<td
								v-for="lib in libNames"
								:key="lib"
								class="bm-matrix__td-check">
								{{ featureIcon(row.values[lib]!) }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>

<style lang="scss" src="./BenchmarkChart.scss" scoped />
