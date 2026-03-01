// ─────────────────────────────────────────────────────────────
// CommandTabs — lógica del componente de tabs de gestores
// de paquetes. Reutiliza TabBar con la misma animación que
// QuickExamples (bm-tab-forward / bm-tab-backward).
// ─────────────────────────────────────────────────────────────

import { ref, computed } from 'vue';
import type { ITabItem } from '../TabBar/TabBar';

const TAB_ORDER = ['npm', 'bun', 'pnpm', 'yarn'] as const;
type ITabKey = (typeof TAB_ORDER)[number];

/** Tabs fijas — los nombres de gestores de paquetes no requieren i18n. */
export const TAB_ITEMS: ITabItem[] = [
	{ key: 'npm', icon: '📦', label: 'npm' },
	{ key: 'bun', icon: '🐰', label: 'bun' },
	{ key: 'pnpm', icon: '🏃', label: 'pnpm' },
	{ key: 'yarn', icon: '🧶', label: 'yarn' },
];

/**
 * Composable que gestiona la tab activa y la dirección de
 * la animación de transición para CommandTabs.
 */
export function useCommandTabs() {
	const activeTab = ref<ITabKey>('npm');
	const prevTabIndex = ref(0);

	const tabDirection = computed(() => {
		const cur = TAB_ORDER.indexOf(activeTab.value);
		return cur >= prevTabIndex.value ? 'forward' : 'backward';
	});

	function setTab(key: ITabKey): void {
		prevTabIndex.value = TAB_ORDER.indexOf(activeTab.value);
		activeTab.value = key;
	}

	return { activeTab, tabDirection, setTab };
}
