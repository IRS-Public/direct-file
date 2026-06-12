import { Path } from '../../flow/Path.js';
import {
  createBooleanWrapper,
  createCollectionItemWrapper,
  createDollarWrapper,
  createEnumWrapper,
} from '../persistenceWrappers.js';
import { setupFactGraph } from '../setupFactGraph.js';
import { baseFilerData, mfjPrimaryOnlyWithQualifiedHsaDeductions, primaryFilerId } from '../testData.js';
import { describe, it, expect } from 'vitest';

const w2Id = `0b1e355e-3d19-415d-8470-fbafd9f58361`;
const baseIncomeData = {
  '/formW2s': {
    $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
    item: { items: [`${w2Id}`] },
  },
  [`/formW2s/#${w2Id}/filer`]: createCollectionItemWrapper(primaryFilerId),
};

const socialSecurityReportId = `0b1e355e-3d19-415d-8470-fbafd9f58361`;

const baseSocialSecurityData = {
  '/socialSecurityReports': {
    $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
    item: { items: [`${socialSecurityReportId}`] },
  },
  // [`/socialSecurityReports/#${socialSecurityReportId}/formType`]: createEnumWrapper(
  //   `SSA-1099`,
  //   `/socialSecurityIncomeFormTypeOptions`
  // ),
};

const madeSocialSecurityNothingElse = (amt: string) => {
  return {
    ...baseSocialSecurityData,
    [`/socialSecurityReports/#${socialSecurityReportId}/ssaNetBenefits`]: createDollarWrapper(amt),
  };
};

const madeSocialSecurityAndWageIncome = (socialSecurity: string, wages: string) => {
  return {
    ...baseSocialSecurityData,
    [`/socialSecurityReports/#${socialSecurityReportId}/ssaNetBenefits`]: createDollarWrapper(socialSecurity),
    ...baseIncomeData,
    [`/formW2s/#${w2Id}/writableWages`]: createDollarWrapper(wages),
  };
};

