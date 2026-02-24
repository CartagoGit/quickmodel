// WhyQuickModel.constants.ts
// Feature sections data with ES/EN localised HTML bodies.

export interface IWhyFeatureSection {
	icon: string;
	titleEn: string;
	titleEs: string;
	bodyEn: string;
	bodyEs: string;
}

export const whyFeatureSections: IWhyFeatureSection[] = [
	{
		icon: '🔄',
		titleEn: 'Type Transformation',
		titleEs: 'Transformación de Tipos',
		bodyEn: `<ul>
			<li><strong>30+ Transformers</strong>: <code>Date</code>, <code>BigInt</code>, <code>Set</code>, <code>Map</code>, <code>RegExp</code>, <code>Symbol</code>, <code>Error</code>, <code>WeakMap</code>, <code>WeakSet</code>, <code>ArrayBuffer</code>, <code>TypedArray</code>, <code>URL</code>… Each type has its own specialized transformer.</li>
			<li><strong>Multi-dimensional arrays</strong>: explicit syntax <code>[Date]</code>, <code>[[Post]]</code>, <code>[[[Map]]]</code> for 1D, 2D or 3D.</li>
			<li><strong>WeakMap / WeakSet</strong>: in-memory caches that are never serialized. Perfect for GC-friendly runtime references.</li>
			<li><strong>Dot notation</strong>: transform nested properties directly in the parent decorator, without decorating external classes.</li>
		</ul>`,
		bodyEs: `<ul>
			<li><strong>30+ Transformadores</strong>: <code>Date</code>, <code>BigInt</code>, <code>Set</code>, <code>Map</code>, <code>RegExp</code>, <code>Symbol</code>, <code>Error</code>, <code>WeakMap</code>, <code>WeakSet</code>, <code>ArrayBuffer</code>, <code>TypedArray</code>, <code>URL</code>… Cada tipo tiene su propio transformer especializado.</li>
			<li><strong>Arrays multi-dimensionales</strong>: sintaxis explícita <code>[Date]</code>, <code>[[Post]]</code>, <code>[[[Map]]]</code> para 1D, 2D o 3D.</li>
			<li><strong>WeakMap / WeakSet</strong>: cachés en memoria que nunca se serializan. Perfecto para referencias runtime GC-friendly.</li>
			<li><strong>Notación de punto</strong>: transforma propiedades anidadas directamente en el decorador padre, sin decorar clases externas.</li>
		</ul>`,
	},
	{
		icon: '🧠',
		titleEn: 'Decorator System',
		titleEs: 'Sistema de Decoradores',
		bodyEn: `<ul>
			<li><strong><code>@Quick</code></strong>: class-level decorator that configures all transformers at once.</li>
			<li><strong><code>@QType</code></strong>: property-level decorator for specific cases or different contexts.</li>
			<li><strong><code>@QAlias</code></strong>: renames fields between incoming JSON and the instance. Perfect for snake_case ↔ camelCase.</li>
			<li><strong><code>@QComputed</code></strong>: defines getters that appear in <code>serialize()</code> without existing in the original JSON.</li>
			<li><strong><code>excludeFields</code></strong>: permanently excludes fields from all serialization (<code>password</code>, <code>_checksum</code>, etc.).</li>
		</ul>`,
		bodyEs: `<ul>
			<li><strong><code>@Quick</code></strong>: decorador de clase que configura todos los transformadores de golpe.</li>
			<li><strong><code>@QType</code></strong>: decorador de propiedad para casos concretos o contextos distintos.</li>
			<li><strong><code>@QAlias</code></strong>: renombra campos entre el JSON de entrada y la instancia. Perfecto para snake_case ↔ camelCase.</li>
			<li><strong><code>@QComputed</code></strong>: define getters que aparecen en <code>serialize()</code> sin existir en el JSON original.</li>
			<li><strong><code>excludeFields</code></strong>: excluye campos permanentemente de toda serialización (<code>password</code>, <code>_checksum</code>, etc.).</li>
		</ul>`,
	},
	{
		icon: '✅',
		titleEn: 'Two-Layer Validation',
		titleEs: 'Validación en Dos Capas',
		bodyEn: `<ul>
			<li><strong>Layer 1 — Integrity</strong>: <code>checkIntegrity()</code> verifies each value matches its transformer (invalid dates, BigInt out of range, dangerous RegExp).</li>
			<li><strong>Layer 2 — Business</strong>: <code>@QRule</code> applies declarative predicates per field. <code>checkRules()</code> returns errors with field and message.</li>
			<li><strong>Combined</strong>: <code>isValid()</code> runs both layers in a single call. <code>validationReport()</code> separates errors by origin.</li>
		</ul>`,
		bodyEs: `<ul>
			<li><strong>Capa 1 — Integridad</strong>: <code>checkIntegrity()</code> verifica que cada valor coincide con su transformer (fechas inválidas, BigInt fuera de rango, RegExp peligroso).</li>
			<li><strong>Capa 2 — Negocio</strong>: <code>@QRule</code> aplica predicados declarativos por campo. <code>checkRules()</code> devuelve errores con campo y mensaje.</li>
			<li><strong>Combinado</strong>: <code>isValid()</code> ejecuta ambas capas en una sola llamada. <code>validationReport()</code> separa los errores por origen.</li>
		</ul>`,
	},
	{
		icon: '📋',
		titleEn: 'Forms & Group Validation',
		titleEs: 'Formularios y Validación por Grupos',
		bodyEn: `<ul>
			<li><strong>Works on any class</strong>: <code>@QField</code>, <code>@QRule</code> and <code>@QGroup</code> don't require extending <code>QModel</code>. Useful for DTOs, Angular/Vue/React forms…</li>
<li><strong>Groups as wizard steps</strong>: <code>qCheckRulesByGroup()</code> validates only the active group, perfect for multi-step forms.</li>
<li><strong>Async rules</strong>: <code>qCheckRulesAsync()</code> supports predicates returning <code>Promise&lt;boolean&gt;</code> with <code>timeoutMs</code> and <code>serial</code>/<code>parallel</code> mode.</li>
</ul>`,
		bodyEs: `<ul>
			<li><strong>Funciona en cualquier clase</strong>: <code>@QField</code>, <code>@QRule</code> y <code>@QGroup</code> no requieren extender <code>QModel</code>. Sirve para DTOs, formularios Angular/Vue/React…</li>
			<li><strong>Grupos como wizard</strong>: <code>qCheckRulesByGroup()</code> valida solo el grupo activo, perfecto para formularios multi-paso.</li>
			<li><strong>Reglas async</strong>: <code>qCheckRulesAsync()</code> soporta predicados que retornan <code>Promise&lt;boolean&gt;</code> con <code>timeoutMs</code> y modo <code>serial</code>/<code>parallel</code>.</li>
		</ul>`,
	},
	{
		icon: '🗂️',
		titleEn: '7 Schema Formats',
		titleEs: '7 Formatos de Schema',
		bodyEn: `<p>A single <code>getSchema(format)</code> call exports your model as:<br>
			<span class="wqm-schema-pills"><code>json</code> · <code>zod</code> · <code>openapi</code> · <code>mongo</code> · <code>typescript</code> · <code>graphql</code> · <code>ajv</code></span></p>
			<p>Documentation, validation, and API contracts always in sync with your code.</p>`,
		bodyEs: `<p>Un solo método <code>getSchema(format)</code> exporta tu modelo como:<br>
			<span class="wqm-schema-pills"><code>json</code> · <code>zod</code> · <code>openapi</code> · <code>mongo</code> · <code>typescript</code> · <code>graphql</code> · <code>ajv</code></span></p>
			<p>Documentación, validación y contratos de API siempre sincronizados con tu código.</p>`,
	},
	{
		icon: '🤖',
		titleEn: 'MCP Server — AI Integration',
		titleEs: 'Servidor MCP — IA Integrada',
		bodyEn: `<p>QuickModel includes <strong>19 tools</strong> and <strong>19 guided prompts</strong>: <code>create_model</code>, <code>interface_to_model</code>, <code>get_model_schema</code>, <code>generate_mock</code>, <code>simulate_validation</code>, <code>diff_models</code>, <code>roundtrip</code>…</p>
			<ul>
				<li><strong>For beginners</strong>: your AI knows exactly how to write valid QuickModel code because the library tells it.</li>
				<li><strong>For pros</strong>: generate models from JSON in milliseconds and validate architecture without context switching.</li>
			</ul>`,
		bodyEs: `<p>QuickModel incluye <strong>19 herramientas</strong> y <strong>19 prompts guiados</strong>: <code>create_model</code>, <code>interface_to_model</code>, <code>get_model_schema</code>, <code>generate_mock</code>, <code>simulate_validation</code>, <code>diff_models</code>, <code>roundtrip</code>…</p>
			<ul>
				<li><strong>Para novatos</strong>: la IA sabe exactamente cómo escribir QuickModel válido porque la librería se lo dice.</li>
				<li><strong>Para pros</strong>: genera modelos desde JSON en milisegundos y valida arquitectura sin cambiar de contexto.</li>
			</ul>`,
	},
	{
		icon: '🧪',
		titleEn: 'Zero-Boilerplate Mocks',
		titleEs: 'Mocks Sin Fixtures',
		bodyEn: `<ul>
			<li><code>User.mock().random()</code> → valid, typed object with realistic data.</li>
			<li><code>User.mock().array(5)</code> → array of 5 instances.</li>
			<li><code>User.mock().random({ name: 'Alice' })</code> → object with overridden fields.</li>
			<li>Powered by <code>@faker-js/faker</code>. Perfect for building UI before the API exists.</li>
		</ul>`,
		bodyEs: `<ul>
			<li><code>User.mock().random()</code> → objeto válido y tipado con datos realistas.</li>
			<li><code>User.mock().array(5)</code> → array de 5 instancias.</li>
			<li><code>User.mock().random({ name: 'Alice' })</code> → objeto con campos sobreescritos.</li>
			<li>Powered by <code>@faker-js/faker</code>. Perfecto para desarrollar UI antes de que la API exista.</li>
		</ul>`,
	},
	{
		icon: '🧩',
		titleEn: 'Automatic Polymorphism',
		titleEs: 'Polimorfismo Automático',
		bodyEn: `<p>APIs return different shapes in the same list (<code>Payment</code> → <code>Card</code> or <code>PayPal</code>). QuickModel instantiates the correct subclass <strong>automatically</strong> from the data shape. No switch, no factories.</p>`,
		bodyEs: `<p>Las APIs devuelven objetos variados en la misma lista (<code>Payment</code> → <code>Card</code> o <code>PayPal</code>). QuickModel instancia la subclase correcta <strong>automáticamente</strong> según la forma del dato. Sin switch, sin factories.</p>`,
	},
	{
		icon: '🔒',
		titleEn: 'Security & Protection',
		titleEs: 'Seguridad y Protección',
		bodyEn: `<ul>
			<li><strong>Circular references</strong>: <code>toJSON()</code> doesn't crash, returns <code>{ __circular: true }</code>.</li>
<li><strong>Injection</strong>: validates URLs (blocks <code>javascript:</code>) and limits RegExp length.</li>
<li><strong>Prototype pollution</strong>: <code>__proto__</code> properties automatically excluded.</li>
<li><strong>Strict mode</strong>: <code>unknownPropertyPolicy: 'error'</code> throws on unexpected properties in public APIs.</li>
</ul>`,
		bodyEs: `<ul>
			<li><strong>Referencias circulares</strong>: <code>toJSON()</code> no crashea, devuelve <code>{ __circular: true }</code>.</li>
			<li><strong>Inyección</strong>: valida URLs (bloquea <code>javascript:</code>) y limita longitud de RegExp.</li>
			<li><strong>Contaminación de prototipos</strong>: propiedades <code>__proto__</code> excluidas automáticamente.</li>
			<li><strong>Modo estricto</strong>: <code>unknownPropertyPolicy: 'error'</code> lanza error ante propiedades inesperadas en APIs públicas.</li>
		</ul>`,
	},
	{
		icon: '🔗',
		titleEn: 'Compatibility',
		titleEs: 'Compatibilidad',
		bodyEn: `<ul>
			<li><strong>Mixin <code>QModel.extends(BaseClass)</code></strong>: adds superpowers to TypeORM entities, NestJS DTOs, or any class without touching the hierarchy.</li>
			<li><strong>TC39 + Legacy</strong>: compatible with <code>experimentalDecorators</code> (TS 3.4+) and TC39 standard (TS 5+).</li>
			<li><strong>Three property styles</strong>: <code>declare</code>, <code>!</code> and <code>?</code> all work identically.</li>
		</ul>`,
		bodyEs: `<ul>
			<li><strong>Mixin <code>QModel.extends(BaseClass)</code></strong>: añade superpoderes a entidades TypeORM, DTOs de NestJS o cualquier clase sin tocar la jerarquía.</li>
			<li><strong>TC39 + Legacy</strong>: compatible con <code>experimentalDecorators</code> (TS 3.4+) y el estándar TC39 (TS 5+).</li>
			<li><strong>Tres estilos de propiedad</strong>: <code>declare</code>, <code>!</code> y <code>?</code> funcionan igual.</li>
		</ul>`,
	},
];
