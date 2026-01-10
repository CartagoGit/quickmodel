
class Base<I> {
  constructor(data: I) {}

  static create<
    TResult = 'DEFAULT', 
    TData = any
  >(
    this: new (d: TData) => any, 
    data: TData
  ): TResult extends 'DEFAULT' ? InstanceType<typeof this> : TResult {
    return new (this as any)(data) as any;
  }
}

interface IUser { id: number; name: string }

class User extends Base<IUser> {
  constructor(data: IUser) { super(data) }
}

function test() {
  // 1. Strict
  // Expected to fail
  const a = User.create({ id: 1 });

  // 2. Loose input
  const b = User.create<{ ok: boolean }>({ id: 1 });

  // 3. Strict input override
  // @ts-expect-error
  const c = User.create<{ ok: boolean }, IUser>({ id: 1 });
}
