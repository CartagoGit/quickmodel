import { ref, computed, onMounted } from 'vue';
import { useI18n } from '../../composables/useI18n';
import { whyFeatureSections } from './WhyQuickModel.constants';

const MAIN_TAB_ORDER = ['explanation', 'installation', 'requirements'] as const;
type IMainTabKey = (typeof MAIN_TAB_ORDER)[number];

const INSTALL_TAB_ORDER = ['npm', 'yarn', 'pnpm', 'bun'] as const;
type IInstallTabKey = (typeof INSTALL_TAB_ORDER)[number];

export function useWhyQuickModel() {
	const { t, lp } = useI18n();

	// ─── Main tab navigation ──────────────────────────────────────

	const activeMainTab = ref<IMainTabKey>('explanation');
	const prevMainTabIndex = ref(0);

	const activeMainTabIndex = computed(() =>
		MAIN_TAB_ORDER.indexOf(activeMainTab.value)
	);

	const mainTabDirection = computed(() =>
		activeMainTabIndex.value >= prevMainTabIndex.value
			? 'forward'
			: 'backward'
	);

	function setMainTab(tab: IMainTabKey): void {
		prevMainTabIndex.value = MAIN_TAB_ORDER.indexOf(activeMainTab.value);
		activeMainTab.value = tab;
	}

	const mainTabItems = computed(() => [
		{
			key: 'explanation',
			icon: '💡',
			label: t.value.whyQuickModel.tabExplanation,
		},
		{
			key: 'installation',
			icon: '📦',
			label: t.value.whyQuickModel.tabInstallation,
		},
		{
			key: 'requirements',
			icon: '⚙️',
			label: t.value.whyQuickModel.tabRequirements,
		},
	]);

	// ─── Install sub-tab navigation ───────────────────────────────

	const activeInstallTab = ref<IInstallTabKey>('npm');
	const prevInstallTabIndex = ref(0);

	const activeInstallTabIndex = computed(() =>
		INSTALL_TAB_ORDER.indexOf(activeInstallTab.value)
	);

	const installTabDirection = computed(() =>
		activeInstallTabIndex.value >= prevInstallTabIndex.value
			? 'forward'
			: 'backward'
	);

	function setInstallTab(tab: IInstallTabKey): void {
		prevInstallTabIndex.value = INSTALL_TAB_ORDER.indexOf(
			activeInstallTab.value
		);
		activeInstallTab.value = tab;
	}

	const installTabItems = [
		{ key: 'npm', icon: '📦', label: 'npm' },
		{ key: 'yarn', icon: '🧶', label: 'yarn' },
		{ key: 'pnpm', icon: '⚡', label: 'pnpm' },
		{ key: 'bun', icon: '🍞', label: 'bun' },
	];

	// ─── Feature sections (localized) ─────────────────────────────

	const featureSections = computed(() =>
		whyFeatureSections.map((sec) => ({
			icon: sec.icon,
			title: lp(sec as unknown as Record<string, unknown>, 'title'),
			body: lp(sec as unknown as Record<string, unknown>, 'body'),
		}))
	);

	// ─── Install commands (raw) ────────────────────────────────────

	const installCmds = {
		npm: 'npm install quickmodel',
		yarn: 'yarn add quickmodel',
		pnpm: 'pnpm add quickmodel',
		bun: 'bun add quickmodel',
	} as const;

	const codeTsconfigLegacy = `// tsconfig.json — Legacy decorators (TypeScript 3.4+)
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false
  }
}`;

	const codeTsconfigTC39 = `// tsconfig.json — TC39 decorators (TypeScript 5.0+)
{
  "compilerOptions": {
    "experimentalDecorators": false,
    "useDefineForClassFields": true
  }
}`;

	const codeFirstModel = `import { QModel, Quick } from 'quickmodel';

interface IUser {
  name: string;
  createdAt: Date;
  balance: bigint;
}

@Quick({ createdAt: Date, balance: 'bigint' })
class User extends QModel<IUser> {
  declare name: string;
  declare createdAt: Date;
  declare balance: bigint;
}

const user = new User({
  name: 'Alice',
  createdAt: '2024-01-01T00:00:00Z', // string → Date  (auto-coerced)
  balance: '1500000',                  // string → BigInt (auto-coerced)
});

console.log(user.createdAt instanceof Date); // true
console.log(user.balance === 1500000n);      // true
console.log(user.serialize());
// { name: 'Alice', createdAt: '2024-01-01T00:00:00.000Z', balance: '1500000' }`;

	// ─── Shiki highlighting ────────────────────────────────────────

	const highlighted = ref<Record<string, string>>({});

	onMounted(async () => {
		const { createHighlighter } = await import('shiki');
		const highlighter = await createHighlighter({
			themes: ['github-dark'],
			langs: ['bash', 'typescript', 'jsonc'],
		});
		const bash = { lang: 'bash' as const, theme: 'github-dark' as const };
		const tts = {
			lang: 'typescript' as const,
			theme: 'github-dark' as const,
		};
		const jsonc = { lang: 'jsonc' as const, theme: 'github-dark' as const };

		highlighted.value = {
			bun: highlighter.codeToHtml(installCmds.bun, bash),
			npm: highlighter.codeToHtml(installCmds.npm, bash),
			yarn: highlighter.codeToHtml(installCmds.yarn, bash),
			pnpm: highlighter.codeToHtml(installCmds.pnpm, bash),
			tsconfigLegacy: highlighter.codeToHtml(codeTsconfigLegacy, jsonc),
			tsconfigTC39: highlighter.codeToHtml(codeTsconfigTC39, jsonc),
			firstModel: highlighter.codeToHtml(codeFirstModel, tts),
		};
	});

	return {
		t,
		// Main tabs
		activeMainTab,
		mainTabDirection,
		setMainTab,
		mainTabItems,
		// Install sub-tabs
		activeInstallTab,
		installTabDirection,
		setInstallTab,
		installTabItems,
		// Feature sections
		featureSections,
		// Raw code strings (fallback)
		installCmds,
		codeTsconfigLegacy,
		codeTsconfigTC39,
		codeFirstModel,
		// Highlighted HTML
		highlighted,
	};
}
