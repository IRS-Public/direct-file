import { Path } from '../fact-dictionary/Path.js';
import useTranslationContextFromFacts from './useTranslationContextFromFacts.js';
import { Day, FactGraph } from '@irs/js-factgraph-scala';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => {
  // translation
  const t = vi.fn((key: string | string[]) => (Array.isArray(key) ? key[0] : key));

  return { t };
});

vi.mock(`react-i18next`, () => ({
  useTranslation: () => {
    return {
      t: mocks.t,
    };
  },
  initReactI18next: {
    type: `3rdParty`,
    init: () => {},
  },
}));

vi.mock(`react`, () => ({
  useMemo: (f: () => unknown) => f(),
}));

describe(useTranslationContextFromFacts.name, () => {
  type ExpectCorrectResult = (factValue: unknown, resolveValue: unknown) => void;
  const expectEnum = ((
    factEnum: { getValue: () => string; getEnumOptionsPath: () => string },
    resolvedValue: string
  ) => {
    expect(resolvedValue).toEqual(mocks.t(`fields./fake/fact.${factEnum.getEnumOptionsPath()}.${factEnum.getValue()}`));
  }) as ExpectCorrectResult;

  test.each([
    [
      `gov.irs.factgraph.types.Day`,
      (factValue: unknown) => expect(factValue).toBeInstanceOf(Date),
      { year: 2023, month: 2, day: 21 },
      ((expectedDate: Day, resolvedDate: Date) => {
        expect(expectedDate.year).toEqual(resolvedDate.getFullYear());
        expect(expectedDate.month).toEqual(resolvedDate.getMonth() + 1); // Javascript zero-indexes its months
        expect(expectedDate.day).toEqual(resolvedDate.getDate());
      }) as ExpectCorrectResult,
    ],
    [
      `gov.irs.factgraph.types.GenericString`,
      (factValue: unknown) => expect(typeof factValue).toEqual(`string`),
      `Hello world!`,
      ((expectedString: string, resolvedString: string) =>
        expect(resolvedString).toEqual(expectedString)) as ExpectCorrectResult,
    ],
    [
      `gov.irs.factgraph.types.MultiEnum`,
      (factValue: unknown) => expect(typeof factValue).toEqual(`string`),
      {
        getValue: (): string[] => [`enumValue`],
        getEnumOptionsPath: (): string => `enumOptionsPath`,
      },
      expectEnum,
    ],
    [
      `gov.irs.factgraph.types.Enum`,
      (factValue: unknown) => expect(typeof factValue).toEqual(`string`),
      {
        getValue: (): string => `enumValue`,
        getEnumOptionsPath: (): string => `enumOptionsPath`,
      },
      expectEnum,
    ],
    [
      `scala.math.BigDecimal`,
      (factValue: unknown) => expect(typeof factValue).toEqual(`number`),
      1.23,
      ((factNumber: number, resolvedNumber: number) =>
        expect(factNumber).toEqual(resolvedNumber)) as ExpectCorrectResult,
    ],
  ])(`fetches %s values as the correct %s`, (graphType, expectResultType, factValue, expectCorrectResult) => {
    const factPath = `/fake/fact` as Path;

    const mockFactGraph = new Map([
      [factPath, { typeName: `class ${graphType}`, hasValue: true, get: factValue }],
    ]) as unknown as FactGraph;

    const getContext = useTranslationContextFromFacts(mockFactGraph, null);

    const i18nKey = `fake_key`;
    // eslint-disable-next-line eqeqeq
    mocks.t.mockImplementationOnce((key) => (key == i18nKey ? `{{${factPath}}}` : `${key}`));

    const context = getContext(`fake_key`);

    expect(mocks.t).toBeCalled();

    const contextValue = context[factPath];

    expectResultType(contextValue);

    expectCorrectResult(factValue, contextValue);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
