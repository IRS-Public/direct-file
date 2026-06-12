import { it, describe, expect } from 'vitest';
import { baseFilerData, primaryFilerId, makeChildData, makeW2Data } from '../testData.js';
import {
  createBooleanWrapper,
  createDayWrapper,
  createEnumWrapper,
  createStringWrapper,
  createCollectionWrapper,
} from '../persistenceWrappers.js';
import { Path } from '../../flow/Path.js';
import { createFlowConfig } from '../../flow/flowConfig.js';
import flowNodes from '../../flow/flow.js';
import { TAX_YEAR_2023 } from '../../constants/taxConstants.js';
import makeGivenFacts from './functionalFlowUtils.js';
import { setupFactGraph } from '../setupFactGraph.js';
import { vi } from 'vitest';

const flow = createFlowConfig(flowNodes);
const givenFacts = makeGivenFacts(flow);

describe(`The \`credits\` subcategory`, () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`2024-02-15`));
  });

  afterAll(() => {
    // restoring date after each test run
    vi.useRealTimers();
  });
  const THRESHOLDS = TAX_YEAR_2023.EITC_INCOME_THRESHOLDS;

  const childDependentId = `4fa3a5a7-a9d1-43a9-a0fb-277596e70d48`;
  const nonChildDependentId = `a39ce7e2-3d09-11ee-be56-0242ac120002`;
  const dob = {
    barelyFourteenAtStartOfYear: `2008-01-01`,
    adult: `1987-01-01`,
  };
  const childData = makeChildData(childDependentId, dob.barelyFourteenAtStartOfYear);

  const nonChildDependentData = {
    [`/familyAndHousehold/#${nonChildDependentId}/firstName`]: createStringWrapper(`Friend`),
    [`/familyAndHousehold/#${nonChildDependentId}/writableMiddleInitial`]: createStringWrapper(`E`),
    [`/familyAndHousehold/#${nonChildDependentId}/lastName`]: createStringWrapper(`Friendface`),
    [`/familyAndHousehold/#${nonChildDependentId}/relationshipCategory`]: createEnumWrapper(
      `notRelated`,
      `/relationshipCategoryOptions`
    ),
    [`/familyAndHousehold/#${nonChildDependentId}/dateOfBirth`]: createDayWrapper(dob.adult),
    [`/familyAndHousehold/#${nonChildDependentId}/residencyDuration`]: createEnumWrapper(
      `allYear`,
      `/residencyDurationOptions`
    ),
    [`/familyAndHousehold/#${nonChildDependentId}/ssnEmploymentValidity`]: createEnumWrapper(
      `neither`,
      `/familyAndHouseholdSsnEmploymentValidityOptions`
    ),
    [`/familyAndHousehold/#${nonChildDependentId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
    [`/familyAndHousehold/#${nonChildDependentId}/married`]: createBooleanWrapper(false),
    [`/familyAndHousehold/#${nonChildDependentId}/grossIncomeTest`]: createBooleanWrapper(true),
    [`/familyAndHousehold/#${nonChildDependentId}/unableToCareForSelf`]: createBooleanWrapper(false),
    [`/familyAndHousehold/#${nonChildDependentId}/monthsLivedWithTPInUS`]: createEnumWrapper(
      `seven`,
      `/monthsLivedWithTPInUSOptions`
    ),
    [`/familyAndHousehold/#${nonChildDependentId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
    [`/familyAndHousehold/#${nonChildDependentId}/writableQrSupportTest`]: createBooleanWrapper(true),
    [`/familyAndHousehold/#${nonChildDependentId}/permanentTotalDisability`]: createBooleanWrapper(false),
    [`/familyAndHousehold/#${nonChildDependentId}/tpClaims`]: createBooleanWrapper(true),
    [`/familyAndHousehold/#${nonChildDependentId}/tinType`]: createEnumWrapper(`ssn`, `/tinTypeOptions`),
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

  const filerWithNonChildDependent = {
    ...baseFilerData,
    [`/maritalStatus`]: createEnumWrapper(`single`, `/maritalStatusOptions`),
    [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
    '/familyAndHousehold': {
      $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
      item: { items: [`${nonChildDependentId}`] },
    },
    ...nonChildDependentData,
  };

  const filerWithChildAndNonChildDependent = {
    ...baseFilerData,
    [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
    '/familyAndHousehold': {
      $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
      item: { items: [nonChildDependentId, childDependentId] },
    },
    ...childData,
    ...nonChildDependentData,
  };

  const hohFilerWithBelowThresholdIncomeAnd1QC = {
    ...filerWithChild,
    ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC - 1),
    [`/filingStatus`]: createEnumWrapper(`headOfHousehold`, `/filingStatusOptions`),
  };

  const screens = {
    finalDeductionScreen: `/flow/credits-and-deductions/deductions/taxable-income-summary`,
    notQualifiedPtc: `/flow/credits-and-deductions/credits/ptc-not-qualified-no-aptc`,
    receivedCtcImproperClaims: `/flow/credits-and-deductions/credits/ctc-improper-claims`,
    ctcIntro: `/flow/credits-and-deductions/credits/ctc-intro`,
    ctcImproperClaimsWaitingPeriod: `/flow/credits-and-deductions/credits/ctc-improper-claims-waiting-period`,
    ctcNotQualified: `/flow/credits-and-deductions/credits/ctc-not-qualified`,
    ctcQualified: `/flow/credits-and-deductions/credits/ctc-qualified`,
    receivedOdcImproperClaims: `/flow/credits-and-deductions/credits/odc-improper-claims`,
    odcImproperClaimsWaitingPeriod: `/flow/credits-and-deductions/credits/odc-improper-claims-waiting-period`,
    odcNotQualified: `/flow/credits-and-deductions/credits/odc-not-qualified`,
    odcQualified: `/flow/credits-and-deductions/credits/odc-qualified`,
    introNoCredits: `/flow/credits-and-deductions/credits/intro-no-credits`,
    eitcBreather: `/flow/credits-and-deductions/credits/eitc-breather`,
    eitcTpQcOfAnother: `/flow/credits-and-deductions/credits/eitc-taxpayer-qc-of-another`,
    eitcQcFilingReq: `/flow/credits-and-deductions/credits/eitc-qc-of-another-claimer-filing-requirement`,
    eitcQcClaimerFiling: `/flow/credits-and-deductions/credits/eitc-qc-of-another-claimer-filing`,
    eitcQcClaimersReturn: `/flow/credits-and-deductions/credits/eitc-qc-of-another-claimers-return`,
    eitcQcOfAnotherSummary: `/flow/credits-and-deductions/credits/eitc-qc-of-another-summary`,
    eitcDisqualified: `/flow/credits-and-deductions/credits/eitc-not-qualified`,
    eitcImproperClaims: `/flow/credits-and-deductions/credits/eitc-improper-claims`,
    creditSummaryNotQualified: `/flow/credits-and-deductions/credits/credit-summary-not-qualified`,
    checklist: `/checklist`,
    dataView: `/data-view/flow/credits-and-deductions/deductions`,
  };

  describe(`ctc and odc`, () => {
    it(`shows ctc intro screen to a filer with a ctc qualifying child`, ({ task }) => {
      const { factGraph } = setupFactGraph(filerWithChild);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childDependentId)).get).toBe(
        true
      );
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleCtc`, childDependentId)).get).toBe(true);
      expect(givenFacts(factGraph).atPath(screens.notQualifiedPtc, null, task)).toRouteNextTo(screens.ctcIntro);
    });

    it(`ctc elapsed improper claims leads to ctc qualified screen`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...filerWithChild,
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC - 1),
        [`/receivedImproperClaims`]: createBooleanWrapper(true),
        [`/hasFiledCtcOdcSinceNoticeExpired`]: createBooleanWrapper(false),
        [`/receivedImproperClaimsNotice`]: createEnumWrapper(`twoYears`, `/improperClaimsNoticeOptions`),
        [`/improperClaimsNoticeExpired`]: createBooleanWrapper(true),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleCtc`, childDependentId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/ctcOdcDisqualifiedForImproperClaims`, null)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/hasOdcOrMaybeEligibleForEitc`, null)).get).toBe(true);
      expect(givenFacts(factGraph).atPath(screens.ctcImproperClaimsWaitingPeriod, null, task)).toRouteNextTo(
        screens.ctcQualified
      );
    });

    it(`ctc improper claims leads to not qualified screen if potentially eligible for another credit`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...filerWithChild,
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC - 1),
        [`/receivedImproperClaims`]: createBooleanWrapper(true),
        [`/hasFiledCtcOdcSinceNoticeExpired`]: createBooleanWrapper(false),
        [`/receivedImproperClaimsNotice`]: createEnumWrapper(`twoYears`, `/improperClaimsNoticeOptions`),
        [`/improperClaimsNoticeExpired`]: createBooleanWrapper(false),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleCtc`, childDependentId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/ctcOdcDisqualifiedForImproperClaims`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/hasOdcOrMaybeEligibleForEitc`, null)).get).toBe(true);
      expect(givenFacts(factGraph).atPath(screens.ctcImproperClaimsWaitingPeriod, null, task)).toRouteNextTo(
        screens.ctcNotQualified
      );
    });

    it(`ctc improper claims leads to checklist if not eligible for another credit`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...filerWithChild,
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_3QC + 1),
        [`/receivedImproperClaims`]: createBooleanWrapper(true),
        [`/hasFiledCtcOdcSinceNoticeExpired`]: createBooleanWrapper(false),
        [`/receivedImproperClaimsNotice`]: createEnumWrapper(`twoYears`, `/improperClaimsNoticeOptions`),
        [`/improperClaimsNoticeExpired`]: createBooleanWrapper(false),
        [`/writableCdccHasQualifyingExpenses`]: createBooleanWrapper(false),
        [`/writableHasPtcQualifyingPlan`]: createBooleanWrapper(false),
        [`/form1099Rs`]: createCollectionWrapper([]),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleCtc`, childDependentId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/ctcOdcDisqualifiedForImproperClaims`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/hasOdcOrMaybeEligibleForEitc`, null)).get).toBe(false);
      expect(givenFacts(factGraph).atPath(screens.ctcImproperClaimsWaitingPeriod, null, task)).toRouteNextTo(
        screens.creditSummaryNotQualified
      );
    });

    it(`shows odc improper claims question to a filer with an odc qualifying relative and no child`, ({ task }) => {
      const { factGraph } = setupFactGraph(filerWithNonChildDependent);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, nonChildDependentId)).get).toBe(
        true
      );
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleOdc`, nonChildDependentId)).get).toBe(true);
      expect(givenFacts(factGraph).atPath(screens.notQualifiedPtc, null, task)).toRouteNextTo(
        screens.receivedOdcImproperClaims
      );
    });

    it(`odc elapsed improper claims leads to odc qualified screen`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...filerWithNonChildDependent,
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_0QC - 1),
        [`/filers/#${primaryFilerId}/dateOfBirth`]: createDayWrapper(`1980-01-01`),
        [`/receivedImproperClaims`]: createBooleanWrapper(true),
        [`/hasFiledCtcOdcSinceNoticeExpired`]: createBooleanWrapper(false),
        [`/receivedImproperClaimsNotice`]: createEnumWrapper(`twoYears`, `/improperClaimsNoticeOptions`),
        [`/improperClaimsNoticeExpired`]: createBooleanWrapper(true),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleOdc`, nonChildDependentId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/ctcOdcDisqualifiedForImproperClaims`, null)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/filersAgeTestForEitcWithNoQC`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithoutQc`, null)).get).toBe(true);

      expect(givenFacts(factGraph).atPath(screens.odcImproperClaimsWaitingPeriod, null, task)).toRouteNextTo(
        screens.odcQualified
      );
    });

    it(`odc improper claims leads to not qualified screen if potentially eligible for another credit`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...filerWithNonChildDependent,
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_0QC - 1),
        [`/filers/#${primaryFilerId}/dateOfBirth`]: createDayWrapper(`1980-01-01`),
        [`/receivedImproperClaims`]: createBooleanWrapper(true),
        [`/hasFiledCtcOdcSinceNoticeExpired`]: createBooleanWrapper(false),
        [`/receivedImproperClaimsNotice`]: createEnumWrapper(`twoYears`, `/improperClaimsNoticeOptions`),
        [`/improperClaimsNoticeExpired`]: createBooleanWrapper(false),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleOdc`, nonChildDependentId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/ctcOdcDisqualifiedForImproperClaims`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/filersAgeTestForEitcWithNoQC`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithoutQc`, null)).get).toBe(true);

      expect(givenFacts(factGraph).atPath(screens.odcImproperClaimsWaitingPeriod, null, task)).toRouteNextTo(
        screens.odcNotQualified
      );
    });

    it(`odc improper claims leads to not qualified summary if not eligible for another credit`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...filerWithNonChildDependent,
        ...makeW2Data(50000),
        [`/filers/#${primaryFilerId}/dateOfBirth`]: createDayWrapper(`1945-01-01`),
        [`/filers/#${primaryFilerId}/isStudent`]: createBooleanWrapper(true),
        [`/receivedImproperClaims`]: createBooleanWrapper(true),
        [`/hasFiledCtcOdcSinceNoticeExpired`]: createBooleanWrapper(false),
        [`/receivedImproperClaimsNotice`]: createEnumWrapper(`twoYears`, `/improperClaimsNoticeOptions`),
        [`/improperClaimsNoticeExpired`]: createBooleanWrapper(false),
        [`/writableCdccHasQualifyingExpenses`]: createBooleanWrapper(false),
        [`/writableHasPtcQualifyingPlan`]: createBooleanWrapper(false),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleOdc`, nonChildDependentId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/ctcOdcDisqualifiedForImproperClaims`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForEitcWithoutQc`, null)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/ctcQualified`, null)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/odcQualified`, null)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/eitcQualified`, null)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/qualifiedForCreditForElderlyAndDisabled`, null)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/qualifiedForSaverCredit`, null)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/hasQualifiedForAtLeastOneCredit`, null)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/maybeEligibleForCreditForElderlyAndDisabled`, null)).get).toBe(false);
      expect(givenFacts(factGraph).atPath(screens.odcImproperClaimsWaitingPeriod, null, task)).toRouteNextTo(
        screens.creditSummaryNotQualified
      );
    });

    it(`skips odc improper claims questions if the TP already answered them about the ctc`, ({ task }) => {
      const { factGraph } = setupFactGraph(filerWithChildAndNonChildDependent);
      expect(givenFacts(factGraph).atPath(screens.notQualifiedPtc, null, task)).toRouteNextTo(screens.ctcIntro);

      expect(givenFacts(factGraph).atPath(screens.ctcIntro, null, task)).toRouteNextTo(
        screens.receivedCtcImproperClaims
      );
      // Set false to not have to answer a bunch of questions, but still qualify.
      factGraph.set(Path.concretePath(`/receivedImproperClaims`, null), false);
      factGraph.save();
      expect(givenFacts(factGraph).atPath(screens.receivedCtcImproperClaims, null, task)).toRouteNextTo(
        screens.ctcQualified
      );
      // The TP should now also be eligible for ODC immediately
      expect(givenFacts(factGraph).atPath(screens.ctcQualified, null, task)).toRouteNextTo(screens.odcQualified);
    });

    it(`has no credits available for a filer without a child or qualifying relative`, ({ task }) => {
      const { factGraph } = setupFactGraph(baseFilerData);
      expect(givenFacts(factGraph).atPath(screens.finalDeductionScreen, null, task)).toRouteNextTo(screens.dataView);
    });
  });

  describe(`EITC QC of another`, () => {
    it(`Displays EITC breather screen for a maybe qualifying EITC person`, ({ task }) => {
      const { factGraph } = setupFactGraph(hohFilerWithBelowThresholdIncomeAnd1QC);
      expect(givenFacts(factGraph).atPath(screens.ctcQualified, null, task)).toRouteNextTo(screens.eitcBreather);
    });

    it(`Displays EITC QC screen after breather`, ({ task }) => {
      const { factGraph } = setupFactGraph(hohFilerWithBelowThresholdIncomeAnd1QC);
      expect(givenFacts(factGraph).atPath(screens.eitcBreather, null, task)).toRouteNextTo(screens.eitcTpQcOfAnother);
    });

    it(`Next checks improper claims if the TP is not a QC of another`, ({ task }) => {
      const { factGraph } = setupFactGraph(hohFilerWithBelowThresholdIncomeAnd1QC);
      factGraph.set(Path.concretePath(`/eitcQcOfAnother`, null), false);
      factGraph.save();
      expect(givenFacts(factGraph).atPath(screens.eitcTpQcOfAnother, null, task)).toRouteNextTo(
        screens.eitcImproperClaims
      );
    });

    it(`Checks the TP Claimer's filing requirement if TP is QC of another`, ({ task }) => {
      const { factGraph } = setupFactGraph(hohFilerWithBelowThresholdIncomeAnd1QC);
      factGraph.set(Path.concretePath(`/eitcQcOfAnother`, null), true);
      factGraph.save();
      expect(givenFacts(factGraph).atPath(screens.eitcTpQcOfAnother, null, task)).toRouteNextTo(
        screens.eitcQcFilingReq
      );

      factGraph.set(Path.concretePath(`/eitcQcOfAnotherRequiredToFile`, null), true);
      factGraph.save();
      expect(factGraph.get(Path.concretePath(`/eitcQcTest`, null)).get).toBe(false);
      expect(givenFacts(factGraph).atPath(screens.eitcQcFilingReq, null, task)).toRouteNextTo(screens.eitcDisqualified);

      factGraph.set(Path.concretePath(`/eitcQcOfAnotherRequiredToFile`, null), false);
      factGraph.save();
      expect(givenFacts(factGraph).atPath(screens.eitcQcFilingReq, null, task)).toRouteNextTo(
        screens.eitcQcClaimerFiling
      );
    });

    it(`Checks if the TP's claimer is filing if not required`, ({ task }) => {
      const { factGraph } = setupFactGraph(hohFilerWithBelowThresholdIncomeAnd1QC);
      factGraph.set(Path.concretePath(`/eitcQcOfAnother`, null), true);
      factGraph.set(Path.concretePath(`/eitcQcOfAnotherRequiredToFile`, null), false);
      factGraph.save();

      factGraph.set(Path.concretePath(`/eitcQcOfAnotherIsFiling`, null), true);
      factGraph.save();
      expect(givenFacts(factGraph).atPath(screens.eitcQcClaimerFiling, null, task)).toRouteNextTo(
        screens.eitcQcClaimersReturn
      );

      factGraph.set(Path.concretePath(`/eitcQcOfAnotherIsFiling`, null), false);
      factGraph.save();
      expect(givenFacts(factGraph).atPath(screens.eitcQcClaimerFiling, null, task)).toRouteNextTo(
        screens.eitcQcOfAnotherSummary
      );
    });

    it(`Checks if the TP's claimer is filing for refund only if they are filing`, ({ task }) => {
      const { factGraph } = setupFactGraph(hohFilerWithBelowThresholdIncomeAnd1QC);
      factGraph.set(Path.concretePath(`/eitcQcOfAnother`, null), true);
      factGraph.set(Path.concretePath(`/eitcQcOfAnotherRequiredToFile`, null), false);
      factGraph.set(Path.concretePath(`/eitcQcOfAnotherIsFiling`, null), true);
      factGraph.save();

      factGraph.set(Path.concretePath(`/eitcQcOfAnotherIsFilingRefundOnly`, null), true);
      factGraph.save();
      expect(givenFacts(factGraph).atPath(screens.eitcQcClaimersReturn, null, task)).toRouteNextTo(
        screens.eitcQcOfAnotherSummary
      );

      factGraph.set(Path.concretePath(`/eitcQcOfAnotherIsFilingRefundOnly`, null), false);
      factGraph.save();
      expect(factGraph.get(Path.concretePath(`/eitcQcTest`, null)).get).toBe(false);
      expect(givenFacts(factGraph).atPath(screens.eitcQcClaimersReturn, null, task)).toRouteNextTo(
        screens.eitcDisqualified
      );
    });
  });
});
