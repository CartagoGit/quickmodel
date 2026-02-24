// ─────────────────────────────────────────────────────────────
// TabBar — lógica del componente reutilizable de tabs con
// indicador deslizante.
// ─────────────────────────────────────────────────────────────

import { computed } from 'vue';

export interface ITabItem {
	key: string;
	icon: string;
	label: string;
}

/**
 * Composable que encapsula la lógica interna del TabBar.
 * Recibe `props` reactivo de Vue y la función `emit`.
 */
export function useTabBar(
	props: { tabs: ITabItem[]; modelValue: string },
	emit: (evt: 'update:modelValue', val: string) => void
) {
	const activeTabIndex = computed(() =>
		props.tabs.findIndex((tab) => tab.key === props.modelValue)
	);

	function setTab(key: string): void {
		emit('update:modelValue', key);
	}

	return { activeTabIndex, setTab };
}
