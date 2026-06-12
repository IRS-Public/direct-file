import { useGetTranslationValues } from './useGetTranslationValues.js';
import { renderHook } from '@testing-library/react';
import { getTranslationValuesRecursive } from '../utils/i18nUtils.js';
import { vi } from 'vitest';

const { mockT, mockI18n } = vi.hoisted(() => {
  return {
    mockT: vi.fn(),
    mockI18n: { language: `en`, exists: vi.fn((_key: string) => true) },
  };
});
vi.mock(`react-i18next`, () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: mockI18n,
  }),
}));

describe(useGetTranslationValues.name, () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it(`returns all the translation values at a given key recursively`, () => {
    const nestedArray = [`nested value 1`, `nested value 2`, `nested value 3`];
    const objectNestedArray = [`object nested string 1`, `object nested string 2`, `object nested string 3`];
    const i18nValue = {
      key1: `value 1`,
      key2: nestedArray,
      key3: {
        nestedKey1: `nested value 1`,
        nestedKey2: `nested value 2`,
        nestedKey3: objectNestedArray,
      },
    };

    mockT.mockReturnValueOnce(i18nValue);

    const {
      result: { current: getTranslationValues },
    } = renderHook(useGetTranslationValues);

    const values = getTranslationValues(`someKey`);
    // Full coverage of i18n value permutations lives in getTranslationValuesRecursive tests.
    // Just use the more complex one here for validating the hook passes the right value
    // along from the util it encapsulates.
    const expected = getTranslationValuesRecursive(i18nValue);

    expect(values.length).toEqual(expected.length);
    expected.forEach((expectedValue) => expect(values.includes(expectedValue)));
  });
});
