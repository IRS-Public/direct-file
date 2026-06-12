import { it, describe, expect } from 'vitest';
import {
  baseFilerData,
  primaryFilerId,
  makeChildData,
  makeW2Data,
  make1099IntData,
  mfjFilerData,
  makeCombatPayData,
  spouseId,
} from '../testData.js';
import {
  createBooleanWrapper,
  createEnumWrapper,
  createDayWrapper,
  createDollarWrapper,
  createTinWrapper,
} from '../persistenceWrappers.js';
import { Path } from '../../flow/Path.js';
import { CURRENT_TAX_YEAR, TAX_YEAR_2024 } from '../../constants/taxConstants.js';
import { setupFactGraph } from '../setupFactGraph.js';

const THRESHOLDS = TAX_YEAR_2024.EITC_INCOME_THRESHOLDS;

const childDependentId = `4fa3a5a7-a9d1-43a9-a0fb-277596e70d48`;
const childDependentId2 = `71c66f78-31b0-4a92-ab5b-c211784b16c7`;
const childDependentId3 = `8f4b5c65-2b14-46fa-bb8b-c449103c798a`;
const dob = {
  barelyFourteenAtStartOfYear: `2008-01-01`,
  adult: `1987-01-01`,
};
const childData = makeChildData(childDependentId, dob.barelyFourteenAtStartOfYear);
const child2Data = makeChildData(childDependentId2, dob.barelyFourteenAtStartOfYear);
const child3Data = makeChildData(childDependentId3, dob.barelyFourteenAtStartOfYear);

