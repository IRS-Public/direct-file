import { Path } from '../fact-dictionary/Path.js';
import { useEnumOptions } from './useEnumOptions.js';
import { vi } from 'vitest';

const mockFactGraph = vi.hoisted(() => {
  const getOptionsPathForEnum = vi.fn();
  const get = vi.fn();
  const getDictionary = vi.fn(() => ({
    getOptionsPathForEnum,
  }));

  return { getDictionary, getOptionsPathForEnum, get };
});
vi.mock(`../factgraph/FactGraphContext`, () => ({
  useFactGraph: () => ({ factGraph: mockFactGraph }),
}));
vi.mock(`@irs/js-factgraph-scala`, () => {
  const fakeConvert = (val: unknown) => val;
  return { unwrapScalaOptional: fakeConvert, scalaListToJsArray: fakeConvert };
});

describe(`useEnumOptions`, () => {
  const path = `/mockFact` as Path;
  const mockOptionsPath = `/mockFactOptions`;
  const mockOptionValues = [`mock option 1`, `fake option 2`];

  it(`gets the correct information from the fact graph`, () => {
    mockFactGraph.getOptionsPathForEnum.mockReturnValueOnce(mockOptionsPath);
    mockFactGraph.get.mockReturnValueOnce({ complete: true, get: mockOptionValues });

    const { optionsPath, values } = useEnumOptions(path, null);

    expect(optionsPath).toEqual(mockOptionsPath);
    expect(values).toEqual(mockOptionValues);
  });
  it(`throws an error if no options path is found`, () => {
    mockFactGraph.getOptionsPathForEnum.mockReturnValueOnce(mockOptionsPath);
    expect(() => useEnumOptions(path, null)).toThrowError();
  });
  it(`throws an error if no option values are found`, () => {
    mockFactGraph.getOptionsPathForEnum.mockReturnValueOnce(mockOptionsPath);
    expect(() => useEnumOptions(path, null)).toThrowError();
  });
});
