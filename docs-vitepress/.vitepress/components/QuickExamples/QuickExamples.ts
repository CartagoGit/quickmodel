import { ref, computed, onMounted } from 'vue';
import { useI18n } from '../../composables/useI18n';

const TAB_ORDER = ['basic', 'forms', 'mocks'] as const;
type ITabKey = (typeof TAB_ORDER)[number];

export function useQuickExamples() {
	const { t } = useI18n();

	// ─── Tab navigation ───────────────────────────

	const activeTab = ref<ITabKey>('basic');
	const prevTabIndex = ref(0);

	const activeTabIndex = computed(() => TAB_ORDER.indexOf(activeTab.value));

	const tabDirection = computed(() =>
		activeTabIndex.value >= prevTabIndex.value ? 'forward' : 'backward'
	);

	function setTab(tab: ITabKey): void {
		prevTabIndex.value = TAB_ORDER.indexOf(activeTab.value);
		activeTab.value = tab;
	}

	const tabItems = computed(() => [
		{ key: 'basic', icon: '🏗️', label: t.value.quickExamples.tabBasic },
		{ key: 'forms', icon: '📋', label: t.value.quickExamples.tabForms },
		{ key: 'mocks', icon: '🧪', label: t.value.quickExamples.tabMocks },
	]);

	// ─── Code examples (raw source) ───────────────

	const exampleBasic = `import { QModel, Quick } from 'quickmodel';

interface IUser {
  name: string;
  balance: bigint;
  lastLogin: Date;
  roles: Set<string>;
}

@Quick({
  balance: 'bigint',  // primitive alias
  lastLogin: Date,    // native constructor
  roles: Set,         // complex collection
})
class User extends QModel<IUser> {
  declare name: string;
  declare balance: bigint;
  declare lastLogin: Date;
  declare roles: Set<string>;
}

const user = new User({
  name: 'Alice',
  balance: '500000000000000000',      // string → BigInt auto-coerced
  lastLogin: '2024-03-15T10:00:00Z',  // string → Date auto-coerced
  roles: ['admin', 'editor'],          // array  → Set  auto-coerced
});

console.log(user.balance + 1n);            // 500000000000000001n
console.log(user.lastLogin.getFullYear()); // 2024
console.log(user.roles.has('admin'));      // true`;

	const exampleForms = `import { QModel, Quick, QField, QGroup, QRule } from 'quickmodel';

interface ISignup {
  name: string;
  email: string;
  age: number;
}

@Quick()
class SignupModel extends QModel<ISignup> {
  @QField({ widget: 'input', label: 'Full name', required: true })
  @QRule((v: string) => v.length >= 2, 'Minimum 2 characters')
  @QGroup('Identity')
  declare name: string;

  @QField({ widget: 'input', inputType: 'email', label: 'Email', required: true })
  @QRule((v: string) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v), 'Invalid email')
  @QGroup('Identity')
  declare email: string;

  @QField({ widget: 'number', label: 'Age' })
  @QRule((v: number) => v >= 18, 'Must be 18 or older')
  @QGroup('Details')
  declare age: number;
}

const model = new SignupModel({ name: 'Jo', email: 'bad', age: 16 });

const result = model.checkRules();
// { valid: false, errors: [
//   { field: 'name',  message: 'Minimum 2 characters' },
//   { field: 'email', message: 'Invalid email' },
//   { field: 'age',   message: 'Must be 18 or older' },
// ]}

const schema  = SignupModel.getFormSchema();
// [{ field: 'name', widget: 'input', label: 'Full name', group: 'Identity', ... }]

const grouped = SignupModel.getFormSchemaGrouped();
// [{ group: 'Identity', fields: [...] }, { group: 'Details', fields: [...] }]`;

	const exampleMocks = `import { QModel, Quick } from 'quickmodel';

interface IProduct {
  id: string;
  name: string;
  price: bigint;
  createdAt: Date;
  tags: Set<string>;
}

@Quick({ price: 'bigint', createdAt: Date, tags: Set })
class Product extends QModel<IProduct> {
  declare id: string;
  declare name: string;
  declare price: bigint;
  declare createdAt: Date;
  declare tags: Set<string>;
}

// ─── Round-trip serialization ─────────────────────────
const product = new Product({
  id: 'abc-123',
  name: 'Laptop Pro',
  price: '1500000',
  createdAt: '2024-01-01T00:00:00Z',
  tags: ['electronics', 'sale'],
});

const serialized = product.serialize();
// { id: 'abc-123', price: '1500000', createdAt: '2024-01-01T...', tags: ['electronics','sale'] }

const restored = new Product(serialized); // reconstruct with correct types
console.log(restored.price === 1500000n);          // true
console.log(restored.createdAt instanceof Date);   // true

// ─── Mock generation ──────────────────────────────────
const mock    = Product.mock().random();      // one Product instance
const catalog = Product.mock().array(5);      // Product[] — array of 5`;

	// ─── Shiki syntax highlighting ────────────────

	const highlightedBasic = ref('');
	const highlightedForms = ref('');
	const highlightedMocks = ref('');

	onMounted(async () => {
		const { createHighlighter } = await import('shiki');
		const highlighter = await createHighlighter({
			themes: ['github-dark'],
			langs: ['typescript'],
		});
		const opts = {
			lang: 'typescript' as const,
			theme: 'github-dark' as const,
		};
		highlightedBasic.value = highlighter.codeToHtml(exampleBasic, opts);
		highlightedForms.value = highlighter.codeToHtml(exampleForms, opts);
		highlightedMocks.value = highlighter.codeToHtml(exampleMocks, opts);
	});

	return {
		t,
		activeTab,
		activeTabIndex,
		tabDirection,
		setTab,
		tabItems,
		exampleBasic,
		exampleForms,
		exampleMocks,
		highlightedBasic,
		highlightedForms,
		highlightedMocks,
	};
}
