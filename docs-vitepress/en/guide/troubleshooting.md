# Troubleshooting

Common issues and solutions when working with QuickModel.

## Properties Not Transforming

**Symptom:** You access `user.createdAt` but it's still a string, not a `Date`.

**Cause:** TypeScript Property Initializers.
If you define a property with a default value, TypeScript generates code that runs _after_ the parent constructor, overwriting the deserialized value.

```typescript
// ❌ BAD
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	// This runs AFTER deserialization, resetting the value!
	createdAt: Date = new Date();
}
```

**Solution:** Use `declare` or strict initialization (`!`).

```typescript
// ✅ GOOD
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	declare createdAt: Date; // No runtime code generated
}
```

## "Property has no initializer" Error

**Symptom:** TypeScript Error `TS2564: Property 'name' has no initializer and is not definitely assigned in the constructor.`

**Cause:** Strict Class Initialization checking in `tsconfig.json`.

**Solution:** Use the definite assignment assertion operator (`!`).

```typescript
class User extends QModel<IUser> {
	name!: string; // Trust me, this will be assigned
}
```

## Circular Dependencies

**Symptom:** `ReferenceError: Cannot access 'User' before initialization` or infinite loops during serialization.

**Cause:** Two models importing each other.

**Solution:**
QuickModel handles circular references in serialization automatically using `WeakSet`.
For runtime imports, ensure you aren't creating immediate import cycles.

## "User.from is not a function"

**Symptom:** Using methods that stick in your memory but don't exist.

**Solution:**

- Use `new User(data)` (Constructor)
- Use `User.create(data)` (Factory)
- Use `User.fromJSON(str)` (String parsing)

## Mocks returning "Builder"

**Symptom:** `User.mock()` returns an object with methods like `random` instead of the user instance.

**Cause:** `User.mock()` starts the builder pattern.

**Solution:** Chain `.random()` or `.array()`.

```typescript
// ❌ WRONG
const user = User.mock();

// ✅ RIGHT
const user = User.mock().random();
```
