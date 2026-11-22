import { describe, expect, it } from 'vitest';
import {
  expectArrayOf,
  expectInteger,
  expectNullableString,
  expectString,
  expectArray,
  expectIntegerArray,
  expectOneOf,
  expectRecord,
  expectStringArray,
  ValidationError,
} from './validation.ts';

describe('validation', () => {
  it('returns valid values unchanged', () => {
    const array = [1, 2, 3];
    expect(expectIntegerArray(array, 'values')).toBe(array);
    expect(expectOneOf('b', ['a', 'b'], 'value')).toBe('b');
    expect(expectRecord({ a: 1 }, 'value')).toEqual({ a: 1 });
  });

  it('names the offending path', () => {
    expect(() => expectIntegerArray([1, 2.5], 'links.votes')).toThrow(
      new ValidationError('links.votes[1]', 'expected an integer'),
    );
    expect(() => expectStringArray(['a', 1], 'verses')).toThrow('verses[1]: expected a string');
    expect(() => expectArrayOf([1, 'x'], 'items', expectInteger)).toThrow(
      'items[1]: expected an integer, got string',
    );
  });

  it('distinguishes objects from arrays and null', () => {
    expect(() => expectRecord([], 'file')).toThrow('file: expected an object, got array');
    expect(() => expectRecord(null, 'file')).toThrow('file: expected an object, got null');
  });

  it('lists allowed values', () => {
    expect(() => expectOneOf('c', ['a', 'b'], 'level')).toThrow(
      'level: expected one of "a", "b", got "c"',
    );
  });

  it('validates nullable and ordinary strings with precise type diagnostics', () => {
    expect(expectString('text', 'name')).toBe('text');
    expect(expectNullableString(null, 'name')).toBeNull();
    expect(expectNullableString('text', 'name')).toBe('text');
    expect(() => expectString(4, 'name')).toThrow('name: expected a string, got number');
    expect(() => expectNullableString([], 'name')).toThrow('name: expected a string, got array');
    expect(expectArray(['a'], 'values')).toEqual(['a']);
    expect(() => expectArray('a', 'values')).toThrow('values: expected an array, got string');
    expect(expectStringArray(['a', 'b'], 'strings')).toEqual(['a', 'b']);
  });
});