const filerWith0Children = {
  ...baseFilerData,
  [`/maritalStatus`]: createEnumWrapper(`single`, `/maritalStatusOptions`),
  [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
  [`/filers/#${primaryFilerId}/dateOfBirth`]: createDayWrapper(`1995-01-01`),
};

const filerWithChild = {
  ...baseFilerData,
  [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
  '/familyAndHousehold': {
    $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
    item: { items: [`${childDependentId}`] },
  },
  ...childData,
};

const filerWith2Children = {
  ...baseFilerData,
  [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
  '/familyAndHousehold': {
    $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
    item: { items: [`${childDependentId}`, `${childDependentId2}`] },
  },
  ...childData,
  ...child2Data,
};

const filerWith3Children = {
  ...baseFilerData,
  [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
  '/familyAndHousehold': {
    $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
    item: { items: [`${childDependentId}`, `${childDependentId2}`, `${childDependentId3}`] },
  },
  ...childData,
  ...child2Data,
  ...child3Data,
};

const mfjFilerWith0Children = {
  ...filerWith0Children,
  ...mfjFilerData,
  [`/filers/#${spouseId}/canBeClaimed`]: createBooleanWrapper(false),
  [`/filers/#${spouseId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
};

const mfjFilerWithChild = {
  ...filerWithChild,
  ...mfjFilerData,
  [`/filers/#${spouseId}/canBeClaimed`]: createBooleanWrapper(false),
  [`/filers/#${spouseId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
};

const mfjFilerWith2Children = {
  ...filerWith2Children,
  ...mfjFilerData,
  [`/filers/#${spouseId}/canBeClaimed`]: createBooleanWrapper(false),
  [`/filers/#${spouseId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
};

const mfjFilerWith3Children = {
  ...filerWith3Children,
  ...mfjFilerData,
  [`/filers/#${spouseId}/canBeClaimed`]: createBooleanWrapper(false),
  [`/filers/#${spouseId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
};

describe(`EITC eligibility`, () => {
  describe(`Income limits`, () => {
    describe(`For single filers`, () => {
      const testCases = [
        {
          name: `A single filer with no income is ineligible for EITC`,
          filer: {
            ...filerWithChild,
            ...makeW2Data(0.0),
          },
          mayBeEligible: false,
        },
        {
          name: `A single filer with 0 eligible children and income above threshold is ineligible for EITC`,
          filer: {
            ...filerWith0Children,
            ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_0QC),
          },
          mayBeEligible: false,
        },
        {
          name: `A single filer with 1 eligible child and income below threshold is eligible for EITC`,
          filer: {
            ...filerWithChild,
            ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC - 1),
          },
          mayBeEligible: true,
        },
        {
          name: `A single filer with 1 eligible child with too high income is ineligible for EITC`,
          filer: {
            ...filerWithChild,
            ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC),
          },
          mayBeEligible: false,
        },
        {
          name: `A single filer with 2 eligible children and income below threshold is eligible for EITC`,
          filer: {
            ...filerWith2Children,
            ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_2QC - 1),
          },
          mayBeEligible: true,
        },
        {
          name: `A single filer with 2 eligible children with too high income is ineligible for EITC`,
          filer: {
            ...filerWith2Children,
            ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_2QC),
          },
          mayBeEligible: false,
        },
        {
          name: `A single filer with 3 eligible children and income below threshold is eligible for EITC`,
          filer: {
            ...filerWith3Children,
            ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_3QC - 1),
          },
          mayBeEligible: true,
        },
        {
          name: `A single filer with 3 eligible children with too high income is ineligible for EITC`,
          filer: {
            ...filerWith3Children,
            ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_3QC),
          },
          mayBeEligible: false,
        },
      ];

      for (const c of testCases) {
        it(c.name, ({ task }) => {
          task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

          const filingStatuses = [
            { [`/filingStatus`]: createEnumWrapper(`single`, `/filingStatusOptions`) },
            { [`/filingStatus`]: createEnumWrapper(`headOfHousehold`, `/filingStatusOptions`) },
            { [`/filingStatus`]: createEnumWrapper(`qualifiedSurvivingSpouse`, `/filingStatusOptions`) },
            {
              [`/filingStatus`]: createEnumWrapper(`marriedFilingSeparately`, `/filingStatusOptions`),
              [`/livedTogetherAllYearWithSpouse`]: createBooleanWrapper(false),
              [`/spouseLivedTogetherMonths`]: createEnumWrapper(
                `livedTogetherSixMonthsOrLess`,
                `/spouseLivedTogetherMonthsOptions`
              ),
              [`/writableLivedApartLastSixMonths`]: createBooleanWrapper(true),
            },
          ];

          for (const filingStatus of filingStatuses) {
            const { factGraph } = setupFactGraph({
              ...c.filer,
              ...filingStatus,
            });

            expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(c.mayBeEligible);
            expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(c.mayBeEligible);
          }
        });
      }

      // Because MFS requires at least one QC, we break out the no child case

      it(`A single filer with 0 eligible children and income below threshold is eligible for EITC`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        for (const filingStatus of [`single`, `headOfHousehold`, `qualifiedSurvivingSpouse`]) {
          const { factGraph } = setupFactGraph({
            ...filerWith0Children,
            ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_0QC - 1),
            [`/filingStatus`]: createEnumWrapper(filingStatus, `/filingStatusOptions`),
          });

          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(true);
          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
        }
      });
    });

    describe(`For joint filers`, () => {
      const testCases = [
        {
          name: `A joint filer with no income is ineligible for EITC`,
          filer: {
            ...mfjFilerWithChild,
            ...makeW2Data(0.0),
          },
          mayBeEligible: false,
        },
        {
          name: `A joint filer with 0 eligible children and income below threshold is eligible for EITC`,
          filer: {
            ...mfjFilerWith0Children,
            ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_0QC_MFJ),
          },
          mayBeEligible: false,
        },
        {
          name: `A joint filer with 0 eligible children and income above threshold is ineligible for EITC`,
          filer: {
            ...mfjFilerWith0Children,
            ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_0QC_MFJ),
          },
          mayBeEligible: false,
        },
        {
          name: `A joint filer with 1 eligible child and income below threshold is eligible for EITC`,
          filer: {
            ...mfjFilerWithChild,
            ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC_MFJ - 1),
          },
          mayBeEligible: true,
        },
        {
          name: `A joint filer with 1 eligible child with too high income is ineligible for EITC`,
          filer: {
            ...mfjFilerWithChild,
            ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC_MFJ),
          },
          mayBeEligible: false,
        },
        {
          name: `A joint filer with 2 eligible children and income below threshold is eligible for EITC`,
          filer: {
            ...mfjFilerWith2Children,
            ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_2QC_MFJ - 1),
          },
          mayBeEligible: true,
        },
        {
          name: `A joint filer with 2 eligible children with too high income is ineligible for EITC`,
          filer: {
            ...mfjFilerWith2Children,
            ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_2QC_MFJ),
          },
          mayBeEligible: false,
        },
        {
          name: `A joint filer with 3 eligible children and income below threshold is eligible for EITC`,
          filer: {
            ...mfjFilerWith3Children,
            ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_3QC_MFJ - 1),
          },
          mayBeEligible: true,
        },
        {
          name: `A joint filer with 3 eligible children with too high income is ineligible for EITC`,
          filer: {
            ...mfjFilerWith3Children,
            ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_3QC_MFJ),
          },
          mayBeEligible: false,
        },
      ];

      for (const c of testCases) {
        it(c.name, ({ task }) => {
          task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

          const { factGraph } = setupFactGraph(c.filer);

          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(c.mayBeEligible);
          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(c.mayBeEligible);
        });
      }
    });
  });

  describe(`Earned income minimum`, () => {
    it(`Is ineligible for EITC if the TP had no earned income and no combat pay`, ({ task }) => {
      task.meta.testedFactPaths = [`/maybeEligibleForEitc`];
      const { factGraph } = setupFactGraph(makeCombatPayData(`0.00`, `0.00`, `0.00`, `0.00`));
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
    });

    it(`Is eligible for EITC if the TP had no wage income but did have combat pay`, ({ task }) => {
      task.meta.testedFactPaths = [`/maybeEligibleForEitc`];
      const { factGraph } = setupFactGraph(makeCombatPayData(`0.00`, `0.00`, `5000.00`, `0.00`));
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
    });

    it(`Is eligible for EITC if the TP had wage income but did not have combat pay`, ({ task }) => {
      task.meta.testedFactPaths = [`/maybeEligibleForEitc`];
      const { factGraph } = setupFactGraph(makeCombatPayData(`5000.00`, `0.00`, `0.00`, `0.00`));
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
    });
  });

  describe(`Must have a valid SSN`, () => {
    describe(`Single returns`, () => {
      const baseCase = {
        ...filerWithChild,
        [`/filingStatus`]: createEnumWrapper(`single`, `/filingStatusOptions`),
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC - 1),
      };

      it(`Eligible if the filer has an SSN`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph(baseCase);

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
      });

      it(`Ineligible if the filer has an ITIN`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          // This is an ITIN
          [`/filers/#${primaryFilerId}/tin`]: createTinWrapper({ area: `988`, group: `11`, serial: `1111` }),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(false);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
      });

      it(`Eligible if the SSN has an active work authorization`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
          [`/filers/#${primaryFilerId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(true),
          [`/filers/#${primaryFilerId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
          [`/primaryFilerSsnEmploymentValidity`]: createEnumWrapper(
            `validOnlyWithDhsAuthorization`,
            `/primaryFilerSsnEmploymentValidityOptions`
          ),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
      });

      it(`Ineligible if the work authorization on the SSN has expired`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
          [`/filers/#${primaryFilerId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(true),
          [`/filers/#${primaryFilerId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
          [`/primaryFilerSsnEmploymentValidity`]: createEnumWrapper(
            `validOnlyWithDhsAuthorizationExpired`,
            `/primaryFilerSsnEmploymentValidityOptions`
          ),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(false);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
      });

      it(`Eligible if the SSN is not valid for employment but wasn't obtained only for benefits`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
          [`/filers/#${primaryFilerId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(true),
          [`/filers/#${primaryFilerId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
          [`/primaryFilerSsnEmploymentValidity`]: createEnumWrapper(
            `notValid`,
            `/primaryFilerSsnEmploymentValidityOptions`
          ),
          [`/filers/#${primaryFilerId}/writableHasSSNOnlyForBenefits`]: createBooleanWrapper(false),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
      });

      it(`Ineligible if the SSN is not valid for employment and was obtained only for benefits`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
          [`/filers/#${primaryFilerId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(true),
          [`/filers/#${primaryFilerId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
          [`/primaryFilerSsnEmploymentValidity`]: createEnumWrapper(
            `notValid`,
            `/primaryFilerSsnEmploymentValidityOptions`
          ),
          [`/filers/#${primaryFilerId}/writableHasSSNOnlyForBenefits`]: createBooleanWrapper(true),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(false);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
      });
    });

    describe(`Joint returns`, () => {
      const baseCase = {
        ...mfjFilerWithChild,
        [`/filingStatus`]: createEnumWrapper(`marriedFilingJointly`, `/filingStatusOptions`),
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC_MFJ - 1),
      };

      it(`Eligible if the both filers have SSNs`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph(baseCase);

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
      });

      it(`Ineligible if the primary filer has an ITIN`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          // This is an ITIN
          [`/filers/#${primaryFilerId}/tin`]: createTinWrapper({ area: `988`, group: `11`, serial: `1111` }),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(false);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
      });

      it(`Eligible if the primary filer's SSN has an active work authorization`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
          [`/filers/#${primaryFilerId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
          [`/filers/#${primaryFilerId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(true),
          [`/primaryFilerSsnEmploymentValidity`]: createEnumWrapper(
            `validOnlyWithDhsAuthorization`,
            `/primaryFilerSsnEmploymentValidityOptions`
          ),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
      });

      it(`Ineligible if the work authorization on the primary filer's SSN has expired`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
          [`/filers/#${primaryFilerId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
          [`/filers/#${primaryFilerId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(true),
          [`/primaryFilerSsnEmploymentValidity`]: createEnumWrapper(
            `validOnlyWithDhsAuthorizationExpired`,
            `/primaryFilerSsnEmploymentValidityOptions`
          ),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(false);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
      });

      it(`Eligible if the primary filer's SSN is not valid for employment but wasn't obtained only for benefits`, ({
        task,
      }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
          [`/filers/#${primaryFilerId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
          [`/filers/#${primaryFilerId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(true),
          [`/primaryFilerSsnEmploymentValidity`]: createEnumWrapper(
            `notValid`,
            `/primaryFilerSsnEmploymentValidityOptions`
          ),
          [`/filers/#${primaryFilerId}/writableHasSSNOnlyForBenefits`]: createBooleanWrapper(false),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
      });

      it(`Ineligible if the primary filer's SSN is not valid for employment and was obtained only for benefits`, ({
        task,
      }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
          [`/filers/#${primaryFilerId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
          [`/filers/#${primaryFilerId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(true),
          [`/primaryFilerSsnEmploymentValidity`]: createEnumWrapper(
            `notValid`,
            `/primaryFilerSsnEmploymentValidityOptions`
          ),
          [`/filers/#${primaryFilerId}/writableHasSSNOnlyForBenefits`]: createBooleanWrapper(true),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(false);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
      });

      it(`Ineligible if the secondary filer has an ITIN`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          // This is an ITIN
          [`/filers/#${spouseId}/tin`]: createTinWrapper({ area: `988`, group: `22`, serial: `2222` }),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(false);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
      });

      it(`Eligible if the secondary filer's SSN has an active work authorization`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          [`/filers/#${spouseId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
          [`/filers/#${spouseId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
          [`/filers/#${spouseId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(true),
          [`/secondaryFilerSsnEmploymentValidity`]: createEnumWrapper(
            `validOnlyWithDhsAuthorization`,
            `/ssnEmploymentValidityOptions`
          ),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
      });

      it(`Ineligible if the work authorization on the secondary filer's SSN has expired`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          [`/filers/#${spouseId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
          [`/filers/#${spouseId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
          [`/filers/#${spouseId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(true),
          [`/secondaryFilerSsnEmploymentValidity`]: createEnumWrapper(
            `validOnlyWithDhsAuthorizationExpired`,
            `/ssnEmploymentValidityOptions`
          ),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(false);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
      });

      it(`Eligible if the secondary filer's SSN is not valid for employment but wasn't obtained only for benefits`, ({
        task,
      }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          [`/filers/#${spouseId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
          [`/filers/#${spouseId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
          [`/filers/#${spouseId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(true),
          [`/secondaryFilerSsnEmploymentValidity`]: createEnumWrapper(`notValid`, `/ssnEmploymentValidityOptions`),
          [`/filers/#${spouseId}/writableHasSSNOnlyForBenefits`]: createBooleanWrapper(false),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
      });

      it(`Ineligible if the secondary filer's SSN is not valid for employment and was obtained only for benefits`, ({
        task,
      }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          [`/filers/#${spouseId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
          [`/filers/#${spouseId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
          [`/filers/#${spouseId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(true),
          [`/secondaryFilerSsnEmploymentValidity`]: createEnumWrapper(`notValid`, `/ssnEmploymentValidityOptions`),
          [`/filers/#${spouseId}/writableHasSSNOnlyForBenefits`]: createBooleanWrapper(true),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(false);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
      });
    });
  });

  describe(`Must be citizen or resident alien all year`, () => {
    describe(`Single returns`, () => {
      const baseCase = {
        ...filerWithChild,
        [`/filingStatus`]: createEnumWrapper(`single`, `/filingStatusOptions`),
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC - 1),
      };

      it(`Eligible if the filer was a U.S. citizen`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
      });

      it(`Ineligible if the filer was not a U.S. citizen or resident`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
          [`/filers/#${primaryFilerId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
          [`/filers/#${primaryFilerId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(false),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(false);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
      });
    });

    describe(`Joint returns`, () => {
      const baseCase = {
        ...mfjFilerWithChild,
        [`/filingStatus`]: createEnumWrapper(`marriedFilingJointly`, `/filingStatusOptions`),
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC_MFJ - 1),
      };

      it(`Eligible if the filers were U.S. citizens`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
          [`/filers/#${spouseId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(true);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
      });

      it(`Ineligible if the primary filer was not a U.S. citizen or resident`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
          [`/filers/#${primaryFilerId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
          [`/filers/#${primaryFilerId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(false),
        });

        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(false);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
      });
    });
    describe(`Married HoH returns`, () => {
      const baseCase = {
        ...mfjFilerWithChild,
        [`/filingStatus`]: createEnumWrapper(`headOfHousehold`, `/filingStatusOptions`),
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC_MFJ - 1),
      };

      it(`Ineligible if married even if filing status is HoH`, ({ task }) => {
        task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

        const { factGraph } = setupFactGraph({
          ...baseCase,
          [`/filers/#${spouseId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
          [`/filers/#${spouseId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
          [`/filers/#${spouseId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(false),
          [`/familyAndHousehold/#${childDependentId}/ownSupport`]: createBooleanWrapper(false),
          [`/familyAndHousehold/#${childDependentId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
          [`/livedTogetherAllYearWithSpouse`]: createBooleanWrapper(true),
          [`/writableSeparationAgreement`]: createBooleanWrapper(false),
        });
        // Make sure we set up enough facts that we could actually be HoH
        expect(factGraph.get(Path.concretePath(`/eligibleForHoh`, null)).get).toBe(true);

        // And to be explicit, the filer is married
        expect(factGraph.get(Path.concretePath(`/isMarried`, null)).get).toBe(true);

        // Now the things we actually care to test
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(false);
        expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
      });
    });
  });

  describe(`Investment income limits`, () => {
    const baseCase = {
      ...filerWithChild,
      [`/filingStatus`]: createEnumWrapper(`headOfHousehold`, `/filingStatusOptions`),
      ...makeW2Data(5000.0),
    };

    it(`Eligible if investment income is $11,600 or less`, ({ task }) => {
      task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

      const { factGraph } = setupFactGraph({
        ...baseCase,
        ...make1099IntData(11600.0),
      });

      expect(factGraph.get(Path.concretePath(`/belowEitcInvestmentIncomeLimit`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
    });

    it(`Ineligible if investment income is more than $11,600`, ({ task }) => {
      task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

      const { factGraph } = setupFactGraph({
        ...baseCase,
        ...make1099IntData(11601.0),
      });

      expect(factGraph.get(Path.concretePath(`/belowEitcInvestmentIncomeLimit`, null)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcBase`, null)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
    });
  });

  describe(`Rules with a qualifying child`, () => {
    it(`Requires a qualifying child`, () => {
      const { factGraph } = setupFactGraph({
        ...filerWith0Children,
        [`/filingStatus`]: createEnumWrapper(`single`, `/filingStatusOptions`),
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_0QC - 1),
      });

      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithQc`, null)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithoutQc`, null)).get).toBe(true);
    });

    it(`The qualifying child does not need to have an SSN`, () => {
      const { factGraph } = setupFactGraph({
        ...filerWithChild,
        [`/filingStatus`]: createEnumWrapper(`single`, `/filingStatusOptions`),
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_0QC - 1),
        // This is an ITIN
        [`/familyAndHousehold/#${childDependentId}/tinType`]: createEnumWrapper(`itin`, `/tinTypeOptions`),
      });

      expect(factGraph.get(Path.concretePath(`/numEitcQualifyingChildren`, null)).get).toBe(1);
      expect(factGraph.get(Path.concretePath(`/numEitcDependentsCollectionForCalculation`, null)).get).toBe(0);
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithQc`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithoutQc`, null)).get).toBe(false);
    });

    it(`Has no age requirements`, ({ task }) => {
      task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

      const { factGraph } = setupFactGraph({
        ...filerWithChild,
        [`/filingStatus`]: createEnumWrapper(`single`, `/filingStatusOptions`),
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC - 1),
        [`/filers/#${primaryFilerId}/dateOfBirth`]: createDayWrapper(`${Number.parseInt(CURRENT_TAX_YEAR) - 99}-01-01`),
      });

      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithQc`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
    });

    it(`The taxpayer can be the dependent of another person`, ({ task }) => {
      task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

      const { factGraph } = setupFactGraph({
        ...filerWithChild,
        [`/filingStatus`]: createEnumWrapper(`single`, `/filingStatusOptions`),
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC - 1),
        [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(true),
        [`/filers/#${primaryFilerId}/potentialClaimerMustFile`]: createBooleanWrapper(true),
      });

      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithQc`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
    });
  });

  describe(`Rules without a qualifying child`, () => {
    describe(`Age requirements`, () => {
      describe(`Single returns`, () => {
        const baseCase = {
          ...filerWith0Children,
          [`/filingStatus`]: createEnumWrapper(`single`, `/filingStatusOptions`),
          ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_0QC - 1),
        };

        it(`Eligible if 25`, ({ task }) => {
          task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

          const { factGraph } = setupFactGraph({
            ...baseCase,
            [`/filers/#${primaryFilerId}/dateOfBirth`]: createDayWrapper(
              `${Number.parseInt(CURRENT_TAX_YEAR) - 25}-01-01`
            ),
          });

          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithoutQc`, null)).get).toBe(true);
          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
        });

        it(`Eligible if 64`, ({ task }) => {
          task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

          const { factGraph } = setupFactGraph({
            ...baseCase,
            [`/filers/#${primaryFilerId}/dateOfBirth`]: createDayWrapper(
              `${Number.parseInt(CURRENT_TAX_YEAR) - 64}-01-01`
            ),
          });

          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithoutQc`, null)).get).toBe(true);
          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
        });

        it(`Ineligible if 24 or younger`, ({ task }) => {
          task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

          const { factGraph } = setupFactGraph({
            ...baseCase,
            [`/filers/#${primaryFilerId}/dateOfBirth`]: createDayWrapper(
              `${Number.parseInt(CURRENT_TAX_YEAR) - 24}-01-02`
            ),
          });

          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithoutQc`, null)).get).toBe(false);
          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
        });

        it(`Ineligible if 65 or older`, ({ task }) => {
          task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

          const { factGraph } = setupFactGraph({
            ...baseCase,
            [`/filers/#${primaryFilerId}/dateOfBirth`]: createDayWrapper(
              `${Number.parseInt(CURRENT_TAX_YEAR) - 65}-12-31`
            ),
          });

          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithoutQc`, null)).get).toBe(false);
          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
        });
      });

      describe(`Joint returns`, () => {
        const baseCase = {
          ...mfjFilerWith0Children,
          ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_0QC_MFJ - 1),
        };

        it(`Eligible if the primary filer is between 25 and 64 (inclusive)`, ({ task }) => {
          task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

          const { factGraph } = setupFactGraph({
            ...baseCase,
            [`/filers/#${primaryFilerId}/dateOfBirth`]: createDayWrapper(
              `${Number.parseInt(CURRENT_TAX_YEAR) - 25}-01-01`
            ),
            [`/filers/#${spouseId}/dateOfBirth`]: createDayWrapper(`${Number.parseInt(CURRENT_TAX_YEAR) - 99}-01-01`),
          });

          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithoutQc`, null)).get).toBe(true);
          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
        });

        it(`Eligible if the secondary filer is between 25 and 64 (inclusive)`, ({ task }) => {
          task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

          const { factGraph } = setupFactGraph({
            ...baseCase,
            [`/filers/#${primaryFilerId}/dateOfBirth`]: createDayWrapper(
              `${Number.parseInt(CURRENT_TAX_YEAR) - 19}-01-01`
            ),
            [`/filers/#${spouseId}/dateOfBirth`]: createDayWrapper(`${Number.parseInt(CURRENT_TAX_YEAR) - 64}-01-01`),
          });

          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithoutQc`, null)).get).toBe(true);
          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
        });

        it(`Ineligible if neither filer is between 25 and 64 (inclusive)`, ({ task }) => {
          task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

          const { factGraph } = setupFactGraph({
            ...baseCase,
            [`/filers/#${primaryFilerId}/dateOfBirth`]: createDayWrapper(
              `${Number.parseInt(CURRENT_TAX_YEAR) - 19}-01-01`
            ),
            [`/filers/#${spouseId}/dateOfBirth`]: createDayWrapper(`${Number.parseInt(CURRENT_TAX_YEAR) - 99}-01-01`),
          });

          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithoutQc`, null)).get).toBe(false);
          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
        });
      });
    });

    describe(`Dependent of another`, () => {
      describe(`Single returns`, () => {
        const baseCase = {
          ...filerWith0Children,
          [`/filingStatus`]: createEnumWrapper(`single`, `/filingStatusOptions`),
          ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_0QC - 1),
        };

        it(`Eligible if the taxpayer cannot be the dependent of another`, ({ task }) => {
          task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

          const { factGraph } = setupFactGraph(baseCase);

          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithoutQc`, null)).get).toBe(true);
          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
        });

        it(`Ineligible if can be the dependent of another`, ({ task }) => {
          task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

          const { factGraph } = setupFactGraph({
            ...baseCase,
            [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(true),
            [`/filers/#${primaryFilerId}/potentialClaimerMustFile`]: createBooleanWrapper(true),
          });

          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithoutQc`, null)).get).toBe(false);
          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
        });
      });

      describe(`Joint returns`, () => {
        const baseCase = {
          ...mfjFilerWith0Children,
          ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_0QC_MFJ - 1),
        };

        it(`Eligible if neither taxpayer can be the dependent of another`, ({ task }) => {
          task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

          const { factGraph } = setupFactGraph(baseCase);

          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithoutQc`, null)).get).toBe(true);
          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(true);
        });

        it(`Ineligible if the primary filer can be the dependent of another`, ({ task }) => {
          task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

          const { factGraph } = setupFactGraph({
            ...baseCase,
            [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(true),
            [`/filers/#${primaryFilerId}/potentialClaimerMustFile`]: createBooleanWrapper(true),
            [`/MFJRequiredToFile`]: createBooleanWrapper(false),
            [`/MFJDependentsFilingForCredits`]: createBooleanWrapper(false),
          });

          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithoutQc`, null)).get).toBe(false);
          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
        });

        it(`Ineligible if the secondary filer can be the dependent of another`, ({ task }) => {
          task.meta.testedFactPaths = [`/maybeEligibleForEitc`];

          const { factGraph } = setupFactGraph({
            ...baseCase,
            [`/filers/#${spouseId}/canBeClaimed`]: createBooleanWrapper(true),
            [`/filers/#${spouseId}/potentialClaimerMustFile`]: createBooleanWrapper(true),
            [`/MFJRequiredToFile`]: createBooleanWrapper(false),
            [`/MFJDependentsFilingForCredits`]: createBooleanWrapper(false),
          });

          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithoutQc`, null)).get).toBe(false);
          expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitc`, null)).get).toBe(false);
        });
      });
    });
  });

  it.todo(`The taxpayer cannot be the QC of another (for EIC)`, ({ task }) => {
    task.meta.testedFactPaths = [`/eitcQualified`];
  });

  it.todo(`The taxpayer must not have had EIC disallowed`, ({ task }) => {
    task.meta.testedFactPaths = [`/eitcQualified`];
  });
});

