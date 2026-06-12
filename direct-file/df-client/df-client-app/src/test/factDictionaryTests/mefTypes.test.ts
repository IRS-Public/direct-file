import { describe, expect } from 'vitest';
import { createStringWrapper } from '../persistenceWrappers.js';
import { ConcretePath } from '@irs/js-factgraph-scala';
import { baseFilerData, makeW2Data } from '../testData.js';
import { setupFactGraph } from '../setupFactGraph.js';

describe(`mefBusinessNameLine1Type`, () => {
  const w2Id = `dbf9de84-fe8b-49ce-bf75-2178594910aa`;
  const w2data = makeW2Data(100000, w2Id);
  const baseData = { ...baseFilerData, ...w2data };

  // Regex for mefBusinessNameLine1Type in the fact dictionary is / A-Za-z0-9#\-\(\) &'/
  const testCases = [
    { _testName: `simple string`, input: `Baia's Winery Inc.`, expected: `Baia's Winery Inc` },
    { _testName: `trim spaces`, input: `  Counterpoint  Cafe   `, expected: `Counterpoint Cafe` },
    { _testName: `allowed`, input: `ABZabz0189#-()&'`, expected: `ABZabz0189#-()&'` },
    { _testName: `not allowed`, input: `.^$/@!£§ÁÉÍÑÓ×ÚÜáéíñóúü[]`, expected: `` },
    {
      _testName: `special characters`,
      input: `  San-Diego's #1 Photography & Monkey Biz (.*~;/%")  `,
      expected: `San-Diego's #1 Photography & Monkey Biz (*)`,
    },
  ];

  test.each(testCases)(`testing $_testName`, ({ _testName, input, expected }) => {
    const { factGraph } = setupFactGraph({
      ...baseData,
      [`/formW2s/#${w2Id}/employerName`]: createStringWrapper(input),
    });
    expect(factGraph.get(`/formW2s/#${w2Id}/employerName` as ConcretePath).complete).toBe(true);
    expect(factGraph.get(`/formW2s/#${w2Id}/mefEmployerNameLine1` as ConcretePath).complete).toBe(true);
    expect(factGraph.get(`/formW2s/#${w2Id}/mefEmployerNameLine1` as ConcretePath).get).toBe(expected);
  });
});
