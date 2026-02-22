# TC39 Decorators

## What is TC39?

**TC39** (Technical Committee 39) is the standards body responsible for evolving the JavaScript language.  
It is a committee of [Ecma International](https://www.ecma-international.org/) made up of representatives from browser vendors, tooling companies, and the wider JavaScript community.

TC39 defines the official ECMAScript specification progress through a 5-stage process (Stage 0 → Stage 4):

| Stage | Name        | Meaning                                                   |
| ----- | ----------- | --------------------------------------------------------- |
| 0     | Strawperson | Informal idea — no specification yet                      |
| 1     | Proposal    | Accepted for consideration; champion assigned             |
| 2     | Draft       | Precise semantics being specified                         |
| 3     | Candidate   | Feature-complete; feedback from implementations requested |
| 4     | Finished    | Included in the next ECMAScript annual release            |

The **TC39 Decorator Proposal** reached **Stage 3** and was officially added to the ECMAScript annual edition.  
You can follow its status and specification directly on the proposal repository:

🔗 **[tc39/proposal-decorators](https://github.com/tc39/proposal-decorators)**

## TC39 Decorators in TypeScript

TypeScript **5.0** (released March 2023) added native support for TC39 standard decorators.  
These are fundamentally different from the older `experimentalDecorators` flag and **do not require any compiler flag**.

::: info Available from TypeScript 5.0+
TC39 decorator mode is supported starting with **TypeScript ≥ 5.0**.  
If your project targets TypeScript < 5.0, you must use Legacy mode (`experimentalDecorators: true`).
:::

### Quick comparison

| Mode       | `tsconfig.json`                | TS version required | Field syntax              |
| ---------- | ------------------------------ | ------------------- | ------------------------- |
| **TC39**   | _(no flag needed)_             | **≥ 5.0**           | `fieldName!: Type`        |
| **Legacy** | `experimentalDecorators: true` | ≥ 3.4               | `declare fieldName: Type` |

## Using TC39 mode with QuickModel

To enable TC39 standard decorators, simply **omit** the `experimentalDecorators` flag (or set it to `false`) in your `tsconfig.json`:

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"lib": ["ES2022"]
	}
}
```

Then use `!` (definite assignment assertion) instead of `declare` for all decorated fields:

```typescript
// TC39 mode — no experimentalDecorators flag
@Quick({
	name: String,
	createdAt: Date,
})
class User extends QModel<IUser> {
	name!: string; // ✅ TC39: use ! (not declare)
	createdAt!: Date; // ✅
}
```

### Per-field with `@QType`

```typescript
// TC39 mode — @QType with !
@Quick()
class Post extends QModel<IPost> {
	@QType(Date)
	publishedAt!: Date; // ✅ TC39 mode

	@QType(String)
	title!: string; // ✅
}
```

::: warning TC39 without `@Quick`
In TC39 mode, field initializers run automatically (controlled by `useDefineForClassFields`, which defaults to `true` for ES2022+ targets). Omitting `@Quick()` can cause field initializers to shadow QuickModel's getters/setters. Always pair `@Quick()` with any `@QType()` usage in TC39 mode.
:::

## Legacy mode still supported

QuickModel fully supports both decorator modes. Legacy mode (`experimentalDecorators: true`) remains available for projects that cannot upgrade to TypeScript 5.0 or rely on tools that require the older decorator semantics.

See [Installation](./installation) for full `tsconfig.json` examples for both modes.

## Further reading

- 🔗 [TC39 Proposal — Decorators](https://github.com/tc39/proposal-decorators) — official proposal repository
- 🔗 [TC39 Proposals tracker](https://tc39.es/process-document/) — stages process document
- 🔗 [TypeScript 5.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html) — decorators section
