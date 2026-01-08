const isObject = (value: string | boolean | number | object) =>
	typeof value === 'object';

const isString = (value: unknown): value is string => typeof value === 'string';

const isNumber = (value: unknown): value is number => typeof value === 'number';

const isBoolean = (value: unknown): value is boolean =>
	typeof value === 'boolean';

const isBigInt = (value: unknown): value is bigint => typeof value === 'bigint';

const isSymbol = (value: unknown): value is symbol => typeof value === 'symbol';

const isNull = (value: unknown): value is null => value === null;

const isUndefined = (value: unknown): value is undefined => value === undefined;

const everyValue = () => {
	// Numbers
	const num = 42;
	const numObj = new Number(42);
	const numObj2 = Number(42);
	const numLiteral = +'42';
	const numNaN = NaN;
	const numInfinity = Infinity;
	const numNegInfinity = -Infinity;
	
	// Strings
	const str = 'hello';
	const strObj = new String('hello');
	const strObj2 = String('hello');
	const strLiteral = `world`;
	const strEmpty = '';
	
	// Booleans
	const bool = true;
	const boolObj = new Boolean(true);
	const boolObj2 = Boolean(true);
	const boolFalse = false;
	
	// BigInt
	const bigInt = 99999e124;
	const bigIntObj = BigInt(99999);
	const bigIntLiteral = 99999n;
	const bigIntZero = 0n;
	
	// Symbols - CASOS ESPECIALES
	const sym = Symbol('test');
	const symFor = Symbol.for('global');
	const symIterator = Symbol.iterator;
	const symToString = Symbol.toStringTag;
	const symAnon = Symbol();
	// NOTE: No existe new Symbol() - lanza TypeError
	// const symObj = new Symbol('test'); // ❌ TypeError: Symbol is not a constructor
	
	// Null y Undefined
	const nullVal = null;
	const undefinedVal = undefined;
	const undefinedVoid = void 0;

	console.log('\n=== NÚMEROS ===');
	for (const value of [num, numObj, numObj2, numLiteral, numNaN, numInfinity, numNegInfinity]) {
		console.log(
			`Value: ${String(value).padEnd(20)} | typeof: ${typeof value} | isObject: ${isObject(value)} | isNumber: ${isNumber(value)}`
		);
	}

	console.log('\n=== STRINGS ===');
	for (const value of [str, strObj, strObj2, strLiteral, strEmpty]) {
		console.log(
			`Value: "${String(value)}".padEnd(20) | typeof: ${typeof value} | isObject: ${isObject(value)} | isString: ${isString(value)}`
		);
	}

	console.log('\n=== BOOLEANS ===');
	for (const value of [bool, boolObj, boolObj2, boolFalse]) {
		console.log(
			`Value: ${String(value).padEnd(20)} | typeof: ${typeof value} | isObject: ${isObject(value)} | isBoolean: ${isBoolean(value)}`
		);
	}

	console.log('\n=== BIGINT ===');
	for (const value of [bigInt, bigIntObj, bigIntLiteral, bigIntZero]) {
		console.log(
			`Value: ${String(value).padEnd(20)} | typeof: ${typeof value} | isObject: ${isObject(value)} | isBigInt: ${isBigInt(value)}`
		);
	}

	console.log('\n=== SYMBOLS - CASOS ESPECIALES ===');
	for (const value of [sym, symFor, symIterator, symToString, symAnon]) {
		console.log(
			`Value: ${String(value).padEnd(30)} | typeof: ${typeof value} | isSymbol: ${isSymbol(value)} | description: ${(value as symbol).description}`
		);
	}
	
	console.log('\n--- Symbol behavior ---');
	console.log('Symbol() === Symbol():', Symbol() === Symbol()); // false - cada Symbol es único
	console.log('Symbol.for("x") === Symbol.for("x"):', Symbol.for('x') === Symbol.for('x')); // true - global registry
	console.log('Symbol("x") === Symbol("x"):', Symbol('x') === Symbol('x')); // false - distintos
	console.log('Symbol.iterator === Symbol.iterator:', Symbol.iterator === Symbol.iterator); // true - well-known symbol
	console.log('typeof Symbol():', typeof Symbol()); // "symbol"
	console.log('Symbol() instanceof Symbol:', Symbol() instanceof Symbol); // false - primitivo, no objeto
	console.log('Object(Symbol()) instanceof Symbol:', Object(Symbol()) instanceof Symbol); // true - wrapper
	
	console.log('\n=== NULL Y UNDEFINED ===');
	for (const value of [nullVal, undefinedVal, undefinedVoid]) {
		console.log(
			`Value: ${String(value).padEnd(20)} | typeof: ${typeof value} | isNull: ${isNull(value)} | isUndefined: ${isUndefined(value)}`
		);
	}
	
	console.log('\n--- null vs undefined quirks ---');
	console.log('typeof null:', typeof null); // "object" - bug histórico de JavaScript
	console.log('typeof undefined:', typeof undefined); // "undefined"
	console.log('null == undefined:', null == undefined); // true
	console.log('null === undefined:', null === undefined); // false
	console.log('Object(null):', Object(null)); // {} - empty object
	console.log('Object(undefined):', Object(undefined)); // {} - empty object
};

everyValue();