const singleFilerData = {
  ...baseFilerData,
  [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
  [`/filingStatus`]: createEnumWrapper(`single`, `/filingStatusOptions`),
};

const mfjFilerData = {
  ...baseFilerData,
  [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
  [`/filingStatus`]: createEnumWrapper(`marriedFilingJointly`, `/filingStatusOptions`),
};

const mfsFilerData = {
  ...baseFilerData,
  [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
  [`/filingStatus`]: createEnumWrapper(`marriedFilingSeparately`, `/filingStatusOptions`),
  [`/spouseLivedTogetherMonths`]: createEnumWrapper(
    `livedTogetherMoreThanSixMonths`,
    `/spouseLivedTogetherMonthsOptions`
  ),
  [`/livedTogetherAllYearWithSpouse`]: createBooleanWrapper(true),
};

// Many of these have been manually calculated with 2023 magic numbers!
// They may require updates when we move to tax year 2024!
describe(`Taxable social security benefits`, () => {
  describe(`When MFJ`, () => {
    it(`Taxable interest is 0`, ({ task }) => {
      task.meta.testedFactPaths = [`/interestIncome`];
      const { factGraph } = setupFactGraph({
        ...mfjFilerData,
        ...madeSocialSecurityNothingElse(`63000`),
      });
      expect(factGraph.get(Path.concretePath(`/interestIncome`, null)).get.toString()).toBe(`0.00`);
    });
    it(`Returns 0 if below the 64k untaxable amount and no other income`, ({ task }) => {
      task.meta.testedFactPaths = [`/taxableSocialSecurityBenefits`];
      const { factGraph } = setupFactGraph({
        ...mfjFilerData,
        ...madeSocialSecurityNothingElse(`63000`),
      });
      expect(factGraph.get(Path.concretePath(`/taxableSocialSecurityBenefits`, null)).get.toString()).toBe(`0.00`);
    });
    it(`Starts getting taxed above the 64k untaxable amount and no other income`, ({ task }) => {
      task.meta.testedFactPaths = [`/taxableSocialSecurityBenefits`];

      const { factGraph } = setupFactGraph({
        ...mfjFilerData,
        ...madeSocialSecurityNothingElse(`65000`),
      });
      expect(factGraph.get(Path.concretePath(`/taxableSocialSecurityBenefits`, null)).get.toString()).toBe(`250.00`);
    });
    it(`Below a threshehold, the taxable portion of social security income is zero`, ({ task }) => {
      task.meta.testedFactPaths = [`/taxableSocialSecurityBenefits`];

      const { factGraph } = setupFactGraph({
        ...mfjFilerData,
        ...madeSocialSecurityAndWageIncome(`32000`, `15000`),
      });
      expect(factGraph.get(Path.concretePath(`/taxableSocialSecurityBenefits`, null)).get.toString()).toBe(`0.00`);
    });
    it(`Starts getting taxed when there is other income in addition to social security income above a threshold`, ({
      task,
    }) => {
      task.meta.testedFactPaths = [`/taxableSocialSecurityBenefits`];

      const { factGraph } = setupFactGraph({
        ...mfjFilerData,
        ...madeSocialSecurityAndWageIncome(`32000`, `17000`),
      });
      expect(factGraph.get(Path.concretePath(`/taxableSocialSecurityBenefits`, null)).get.toString()).toBe(`500.00`);
    });
    it(`Reduces the taxable portion of social security income when there are HSA deductions`, ({ task }) => {
      task.meta.testedFactPaths = [`/taxableSocialSecurityBenefits`];

      const { factGraph } = setupFactGraph({
        ...mfjFilerData,
        ...mfjPrimaryOnlyWithQualifiedHsaDeductions,
        ...madeSocialSecurityAndWageIncome(`32000`, `17000`),
        [`/filers/#${primaryFilerId}/writableHsaNonemployerContributionsTaxYear`]: createDollarWrapper(`1000.00`),
        [`/filers/#${primaryFilerId}/writableHsaNonemployerContributionsTaxYearPlusOne`]: createDollarWrapper(`0.00`),
      });

      // https://www.irs.gov/instructions/i1040gi#w24811v03
      // 1. Total from 1040 box 5 = /socialSecurityBenefits = 32000
      // 2. Multiply by 0.5 = 16000
      // 3. Sum of Form 1040 or 1040-SR, lines 1z, 2b, 3b, 4b, 5b, 7, and 8 = /socialSecurityBenefitsWkshtLine3 = 17000
      // 4. 2a = 0
      // 5. Sum of lines 2, 3, 4 = 33000
      // 6. Enter the total of the amounts from Schedule 1, lines 11 through 20, and 23
      // and 25 = /adjustmentsToIncomeExcludingStudentLoanInterest = 1000
      // 7. Is line 6 less than  line 5? Yes, Line 5 - Line 6 = 32000
      // 8. MFJ so 32000
      // 9. Is line 8 less than line 7? No so 0

      expect(
        factGraph.get(Path.concretePath(`/adjustmentsToIncomeExcludingStudentLoanInterest`, null)).get.toString()
      ).toBe(`1000.00`);
      expect(factGraph.get(Path.concretePath(`/taxableSocialSecurityBenefits`, null)).get.toString()).toBe(`0.00`);
    });
  });
  describe(`When Single`, () => {
    it(`Returns 0 if below the 50k untaxable amount and no other income`, ({ task }) => {
      task.meta.testedFactPaths = [`/taxableSocialSecurityBenefits`];

      const { factGraph } = setupFactGraph({
        ...singleFilerData,
        ...madeSocialSecurityNothingElse(`49000`),
      });
      expect(factGraph.get(Path.concretePath(`/taxableSocialSecurityBenefits`, null)).get.toString()).toBe(`0.00`);
    });
    it(`Returns 0 if social security income is negative`, ({ task }) => {
      task.meta.testedFactPaths = [`/taxableSocialSecurityBenefits`];

      const { factGraph } = setupFactGraph({
        ...singleFilerData,
        ...madeSocialSecurityNothingElse(`-2500`),
      });
      expect(factGraph.get(Path.concretePath(`/taxableSocialSecurityBenefits`, null)).get.toString()).toBe(`0.00`);
    });

    it(`Returns 0 if social security income is negative, line 7 is positive, and line 9 is negative`, ({ task }) => {
      task.meta.testedFactPaths = [`/taxableSocialSecurityBenefits`];

      const { factGraph } = setupFactGraph({
        ...singleFilerData,
        ...madeSocialSecurityAndWageIncome(`-2500`, `20000`),
      });
      expect(factGraph.get(Path.concretePath(`/taxableSocialSecurityBenefits`, null)).get.toString()).toBe(`0.00`);
    });
    it(`Returns 0 if below the 50k untaxable amount and no other income`, ({ task }) => {
      task.meta.testedFactPaths = [`/taxableSocialSecurityBenefits`];

      const { factGraph } = setupFactGraph({
        ...singleFilerData,
        ...madeSocialSecurityNothingElse(`51000`),
      });
      expect(factGraph.get(Path.concretePath(`/taxableSocialSecurityBenefits`, null)).get.toString()).toBe(`250.00`);
    });
    it(`Below a threshehold, social security income is not taxed on social security income and wage income`, ({
      task,
    }) => {
      task.meta.testedFactPaths = [`/taxableSocialSecurityBenefits`];

      const { factGraph } = setupFactGraph({
        ...singleFilerData,
        ...madeSocialSecurityAndWageIncome(`40000`, `1000`),
      });
      expect(factGraph.get(Path.concretePath(`/taxableSocialSecurityBenefits`, null)).get.toString()).toBe(`0.00`);
    });
    it(`Starts getting taxed when there is other income in addition to social security income above a threshold`, ({
      task,
    }) => {
      task.meta.testedFactPaths = [`/taxableSocialSecurityBenefits`];

      const { factGraph } = setupFactGraph({
        ...singleFilerData,
        ...madeSocialSecurityAndWageIncome(`40000`, `10000`),
      });
      expect(factGraph.get(Path.concretePath(`/taxableSocialSecurityBenefits`, null)).get.toString()).toBe(`2500.00`);
    });
  });
  describe(`When MFS and not living apart`, () => {
    it(`Returns 85% of half the total amount`, ({ task }) => {
      task.meta.testedFactPaths = [`/taxableSocialSecurityBenefits`];

      const { factGraph } = setupFactGraph({
        ...mfsFilerData,
        ...madeSocialSecurityNothingElse(`20000`),
      });
      expect(factGraph.get(Path.concretePath(`/taxableSocialSecurityBenefits`, null)).get.toString()).toBe(`8500.00`);
    });
    it(`Returns 0 if the social security income is negative`, ({ task }) => {
      task.meta.testedFactPaths = [`/taxableSocialSecurityBenefits`];

      const { factGraph } = setupFactGraph({
        ...mfsFilerData,
        ...madeSocialSecurityNothingElse(`-2500`),
      });
      expect(factGraph.get(Path.concretePath(`/taxableSocialSecurityBenefits`, null)).get.toString()).toBe(`0.00`);
    });

    it(`Returns 0 if the social security income is negative, even when there is other income`, ({ task }) => {
      task.meta.testedFactPaths = [`/taxableSocialSecurityBenefits`];

      const { factGraph } = setupFactGraph({
        ...mfsFilerData,
        ...madeSocialSecurityAndWageIncome(`-2500`, `20000`),
      });
      expect(factGraph.get(Path.concretePath(`/taxableSocialSecurityBenefits`, null)).get.toString()).toBe(`0.00`);
    });
  });
});