describe(`EITC amount`, () => {
  const eitcQualified = {
    [`/eitcQcOfAnother`]: createBooleanWrapper(false),
    [`/eitcHadImproperClaims`]: createBooleanWrapper(false),
  };

  const educatorExpenses = {
    [`/wasK12Educators`]: createEnumWrapper(`tpDid`, `/k12EducatorOptions`),
    [`/primaryEducatorExpensesWritable`]: createDollarWrapper(`300.00`),
  };

  const intId = `1bfba145-d3d0-43f3-a957-018869aca2dc`;

  const interest = {
    '/interestReports': {
      $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
      item: { items: [`${intId}`] },
    },
    [`/interestReports/#${intId}/has1099`]: createBooleanWrapper(false),
    [`/interestReports/#${intId}/no1099Amount`]: createDollarWrapper(`1.00`),
  };

  const uiId = `f9d3b347-2d71-4c3e-9eba-87e3f0daf42c`;

  const unemployment = {
    '/form1099Gs': {
      $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
      item: { items: [`${uiId}`] },
    },
    [`/form1099Gs/#${uiId}/amount`]: createDollarWrapper(`10000.00`),
    [`/form1099Gs/#${uiId}/writableAmountPaidBackForBenefitsInTaxYear`]: createDollarWrapper(`0.00`),
  };

  const adjustments = [
    educatorExpenses, // -$300
    {},
    interest, // +$1
    unemployment, // +$10,000
  ];

  const testCases = [
    {
      name: `single filer with 0 qp`,
      filer: {
        ...filerWith0Children,
        ...eitcQualified,
      },
      // A: The upper bound of the row before the Earned Income Amount
      // B: The lower bound of the row containing the Earned Income Amount
      // C: The upper bound of the row containing the Threshold Phaseout Amount
      // D: The upper bound of the row before the Completed Phaseout Amount
      // E: The Completed Phaseout Amount minus $1
      //              #  ####  ####  AAAA  BBBB  CCCCC  DDDDD  EEEEE
      thresholds: [1, 2999, 5999, 8249, 8250, 10349, 18549, 18590, 11200],
      expected: [
        [`2.00`, `2.00`, `2.00`, `2.00`],
        [`228.00`, `228.00`, `228.00`, `228.00`],
        [`457.00`, `457.00`, `457.00`, `200.00`],
        [`629.00`, `629.00`, `629.00`, `28.00`],
        [`632.00`, `632.00`, `632.00`, `24.00`],
        [`632.00`, `632.00`, `629.00`, `0.00`],
        [`5.00`, `5.00`, `2.00`, `0.00`],
        [`2.00`, `2.00`, `0.00`, `0.00`],
        [`564.00`, `564.00`, `564.00`, `0.00`],
      ],
    },
    {
      name: `single filer with 1 qp`,
      filer: {
        ...filerWithChild,
        ...eitcQualified,
      },
      // A: The upper bound of the row before the Earned Income Amount
      // B: The lower bound of the row containing the Earned Income Amount
      // C: The upper bound of the row containing the Threshold Phaseout Amount
      // D: The upper bound of the row before the Completed Phaseout Amount
      // E: The Completed Phaseout Amount minus $1
      //           #  AAAAA  BBBBB  CCCCC  DDDDD  EEEEE
      thresholds: [1, 12349, 12350, 22749, 49049, 49083],
      expected: [
        [`9.00`, `9.00`, `9.00`, `9.00`],
        [`4191.00`, `4191.00`, `4191.00`, `4191.00`],
        [`4213.00`, `4213.00`, `4213.00`, `4213.00`],
        [`4213.00`, `4213.00`, `4204.00`, `2614.00`],
        [`9.00`, `9.00`, `3.00`, `0.00`],
        [`3.00`, `3.00`, `0.00`, `0.00`],
      ],
    },
    {
      name: `single filer with 2 qp`,
      filer: {
        ...filerWith2Children,
        ...eitcQualified,
      },
      // A: The upper bound of the row before the Earned Income Amount
      // B: The lower bound of the row containing the Earned Income Amount
      // C: The upper bound of the row containing the Threshold Phaseout Amount
      // D: The upper bound of the row before the Completed Phaseout Amount
      // E: The Completed Phaseout Amount minus $1
      //           #  AAAAA  BBBBB  CCCCC  DDDDD  EEEEE
      thresholds: [1, 17399, 17400, 22749, 55749, 55767],
      expected: [
        [`10.00`, `10.00`, `10.00`, `10.00`],
        [`6950.00`, `6950.00`, `6950.00`, `5980.00`],
        [`6960.00`, `6960.00`, `6960.00`, `5969.00`],
        [`6960.00`, `6960.00`, `6948.00`, `4853.00`],
        [`9.00`, `9.00`, `2.00`, `0.00`],
        [`2.00`, `2.00`, `0.00`, `0.00`],
      ],
    },
    {
      name: `single filer with 3 qp`,
      filer: {
        ...filerWith3Children,
        ...eitcQualified,
      },
      // A: The upper bound of the row before the Earned Income Amount
      // B: The lower bound of the row containing the Earned Income Amount
      // C: The upper bound of the row containing the Threshold Phaseout Amount
      // D: The upper bound of the row before the Completed Phaseout Amount
      // E: The Completed Phaseout Amount minus $1
      //           #  AAAAA  BBBBB  CCCCC  DDDDD  EEEEE
      thresholds: [1, 17399, 17400, 22749, 59849, 59898],
      expected: [
        [`11.00`, `11.00`, `11.00`, `11.00`],
        [`7819.00`, `7819.00`, `7819.00`, `6850.00`],
        [`7830.00`, `7830.00`, `7830.00`, `6839.00`],
        [`7830.00`, `7830.00`, `7818.00`, `5723.00`],
        [`16.00`, `16.00`, `5.00`, `0.00`],
        [`5.00`, `5.00`, `0.00`, `0.00`],
      ],
    },
    {
      name: `joint filer with 0 qp`,
      filer: {
        ...mfjFilerWith0Children,
        ...eitcQualified,
      },
      // A: The upper bound of the row before the Earned Income Amount
      // B: The lower bound of the row containing the Earned Income Amount
      // C: The upper bound of the row containing the Threshold Phaseout Amount
      // D: The upper bound of the row before the Completed Phaseout Amount
      // E: The Completed Phaseout Amount minus $1
      //           #  AAAA  BBBB  CCCCC  DDDDD  EEEEE
      thresholds: [1, 8249, 8250, 17249, 25499, 25510],
      expected: [
        [`2.00`, `2.00`, `2.00`, `2.00`],
        [`629.00`, `629.00`, `629.00`, `557.00`],
        [`632.00`, `632.00`, `632.00`, `554.00`],
        [`632.00`, `632.00`, `630.00`, `0.00`],
        [`3.00`, `3.00`, `0.00`, `0.00`],
        [`0.00`, `0.00`, `0.00`, `0.00`],
      ],
    },
    {
      name: `joint filer with 1 qp`,
      filer: {
        ...mfjFilerWithChild,
        ...eitcQualified,
      },
      // A: The upper bound of the row before the Earned Income Amount
      // B: The lower bound of the row containing the Earned Income Amount
      // C: The upper bound of the row containing the Threshold Phaseout Amount
      // D: The upper bound of the row before the Completed Phaseout Amount
      // E: The Completed Phaseout Amount minus $1
      //           #  AAAAA  BBBBB  CCCCC  DDDDD  EEEEE
      thresholds: [1, 12349, 12350, 29649, 55999, 56003],
      expected: [
        [`9.00`, `9.00`, `9.00`, `9.00`],
        [`4191.00`, `4191.00`, `4191.00`, `4191.00`],
        [`4213.00`, `4213.00`, `4213.00`, `4213.00`],
        [`4213.00`, `4213.00`, `4207.00`, `2617.00`],
        [`5.00`, `5.00`, `0.00`, `0.00`],
        [`0.00`, `0.00`, `0.00`, `0.00`],
      ],
    },
    {
      name: `joint filer with 2 qp`,
      filer: {
        ...mfjFilerWith2Children,
        ...eitcQualified,
      },
      // A: The upper bound of the row before the Earned Income Amount
      // B: The lower bound of the row containing the Earned Income Amount
      // C: The upper bound of the row containing the Threshold Phaseout Amount
      // D: The upper bound of the row before the Completed Phaseout Amount
      // E: The Completed Phaseout Amount minus $1
      //           #  AAAAA  BBBBB  CCCCC  DDDDD  EEEEE
      thresholds: [1, 17399, 17400, 29649, 62649, 62687],
      expected: [
        [`10.00`, `10.00`, `10.00`, `10.00`],
        [`6950.00`, `6950.00`, `6950.00`, `6950.00`],
        [`6960.00`, `6960.00`, `6960.00`, `6960.00`],
        [`6960.00`, `6960.00`, `6953.00`, `4857.00`],
        [`13.00`, `13.00`, `4.00`, `0.00`],
        [`4.00`, `4.00`, `0.00`, `0.00`],
      ],
    },
    {
      name: `joint filer with 3 qp`,
      filer: {
        ...mfjFilerWith3Children,
        ...eitcQualified,
      },
      // A: The upper bound of the row before the Earned Income Amount
      // B: The lower bound of the row containing the Earned Income Amount
      // C: The upper bound of the row containing the Threshold Phaseout Amount
      // D: The upper bound of the row before the Completed Phaseout Amount
      // E: The Completed Phaseout Amount minus $1
      //           #  AAAAA  BBBBB  CCCCC  DDDDD  EEEEE
      thresholds: [1, 17399, 17400, 29649, 66799, 66818],
      expected: [
        [`11.00`, `11.00`, `11.00`, `11.00`],
        [`7819.00`, `7819.00`, `7819.00`, `7819.00`],
        [`7830.00`, `7830.00`, `7830.00`, `7830.00`],
        [`7830.00`, `7830.00`, `7823.00`, `5727.00`],
        [`9.00`, `9.00`, `2.00`, `0.00`],
        [`2.00`, `2.00`, `0.00`, `0.00`],
      ],
    },
  ];

  for (const c of testCases) {
    for (const [tIdx, t] of c.thresholds.entries()) {
      for (const [aIdx, a] of adjustments.entries()) {
        it(`${c.name} (threshold: ${tIdx} ${t}, adjustment: ${aIdx})`, ({ task }) => {
          task.meta.testedFactPaths = [`/earnedIncomeCredit`];

          const { factGraph } = setupFactGraph({
            ...c.filer,
            ...makeW2Data(t),
            ...a,
          });

          expect(factGraph.get(Path.concretePath(`/earnedIncomeCredit`, null)).get.toString()).toBe(
            c.expected[tIdx][aIdx]
          );
        });
      }
    }
  }
});

