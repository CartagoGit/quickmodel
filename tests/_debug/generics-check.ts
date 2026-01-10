
export {};

class Payload {
  constructor(public id: number) {}
}

class Base<I> {
  constructor(data: I) {}

  // Attempt 1: Standard inference fallback
  static create1<
    TResult = 'DEFAULT', 
    TClass = any
  >(
    this: TClass, 
    data: TClass extends new (d: infer D) => any ? D : never
  ): TResult extends 'DEFAULT' ? (TClass extends new (...args: any) => infer R ? R : never) : TResult {
    return new (this as any)(data) as any;
  }

  // Attempt 2: Using defaults that default to inference? (Not really possible directly)
}

interface IUser { id: number; name: string }

class User extends Base<IUser> {
  constructor(data: IUser) { super(data) }
}

// Test Usage
function test() {
  // Case B: Manual Result - INTENTIONAL ERROR IN DATA
  // If validation works, this should fail compilation because 'name' is missing
  // If TClass becomes 'any', data becomes 'any', and this will PASS (which is BAD)
  const b = User.create1<{ custom: boolean }>({ id: 1 }); 
}
