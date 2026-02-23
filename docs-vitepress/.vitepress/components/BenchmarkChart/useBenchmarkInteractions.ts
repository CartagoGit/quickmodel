import { ref, type Ref } from 'vue';

const TOOLTIP_MIN_RIGHT_SPACE = 360;
const TOOLTIP_OFFSET_RIGHT = 12;
const TOOLTIP_WIDTH = 352;
const TOOLTIP_MAX_BOTTOM_OFFSET = 420;

export interface IBenchmarkInteractionsResult {
	hoveredLib: Ref<string | null>;
	tooltipX: Ref<number>;
	tooltipY: Ref<number>;
	tooltipIsRight: Ref<boolean>;
	onBarMouseEnter: (lib: string, evt: MouseEvent) => void;
	onBarMouseLeave: () => void;
}

/**
 * Gestiona el estado del tooltip al hacer hover sobre las barras
 * (SRP: sólo responsable de la interacción con el ratón).
 */
export function useBenchmarkInteractions(): IBenchmarkInteractionsResult {
	const hoveredLib = ref<string | null>(null);
	const tooltipX = ref(0);
	const tooltipY = ref(0);
	const tooltipIsRight = ref(true);

	function onBarMouseEnter(lib: string, evt: MouseEvent): void {
		hoveredLib.value = lib;
		const rect = (evt.currentTarget as HTMLElement).getBoundingClientRect();
		const spaceRight = window.innerWidth - rect.right;
		tooltipIsRight.value = spaceRight >= TOOLTIP_MIN_RIGHT_SPACE;
		tooltipX.value = tooltipIsRight.value
			? rect.right + TOOLTIP_OFFSET_RIGHT
			: rect.left - TOOLTIP_WIDTH;
		tooltipY.value = Math.min(
			rect.top,
			window.innerHeight - TOOLTIP_MAX_BOTTOM_OFFSET
		);
	}

	function onBarMouseLeave(): void {
		hoveredLib.value = null;
	}

	return {
		hoveredLib,
		tooltipX,
		tooltipY,
		tooltipIsRight,
		onBarMouseEnter,
		onBarMouseLeave,
	};
}