describe(`combat pay recommendations`, () => {
  const expectedToString = (electionString: string) => {
    return `Result(${electionString}, complete)`;
  };
  const combatPayTestCases = [
    {
      name: `only primary has combat pay with a wage to recommend usePrimaryCombatPay`,
      primaryWages: `5000.00`,
      secondaryWages: `5000.00`,
      primaryCombatPay: `5000.00`,
      secondaryCombatPay: `0.00`,
      expectedCombayPayRecommmendation: expectedToString(`usePrimaryCombatPay`),
    },
    {
      name: `only primary has combat pay with a wage to recommend useNoCombatPay`,
      primaryWages: `10000.00`,
      secondaryWages: `5000.00`,
      primaryCombatPay: `5000.00`,
      secondaryCombatPay: `0.00`,
      expectedCombayPayRecommmendation: expectedToString(`noCombatPay`),
    },
    {
      name: `only secondary has combat pay with a wage to recommend useSpouseCombatPay`,
      primaryWages: `5000.00`,
      secondaryWages: `5000.00`,
      primaryCombatPay: `0.00`,
      secondaryCombatPay: `5000.00`,
      expectedCombayPayRecommmendation: expectedToString(`useSpouseCombatPay`),
    },
    {
      name: `only secondary has combat pay with a wage to recommend useNoCombatPay`,
      primaryWages: `5000.00`,
      secondaryWages: `10000.00`,
      primaryCombatPay: `0.00`,
      secondaryCombatPay: `5000.00`,
      expectedCombayPayRecommmendation: expectedToString(`noCombatPay`),
    },
    {
      name: `primary and secondary both have combat pay with a wage to recommend useBothCombatPay`,
      primaryWages: `5000.00`,
      secondaryWages: `5000.00`,
      primaryCombatPay: `3000.00`,
      secondaryCombatPay: `3000.00`,
      expectedCombayPayRecommmendation: expectedToString(`useBothCombatPay`),
    },
    {
      name: `primary and secondary both have combat pay with a wage to recommend usePrimaryCombatPay`,
      primaryWages: `10000.00`,
      secondaryWages: `5000.00`,
      primaryCombatPay: `5.00`,
      secondaryCombatPay: `15000.00`,
      expectedCombayPayRecommmendation: expectedToString(`usePrimaryNotSpouseCombatPay`),
    },
    {
      name: `primary and secondary both have combat pay with a wage to recommend useSpouseCombatPay`,
      primaryWages: `5000.00`,
      secondaryWages: `10000.00`,
      primaryCombatPay: `15000.00`,
      secondaryCombatPay: `5.00`,
      expectedCombayPayRecommmendation: expectedToString(`useSpouseNotPrimaryCombatPay`),
    },
    {
      name: `primary and secondary both have combat pay with a wage to recommend useNoCombatPay`,
      primaryWages: `5000.00`,
      secondaryWages: `5000.00`,
      primaryCombatPay: `10000.00`,
      secondaryCombatPay: `15000.00`,
      expectedCombayPayRecommmendation: expectedToString(`noCombatPay`),
    },
  ];

  for (const c of combatPayTestCases) {
    it(c.name, ({ task }) => {
      task.meta.testedFactPaths = [`/combatPayRecommendation`];
      const { factGraph } = setupFactGraph(
        makeCombatPayData(c.primaryWages, c.secondaryWages, c.primaryCombatPay, c.secondaryCombatPay)
      );
      expect(factGraph.get(Path.concretePath(`/interestIncome`, null)).complete).toBe(true);
      expect(factGraph.get(Path.concretePath(`/combatPayRecommendation`, null)).toString).toBe(
        c.expectedCombayPayRecommmendation
      );
    });
  }
});
