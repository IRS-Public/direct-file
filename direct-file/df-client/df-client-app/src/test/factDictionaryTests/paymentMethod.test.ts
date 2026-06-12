import { it, describe, expect } from 'vitest';
import { Path } from '../../flow/Path.js';
import { createBooleanWrapper, createDayWrapper } from '../persistenceWrappers.js';
import { baseFilerData, filerWithPaymentDueData } from '../testData.js';
import { setupFactGraph } from '../setupFactGraph.js';
import { CURRENT_TAX_YEAR } from '../../constants/taxConstants.js';
import { vi } from 'vitest';

describe(`Payment method`, () => {
  const basePaymentMethodData = {
    ...baseFilerData,
    ...filerWithPaymentDueData,
  };
  const filingYear = parseInt(CURRENT_TAX_YEAR) + 1;

  describe(`Mock today before deadline and the ACH payment date is...`, () => {
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(`${filingYear}-02-15`));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it(`is in the past`, ({ task }) => {
      task.meta.testedFactPaths = [`/achPaymentDateInThePast`];
      const { factGraph } = setupFactGraph({
        ...basePaymentMethodData,
        [`/achPaymentDate`]: createDayWrapper(`${filingYear}-01-15`),
      });
      expect(factGraph.get(Path.concretePath(`/achPaymentDateInThePast`, null)).get).toBe(true);
    });
    it(`is in the future`, ({ task }) => {
      task.meta.testedFactPaths = [`/achPaymentDateAfterDeadline`];
      const { factGraph } = setupFactGraph({
        ...basePaymentMethodData,
        [`/achPaymentDate`]: createDayWrapper(`${filingYear}-04-16`),
      });
      expect(factGraph.get(Path.concretePath(`/achPaymentDateAfterDeadline`, null)).get).toBe(true);
    });
  });

  describe(`Mock today after the deadline and the ACH payment date...`, () => {
    beforeAll(() => {
      vi.useFakeTimers();
      const filingYear = parseInt(CURRENT_TAX_YEAR) + 1;
      vi.setSystemTime(new Date(`${filingYear}-04-17`));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it(`must be today but is not after the deadline`, ({ task }) => {
      task.meta.testedFactPaths = [`/achPaymentDateMustBeToday`];
      const { factGraph } = setupFactGraph({
        ...basePaymentMethodData,
        [`/isResubmitting`]: createBooleanWrapper(true),
        [`/achPaymentDate`]: createDayWrapper(`${filingYear}-04-16`),
      });
      expect(factGraph.get(Path.concretePath(`/achPaymentDateMustBeToday`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/achPaymentDateAfterDeadline`, null)).get).toBe(false);
    });
    it(`must be today and it's after the tax deadline`, ({ task }) => {
      task.meta.testedFactPaths = [`/achPaymentDateMustBeToday`];
      const { factGraph } = setupFactGraph({
        ...basePaymentMethodData,
        [`/isResubmitting`]: createBooleanWrapper(true),
        [`/achPaymentDate`]: createDayWrapper(`${filingYear}-04-18`),
      });
      expect(factGraph.get(Path.concretePath(`/achPaymentDateMustBeToday`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/achPaymentDateAfterDeadline`, null)).get).toBe(true);
    });
  });
});
