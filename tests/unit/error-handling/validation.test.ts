
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Error Handling: Missing Required Fields', () => {
  interface IUser {
    id: number;
    email: string;
    nickname?: string;
  }

  @Quick()
  class User extends QModel<IUser> {
    declare id: number;
    declare email: string;
    declare nickname?: string;
  }

  test('should throw when required field is missing', () => {
    expect(() => {
      // @ts-ignore - Testing runtime validation
      new User({ email: 'test@test.com' }); // missing 'id'
    }).toThrow(/Required field.*id.*missing/);
  });

  test('should allow optional fields to be missing', () => {
    expect(() => {
      // @ts-ignore
      new User({ id: 1, email: 'test@test.com' }); // nickname is optional
    }).not.toThrow();
  });
});
