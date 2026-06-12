import { CURRENT_TAX_YEAR, TAX_YEAR_2023 } from '../../constants/taxConstants.js';
import { Path } from '../../flow/Path.js';
import {
  createStringWrapper,
  createEnumWrapper,
  createBooleanWrapper,
  createCollectionWrapper,
  createDayWrapper,
  createTinWrapper,
} from '../persistenceWrappers.js';
import { ConcretePath, ScalaList, convertCollectionToArray } from '@irs/js-factgraph-scala';
import { describe, it, expect } from 'vitest';
import { baseFilerData, makeW2Data } from '../testData.js';
import { setupFactGraphDeprecated } from '../setupFactGraph.js';
const childId = `4fa3a5a7-a9d1-43a9-a0fb-277596e70d48`;
const additionalChildId1 = `4fa3a5a7-a9d1-43a9-a0fb-277596e70d49`;
const additionalChildId2 = `4fa3a5a7-a9d1-43a9-a0fb-277596e70d50`;
const uuid = `959c03d1-af4a-447f-96aa-d19397048a44`;
const spouseId = `859c03d1-af4a-447f-96aa-d19397048a48`;
const primaryFilerId = uuid;
const THRESHOLDS = TAX_YEAR_2023.EITC_INCOME_THRESHOLDS;

const childBaseData = {
  ...baseFilerData,
  [`/filers/#${primaryFilerId}/isPrimaryFiler`]: createBooleanWrapper(true),
  [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
  [`/primaryFilerSsnEmploymentValidity`]: createEnumWrapper(
    `validOnlyWithDhsAuthorization`,
    `/primaryFilerSsnEmploymentValidityOptions`
  ),
  '/maritalStatus': createEnumWrapper(`single`, `/maritalStatusOptions`),
  '/filingStatus': createEnumWrapper(`single`, `/filingStatusOptions`),
  [`/filers/#${primaryFilerId}/dateOfBirth`]: createDayWrapper(`0001-01-01`),
  '/familyAndHousehold': createCollectionWrapper([childId]),

  [`/familyAndHousehold/#${childId}/firstName`]: createStringWrapper(`Child`),
  [`/familyAndHousehold/#${childId}/writableMiddleInitial`]: createStringWrapper(`E`),
  [`/familyAndHousehold/#${childId}/lastName`]: createStringWrapper(`ChildFace`),
  [`/familyAndHousehold/#${childId}/deceased`]: createBooleanWrapper(false),
  [`/familyAndHousehold/#${childId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
};

const biologicalChildBaseData = {
  ...childBaseData,
  [`/familyAndHousehold/#${childId}/relationshipCategory`]: createEnumWrapper(
    `childOrDescendants`,
    `/relationshipCategoryOptions`
  ),
  [`/familyAndHousehold/#${childId}/childRelationship`]: createEnumWrapper(
    `biologicalChild`,
    `/childRelationshipOptions`
  ),
  [`/hasForeignAccounts`]: createBooleanWrapper(false),
  [`/isForeignTrustsGrantor`]: createBooleanWrapper(false),
  [`/hasForeignTrustsTransactions`]: createBooleanWrapper(false),
};

// TODO: This generator could be more robust and needs some refinement
const createChild = (
  newChildId: string,
  firstName: string,
  middleInitial: string,
  lastName: string,
  eligibile = true
) => {
  const eligibleChildData = {
    [`/familyAndHousehold/#${newChildId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
    [`/familyAndHousehold/#${newChildId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
    [`/familyAndHousehold/#${newChildId}/residencyDuration`]: createEnumWrapper(`allYear`, `/residencyDurationOptions`),
    [`/familyAndHousehold/#${newChildId}/tpClaims`]: createBooleanWrapper(true),
    [`/familyAndHousehold/#${newChildId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
  };

  const ineligibleChildData = {
    [`/familyAndHousehold/#${newChildId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(true),
    [`/familyAndHousehold/#${newChildId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
    [`/familyAndHousehold/#${newChildId}/relationshipCategory`]: createEnumWrapper(
      `childOrDescendants`,
      `/relationshipCategoryOptions`
    ),
    [`/familyAndHousehold/#${newChildId}/residencyDuration`]: createEnumWrapper(
      `lessThanSixMonths`,
      `/residencyDurationOptions`
    ),
    [`/familyAndHousehold/#${newChildId}/tpClaims`]: createBooleanWrapper(true),
    [`/familyAndHousehold/#${newChildId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(false),
  };

  const eligibilityData = eligibile ? eligibleChildData : ineligibleChildData;

  return {
    [`/familyAndHousehold/#${newChildId}/childRelationship`]: createEnumWrapper(
      `biologicalChild`,
      `/childRelationshipOptions`
    ),
    [`/familyAndHousehold/#${newChildId}/dateOfBirth`]: createDayWrapper(
      `${Number.parseInt(CURRENT_TAX_YEAR) - 12}-01-02`
    ),
    [`/familyAndHousehold/#${newChildId}/deceased`]: createBooleanWrapper(false),
    [`/familyAndHousehold/#${newChildId}/firstName`]: createStringWrapper(firstName),
    [`/familyAndHousehold/#${newChildId}/lastName`]: createStringWrapper(lastName),
    [`/familyAndHousehold/#${newChildId}/married`]: createBooleanWrapper(false),
    [`/familyAndHousehold/#${newChildId}/middleInitial`]: createStringWrapper(middleInitial),
    [`/familyAndHousehold/#${newChildId}/ownSupport`]: createBooleanWrapper(false),
    [`/familyAndHousehold/#${newChildId}/relationshipCategory`]: createEnumWrapper(
      `childOrDescendants`,
      `/relationshipCategoryOptions`
    ),
    [`/familyAndHousehold/#${newChildId}/ssnEmploymentValidity`]: createEnumWrapper(
      `neither`,
      `/familyAndHouseholdSsnEmploymentValidityOptions`
    ),
    [`/familyAndHousehold/#${newChildId}/tinType`]: createEnumWrapper(`ssn`, `/tinTypeOptions`),
    [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
    [`/filers/#${primaryFilerId}/dateOfBirth`]: createDayWrapper(`0001-01-01`),
    [`/filers/#${primaryFilerId}/isPrimaryFiler`]: createBooleanWrapper(true),
    [`/filers`]: createCollectionWrapper([primaryFilerId, spouseId]),
    [`/filingStatus`]: createEnumWrapper(`single`, `/filingStatusOptions`),
    [`/maritalStatus`]: createEnumWrapper(`single`, `/maritalStatusOptions`),
    ...eligibilityData,
  };
};

const adoptedChildBaseData = {
  ...childBaseData,
  [`/familyAndHousehold/#${childId}/relationshipCategory`]: createEnumWrapper(
    `childOrDescendants`,
    `/relationshipCategoryOptions`
  ),
  [`/familyAndHousehold/#${childId}/childRelationship`]: createEnumWrapper(`adoptedChild`, `/childRelationshipOptions`),
};

const unrelatedChildBaseData = {
  // e.g. a cousin
  ...childBaseData,
  [`/familyAndHousehold/#${childId}/relationshipCategory`]: createEnumWrapper(
    `notRelated`,
    `/relationshipCategoryOptions`
  ),
};

const nonChildButQcBaseData = {
  ...childBaseData,
  [`/familyAndHousehold/#${childId}/relationshipCategory`]: createEnumWrapper(
    `siblingOrDescendants`,
    `/relationshipCategoryOptions`
  ),
  [`/familyAndHousehold/#${childId}/siblingRelationship`]: createEnumWrapper(
    `childOfSibling`,
    `/siblingRelationshipOptions`
  ),
};

const failingAgeTestData = {
  [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(`${Number.parseInt(CURRENT_TAX_YEAR) - 25}-01-02`),
  [`/familyAndHousehold/#${childId}/fullTimeStudent`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/permanentTotalDisability`]: createBooleanWrapper(false),
};

const qcData = {
  [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(`${Number.parseInt(CURRENT_TAX_YEAR) - 12}-01-02`),
  [`/familyAndHousehold/#${childId}/ownSupport`]: createBooleanWrapper(false),
  [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(false),
  [`/familyAndHousehold/#${childId}/residencyDuration`]: createEnumWrapper(`allYear`, `/residencyDurationOptions`),
  [`/familyAndHousehold/#${childId}/tinType`]: createEnumWrapper(`ssn`, `/tinTypeOptions`),
};

const qrData = {
  [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(`${Number.parseInt(CURRENT_TAX_YEAR) - 12}-01-02`),
  [`/familyAndHousehold/#${childId}/residencyDuration`]: createEnumWrapper(`allYear`, `/residencyDurationOptions`),
  [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(false),
  [`/familyAndHousehold/#${childId}/writableQrSupportTest`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/grossIncomeTest`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/tinType`]: createEnumWrapper(`ssn`, `/tinTypeOptions`),
};

const ctcData = {
  [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
  [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/tinType`]: createEnumWrapper(`ssn`, `/tinTypeOptions`),
  [`/familyAndHousehold/#${childId}/ssnEmploymentValidity`]: createEnumWrapper(
    `neither`,
    `/familyAndHouseholdSsnEmploymentValidityOptions`
  ),
};

const odcData = {
  ...failingAgeTestData,
  [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(false),
};

const hohQpData = {
  [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(`${Number.parseInt(CURRENT_TAX_YEAR) - 12}-01-02`),
  [`/familyAndHousehold/#${childId}/ownSupport`]: createBooleanWrapper(false),
  [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(false),
  [`/familyAndHousehold/#${childId}/residencyDuration`]: createEnumWrapper(`allYear`, `/residencyDurationOptions`),
  [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
  [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/tinType`]: createEnumWrapper(`ssn`, `/tinTypeOptions`),
};

const eitcQpData = {
  [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(`${Number.parseInt(CURRENT_TAX_YEAR) - 12}-01-02`),
  [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(false),
  [`/familyAndHousehold/#${childId}/ownSupport`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/residencyDuration`]: createEnumWrapper(`allYear`, `/residencyDurationOptions`),
  [`/familyAndHousehold/#${childId}/monthsLivedWithTPInUS`]: createEnumWrapper(
    `seven`,
    `/monthsLivedWithTPInUSOptions`
  ),
  [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
  [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(false),
  [`/familyAndHousehold/#${childId}/tinType`]: createEnumWrapper(`ssn`, `/tinTypeOptions`),
  [`/familyAndHousehold/#${childId}/ssnEmploymentValidity`]: createEnumWrapper(
    `neither`,
    `/familyAndHouseholdSsnEmploymentValidityOptions`
  ),
};

const applyingSpecialBenefitsSplitParentalBaseData = {
  [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/whichParentNotClaiming`]: createEnumWrapper(`iDid`, `/writtenDeclarationOptions`),
  [`/familyAndHousehold/#${childId}/inParentsCustody`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/livedWithTpOrOtherBiologicalOrAdoptiveParentMoreThanSixMonths`]:
    createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/parentalSituation`]: createEnumWrapper(
    `livedApartLastSixMonths`,
    `/parentalSituationOptions`
  ),
  [`/familyAndHousehold/#${childId}/parentalSupport`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/nightsWithTpVsOtherParent`]: createEnumWrapper(`more`, `/moreLessEqualOptions`),
};

const applyingSpecialBenefitsSplitNonParentalBaseData = {
  [`/familyAndHousehold/#${childId}/biologicalOrAdoptiveParentsLiving`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/inParentsCustody`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/nonParentalSomeParentNotClaiming`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/parentsMeetReqsRuleForChildrenOfDivorcedParents`]: createBooleanWrapper(true),
  [`/familyAndHousehold/#${childId}/specialRuleChildUsedByCustodialParentAsQP`]: createBooleanWrapper(false),
  [`/familyAndHousehold/#${childId}/specialRuleAgiTest`]: createBooleanWrapper(true),
};

describe(`One or more dependents IP Pin`, () => {
  it(`A single dependent has an IP Pin`, ({ task }) => {
    task.meta.testedFactPaths = [`/oneOrMoreDependentsAreMissingIpPin`];
    const { factGraph } = setupFactGraphDeprecated({
      '/familyAndHousehold': createCollectionWrapper([childId]),
      [`/familyAndHousehold/#${childId}/hasIpPin`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/flowIpPinReady`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isMissingIpPin`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/oneOrMoreDependentsAreMissingIpPin`, childId)).get).toBe(false);
  });

  it(`A single dependent does not have an IP Pin`, ({ task }) => {
    task.meta.testedFactPaths = [`/oneOrMoreDependentsAreMissingIpPin`];
    const { factGraph } = setupFactGraphDeprecated({
      '/familyAndHousehold': createCollectionWrapper([childId]),
      [`/familyAndHousehold/#${childId}/hasIpPin`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/flowIpPinReady`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isMissingIpPin`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/oneOrMoreDependentsAreMissingIpPin`, childId)).get).toBe(true);
  });

  it(`One dependent does not have an IP Pin`, ({ task }) => {
    task.meta.testedFactPaths = [`/oneOrMoreDependentsAreMissingIpPin`];
    const { factGraph } = setupFactGraphDeprecated({
      '/familyAndHousehold': createCollectionWrapper([childId, additionalChildId1]),
      [`/familyAndHousehold/#${childId}/hasIpPin`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/flowIpPinReady`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${additionalChildId1}/hasIpPin`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${additionalChildId1}/flowIpPinReady`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isMissingIpPin`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isMissingIpPin`, additionalChildId1)).get).toBe(
      false
    );
    expect(factGraph.get(Path.concretePath(`/oneOrMoreDependentsAreMissingIpPin`, childId)).get).toBe(true);
  });

  it(`Both dependents have an IP Pin`, ({ task }) => {
    task.meta.testedFactPaths = [`/oneOrMoreDependentsAreMissingIpPin`];
    const { factGraph } = setupFactGraphDeprecated({
      '/familyAndHousehold': createCollectionWrapper([childId, additionalChildId1]),
      [`/familyAndHousehold/#${childId}/hasIpPin`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/flowIpPinReady`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${additionalChildId1}/hasIpPin`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${additionalChildId1}/flowIpPinReady`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isMissingIpPin`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isMissingIpPin`, additionalChildId1)).get).toBe(
      false
    );
    expect(factGraph.get(Path.concretePath(`/oneOrMoreDependentsAreMissingIpPin`, childId)).get).toBe(false);
  });
});

describe(`Dependent age`, () => {
  it(`A dependent's age is correctly calculated'`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/age`];
    const { factGraph } = setupFactGraphDeprecated({
      ...childBaseData,
      [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(
        `${Number.parseInt(CURRENT_TAX_YEAR) - 11}-01-02`
      ),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/dateOfBirth/year`, childId)).get).toBe(
      Number.parseInt(CURRENT_TAX_YEAR) - 11
    );
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/age`, childId)).get).toBe(11);
  });
});

describe(`Qualifying dependent TIN verification`, () => {
  it(`A dependent has an SSN`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hasTin`];
    const { factGraph } = setupFactGraphDeprecated({
      '/familyAndHousehold': createCollectionWrapper([childId]),
      [`/familyAndHousehold/#${childId}/tin`]: createTinWrapper({ area: `555`, group: `55`, serial: `5555` }),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hasTin`, childId)).get).toBe(true);
  });

  it(`A dependent has an ITIN`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hasTin`];
    const { factGraph } = setupFactGraphDeprecated({
      '/familyAndHousehold': createCollectionWrapper([childId]),
      [`/familyAndHousehold/#${childId}/tinType`]: createEnumWrapper(`itin`, `/tinTypeOptions`),
      [`/familyAndHousehold/#${childId}/tin`]: createTinWrapper({ area: `555`, group: `55`, serial: `5555` }),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hasTin`, childId)).get).toBe(true);
  });

  it(`A dependent has an ATIN`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hasTin`];
    const { factGraph } = setupFactGraphDeprecated({
      '/familyAndHousehold': createCollectionWrapper([childId]),
      [`/familyAndHousehold/#${childId}/tinType`]: createEnumWrapper(`atin`, `/tinTypeOptions`),
      [`/familyAndHousehold/#${childId}/tin`]: createTinWrapper({ area: `555`, group: `55`, serial: `5555` }),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hasTin`, childId)).get).toBe(true);
  });

  it(`A dependent does not have a TIN`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hasTin`];
    const { factGraph } = setupFactGraphDeprecated({
      '/familyAndHousehold': createCollectionWrapper([childId]),
      [`/familyAndHousehold/#${childId}/tinType`]: createEnumWrapper(`none`, `/tinTypeOptions`),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hasTin`, childId)).get).toBe(false);
  });
});

describe(`Qualifing dependent TIN is unique`, () => {
  it(`A dependent's TIN is unique`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/isTinUnique`];
    const { factGraph } = setupFactGraphDeprecated({
      '/filers': createCollectionWrapper([primaryFilerId, spouseId]),
      '/familyAndHousehold': createCollectionWrapper([childId]),
      [`/familyAndHousehold/#${childId}/tin`]: createTinWrapper({ area: `555`, group: `55`, serial: `5555` }),
      [`/filers/#${primaryFilerId}/tin`]: createTinWrapper({ area: `999`, group: `99`, serial: `9999` }),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isTinUnique`, childId)).get).toBe(true);
  });
  it(`A dependent's TIN is not unique`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/isTinUnique`];
    const { factGraph } = setupFactGraphDeprecated({
      '/filers': createCollectionWrapper([primaryFilerId, spouseId]),
      '/familyAndHousehold': createCollectionWrapper([childId]),
      [`/familyAndHousehold/#${childId}/tin`]: createTinWrapper({ area: `555`, group: `55`, serial: `5555` }),
      [`/filers/#${primaryFilerId}/tin`]: createTinWrapper({ area: `555`, group: `55`, serial: `5555` }),
    });

    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isTinUnique`, childId)).get).toBe(false);
  });
});

describe(`Dependent validation`, () => {
  it(`The dependent has a full name`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/fullName`];
    const { factGraph } = setupFactGraphDeprecated({
      ...childBaseData,
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/fullName`, childId)).get).toBe(`Child E ChildFace`);
  });
  describe(`Incomplete dependent vaiidation`, () => {
    it(`Does not have incomplete dependents`, ({ task }) => {
      task.meta.testedFactPaths = [`/hasIncompleteDependents`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        ...qrData,
        ...ctcData,
        [`/familyAndHousehold`]: createCollectionWrapper([childId]),
        [`/eligibleForMFJ`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/monthsLivedWithTPInUS`]: createEnumWrapper(
          `seven`,
          `/monthsLivedWithTPInUSOptions`
        ),
        [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
        [`/filers/#${primaryFilerId}/tin`]: createTinWrapper({ area: `555`, group: `55`, serial: `5555` }),
        [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(false),
      });

      expect(factGraph.get(Path.concretePath(`/hasIncompleteDependents`, childId)).get).toBe(false);
    });

    it(`Has incomplete dependents`, ({ task }) => {
      task.meta.testedFactPaths = [`/hasIncompleteDependents`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        ...qrData,
        ...ctcData,
      });

      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isCompleted`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isIncomplete`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/hasIncompleteDependents`, childId)).get).toBe(true);
    });
  });
});

describe(`Qualifying dependent collection`, () => {
  it(`Has no qualifying dependents`, ({ task }) => {
    task.meta.testedFactPaths = [`/qualifyingDependentsCollection`];
    const { factGraph } = setupFactGraphDeprecated({
      ...childBaseData,
      [`/familyAndHousehold/#${childId}/grossIncomeTest`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/residencyDuration`]: createEnumWrapper(
        `lessThanSixMonths`,
        `/residencyDurationOptions`
      ),
    });

    const qualifyingDependentsCollection = convertCollectionToArray(
      factGraph.get(`/qualifyingDependentsCollection` as ConcretePath).get as ScalaList<string>
    );

    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(false);
    expect(qualifyingDependentsCollection.length).toBe(0);
  });

  it(`Has only one dependent and they qualify`, ({ task }) => {
    task.meta.testedFactPaths = [`/qualifyingDependentsCollection`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...ctcData,
    });

    const qualifyingDependentsCollection = convertCollectionToArray(
      factGraph.get(`/qualifyingDependentsCollection` as ConcretePath).get as ScalaList<string>
    );

    expect(qualifyingDependentsCollection.length).toBe(1);
  });

  it(`Has multiple dependents and one qualifies`, ({ task }) => {
    task.meta.testedFactPaths = [`/qualifyingDependentsCollection`];
    const { factGraph } = setupFactGraphDeprecated({
      ...createChild(additionalChildId1, `NewChild`, `G`, `Childface`, true),
      ...createChild(additionalChildId2, `ThirdChild`, `F`, `Childface`, false),
      '/familyAndHousehold': createCollectionWrapper([additionalChildId1, additionalChildId2]),
    });

    const qualifyingDependentsCollection = convertCollectionToArray(
      factGraph.get(`/qualifyingDependentsCollection` as ConcretePath).get as ScalaList<string>
    );

    expect(qualifyingDependentsCollection.length).toBe(1);
  });

  it(`Has multiple qualifying dependents`, ({ task }) => {
    task.meta.testedFactPaths = [`/qualifyingDependentsCollection`];
    const { factGraph } = setupFactGraphDeprecated({
      ...createChild(additionalChildId1, `NewChild`, `G`, `Childface`, true),
      ...createChild(additionalChildId2, `ThirdChild`, `F`, `Childface`, true),
      '/familyAndHousehold': createCollectionWrapper([additionalChildId1, additionalChildId2]),
    });

    const qualifyingDependentsCollection = convertCollectionToArray(
      factGraph.get(`/qualifyingDependentsCollection` as ConcretePath).get as ScalaList<string>
    );

    expect(qualifyingDependentsCollection.length).toBe(2);
  });
});

describe(`Qualifying child of another`, () => {
  describe(`Qualifying as QC of another`, () => {
    it(`Will not ask about QC of another if applying the special benefits split`, ({ task }) => {
      task.meta.testedFactPaths = [
        `/familyAndHousehold/*/isQualifyingChildOfAnother`,
        `/familyAndHousehold/*/couldntBeQCOfAnother`,
      ];
      const { factGraph } = setupFactGraphDeprecated({
        ...nonChildButQcBaseData,
        ...qcData,
        ...applyingSpecialBenefitsSplitNonParentalBaseData,
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/couldntBeQCOfAnother`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isQualifyingChildOfAnother`, childId)).get).toBe(
        false
      );
    });
    it(`Will not ask about QC of another if the person fails the age test to be a QC`, ({ task }) => {
      task.meta.testedFactPaths = [
        `/familyAndHousehold/*/isQualifyingChildOfAnother`,
        `/familyAndHousehold/*/couldntBeQCOfAnother`,
      ];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...failingAgeTestData,
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/couldntBeQCOfAnother`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isQualifyingChildOfAnother`, childId)).get).toBe(
        false
      );
    });
    it(`Will ask about QC of another if the person is this taxpayer's biological or adopted child`, ({ task }) => {
      task.meta.testedFactPaths = [
        `/familyAndHousehold/*/isQualifyingChildOfAnother`,
        `/familyAndHousehold/*/couldntBeQCOfAnother`,
      ];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(false),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/couldntBeQCOfAnother`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isQualifyingChildOfAnother`, childId)).get).toBe(
        false
      );
    });
    it.todo(
      `Will not ask about QC of another if the person is already ineligible to be
        eitc qualifying, hoh qualifying, or an eligible dependent`,
      () => {
        expect(1).toBe(0); // https://git.irslabs.org/irslabs-prototypes/direct-file/-/issues/4250
      }
    );
    it(`Will not qualify someone as QC of another if that person is not required to file and is
        filing just for refund`, ({ task }) => {
      task.meta.testedFactPaths = [
        `/familyAndHousehold/*/isQualifyingChildOfAnother`,
        `/familyAndHousehold/*/qcOfAnotherButNot`,
      ];

      const { factGraph } = setupFactGraphDeprecated({
        ...nonChildButQcBaseData,
        ...qrData,
        [`/familyAndHousehold/#${childId}/biologicalOrAdoptiveParentsLiving`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerMustFile`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerDidFile`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerFiledOnlyForRefund`]: createBooleanWrapper(true),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/couldntBeQCOfAnother`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qcOfAnotherButNot`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isQualifyingChildOfAnother`, childId)).get).toBe(
        false
      );
    });
    it(`Will not qualify someone as QC of another if that person is not required to file and is
    not filing`, ({ task }) => {
      task.meta.testedFactPaths = [
        `/familyAndHousehold/*/isQualifyingChildOfAnother`,
        `/familyAndHousehold/*/qcOfAnotherButNot`,
      ];

      const { factGraph } = setupFactGraphDeprecated({
        ...nonChildButQcBaseData,
        ...qrData,
        [`/familyAndHousehold/#${childId}/biologicalOrAdoptiveParentsLiving`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerMustFile`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerDidFile`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerFiledOnlyForRefund`]: createBooleanWrapper(false),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/couldntBeQCOfAnother`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qcOfAnotherButNot`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isQualifyingChildOfAnother`, childId)).get).toBe(
        false
      );
    });
    it(`Will qualify someone as QC of another if that person is required to file, or is filing for credits`, ({
      task,
    }) => {
      task.meta.testedFactPaths = [
        `/familyAndHousehold/*/isQualifyingChildOfAnother`,
        `/familyAndHousehold/*/qcOfAnotherButNot`,
      ];
      const { factGraph } = setupFactGraphDeprecated({
        ...nonChildButQcBaseData,
        ...qrData,
        [`/familyAndHousehold/#${childId}/biologicalOrAdoptiveParentsLiving`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerMustFile`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerDidFile`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerFiledOnlyForRefund`]: createBooleanWrapper(false),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/couldntBeQCOfAnother`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qcOfAnotherButNot`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isQualifyingChildOfAnother`, childId)).get).toBe(
        true
      );

      const { factGraph: factGraph2 } = setupFactGraphDeprecated({
        ...nonChildButQcBaseData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/biologicalOrAdoptiveParentsLiving`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerMustFile`]: createBooleanWrapper(true),
        // leaving extraneous data to make sure that our facts remain resistant to edit workflows
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerDidFile`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerFiledOnlyForRefund`]: createBooleanWrapper(true),
      });
      expect(factGraph2.get(Path.concretePath(`/familyAndHousehold/*/couldntBeQCOfAnother`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qcOfAnotherButNot`, childId)).get).toBe(false);
      expect(factGraph2.get(Path.concretePath(`/familyAndHousehold/*/isQualifyingChildOfAnother`, childId)).get).toBe(
        true
      );
    });
  });

  describe(`Eligibility to be hoh qualifying or EITC qualifying`, () => {
    it(`When dependent is a QC of this TP, and QC of another, will qualify for EITC when claimed`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/eitcQualifyingChild`];

      const { factGraph } = setupFactGraphDeprecated({
        ...nonChildButQcBaseData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/biologicalOrAdoptiveParentsLiving`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerMustFile`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/monthsLivedWithTPInUS`]: createEnumWrapper(
          `seven`,
          `/monthsLivedWithTPInUSOptions`
        ),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isQualifyingChildOfAnother`, childId)).get).toBe(
        true
      );
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isClaimedDependent`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eitcQualifyingChild`, childId)).get).toBe(true);
    });
    it(`When dependent is a QC of this TP, and QC of another, will not qualify for EITC when not claimed`, ({
      task,
    }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/eitcQualifyingChild`];
      const { factGraph } = setupFactGraphDeprecated({
        ...nonChildButQcBaseData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/biologicalOrAdoptiveParentsLiving`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerMustFile`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/monthsLivedWithTPInUS`]: createEnumWrapper(
          `seven`,
          `/monthsLivedWithTPInUSOptions`
        ),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isQualifyingChildOfAnother`, childId)).get).toBe(
        true
      );
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isClaimedDependent`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eitcQualifyingChild`, childId)).get).toBe(false);
    });
  });
});

describe(`When person is eligible for Special Benefit Split`, () => {
  describe(`On custodial parent path`, () => {
    it(`Is eligible to claim the QC for Hoh, EITC, and CDCC`, ({ task }) => {
      task.meta.testedFactPaths = [
        `/familyAndHousehold/*/eligibleForBenefitSplit`,
        `/familyAndHousehold/*/tpCanClaimSplitBenefitsHohEitcCdcc`,
      ];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        ...applyingSpecialBenefitsSplitParentalBaseData,
        [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/monthsLivedWithTPInUS`]: createEnumWrapper(
          `seven`,
          `/monthsLivedWithTPInUSOptions`
        ),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleForBenefitSplit`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(true);
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/tpCanClaimSplitBenefitsHohEitcCdcc`, childId)).get
      ).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/livedWithTpInUsMostOfYear`, childId)).get).toBe(
        true
      );
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eitcQualifyingChild`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/cdccQualifyingPerson`, childId)).get).toBe(true);
    });
    it(`Is not eligible to claim the QC as Hoh QP if the QC is married,
        even though they pass the joint return test`, ({ task }) => {
      task.meta.testedFactPaths = [
        `/familyAndHousehold/*/hohQualifyingPerson`,
        `/familyAndHousehold/*/tpCanClaimSplitBenefitsHohEitcCdcc`,
      ];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        ...applyingSpecialBenefitsSplitParentalBaseData,
        [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writableJointReturn`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writableRequiredToFile`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writableFilingOnlyForRefund`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/residencyDuration`]: createEnumWrapper(
          `lessThanSixMonths`,
          `/residencyDurationOptions`
        ),
      });
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/tpCanClaimSplitBenefitsHohEitcCdcc`, childId)).get
      ).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/tpPaidMostOfHomeUpkeep`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/jointReturnTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(false);
    });
    it(`Is not eligible to claim the QC as a dependent`, ({ task }) => {
      task.meta.testedFactPaths = [
        `/familyAndHousehold/*/eligibleDependent`,
        `/familyAndHousehold/*/tpCanClaimSplitBenefitsHohEitcCdcc`,
      ];

      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        ...applyingSpecialBenefitsSplitParentalBaseData,
        [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
      });
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/tpCanClaimSplitBenefitsHohEitcCdcc`, childId)).get
      ).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(false);
    });

    it(`If the noncustodial parent signed form 8832, then the TP gets knocked out`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/contradictory8832Knockout`];

      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        ...applyingSpecialBenefitsSplitParentalBaseData,
        [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/monthsLivedWithTPInUS`]: createEnumWrapper(
          `seven`,
          `/monthsLivedWithTPInUSOptions`
        ),
        [`/familyAndHousehold/#${childId}/whichParentNotClaiming`]: createEnumWrapper(
          `theyDid`,
          `/writtenDeclarationOptions`
        ),
        [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true), // must claim to test HOH
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/contradictory8832Knockout`, childId)).get).toBe(
        true
      );
      expect(factGraph.get(Path.concretePath(`/knockedOutByContradictory8832`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/flowIsKnockedOut`, childId)).get).toBe(true);
    });
    it(`Is knocked out of the product if the non-custodial parent signed form 8332`, ({ task }) => {
      task.meta.testedFactPaths = [
        `/familyAndHousehold/*/eligibleForBenefitSplit`,
        `/familyAndHousehold/*/causesNoncustodialParentBenefitSplitKnockout`,
      ];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        ...applyingSpecialBenefitsSplitParentalBaseData,
        [`/familyAndHousehold/#${childId}/whichParentNotClaiming`]: createEnumWrapper(
          `theyDid`,
          `/writtenDeclarationOptions`
        ),
        [`/familyAndHousehold/#${childId}/nightsWithTpVsOtherParent`]: createEnumWrapper(
          `more`,
          `/moreLessEqualOptions`
        ),
        [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/monthsLivedWithTPInUS`]: createEnumWrapper(
          `seven`,
          `/monthsLivedWithTPInUSOptions`
        ),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleForBenefitSplit`, childId)).get).toBe(true);
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/contradictory8832TPIsCustodialParent`, childId)).get
      ).toBe(true);
      expect(factGraph.get(Path.concretePath(`/knockedOutByContradictory8832`, childId)).get).toBe(true);
    });

    it(`If nobody signed an 8832, the (custodial) TP is eligible for all the benefits `, ({ task }) => {
      task.meta.testedFactPaths = [
        `/familyAndHousehold/*/eligibleDependent`,
        `/familyAndHousehold/*/tpCanClaimSplitBenefitsHohEitcCdcc`,
      ];

      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/whichParentNotClaiming`]: createEnumWrapper(
          `nobodyDid`,
          `/writtenDeclarationOptions`
        ),
        [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/monthsLivedWithTPInUS`]: createEnumWrapper(
          `seven`,
          `/monthsLivedWithTPInUSOptions`
        ),
        [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true), // must claim to test HOH
      });
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/tpCanClaimSplitBenefitsHohEitcCdcc`, childId)).get
      ).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eitcQualifyingChild`, childId)).get).toBe(true);
    });
  });
  describe(`On noncustodial parent path`, () => {
    it(`Is knocked out of the product if the custodial parent signed form 8332`, ({ task }) => {
      task.meta.testedFactPaths = [
        `/familyAndHousehold/*/eligibleForBenefitSplit`,
        `/familyAndHousehold/*/causesNoncustodialParentBenefitSplitKnockout`,
      ];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        ...applyingSpecialBenefitsSplitParentalBaseData,
        [`/familyAndHousehold/#${childId}/whichParentNotClaiming`]: createEnumWrapper(
          `theyDid`,
          `/writtenDeclarationOptions`
        ),
        [`/familyAndHousehold/#${childId}/nightsWithTpVsOtherParent`]: createEnumWrapper(
          `less`,
          `/moreLessEqualOptions`
        ),
        [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/monthsLivedWithTPInUS`]: createEnumWrapper(
          `seven`,
          `/monthsLivedWithTPInUSOptions`
        ),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleForBenefitSplit`, childId)).get).toBe(true);
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/causesNoncustodialParentBenefitSplitKnockout`, childId))
          .get
      ).toBe(true);
    });
    it(`Is knocked out of the product if the non-custodial parent signed form 8332`, ({ task }) => {
      task.meta.testedFactPaths = [
        `/familyAndHousehold/*/eligibleForBenefitSplit`,
        `/familyAndHousehold/*/causesNoncustodialParentBenefitSplitKnockout`,
      ];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        ...applyingSpecialBenefitsSplitParentalBaseData,
        [`/familyAndHousehold/#${childId}/whichParentNotClaiming`]: createEnumWrapper(
          `iDid`,
          `/writtenDeclarationOptions`
        ),
        [`/familyAndHousehold/#${childId}/nightsWithTpVsOtherParent`]: createEnumWrapper(
          `less`,
          `/moreLessEqualOptions`
        ),
        [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/monthsLivedWithTPInUS`]: createEnumWrapper(
          `seven`,
          `/monthsLivedWithTPInUSOptions`
        ),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleForBenefitSplit`, childId)).get).toBe(true);
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/contradictory8832TPNotCustodialParent`, childId)).get
      ).toBe(true);
      expect(factGraph.get(Path.concretePath(`/knockedOutByContradictory8832`, childId)).get).toBe(true);
    });
  });
  describe(`On other eligible TP (TP is not biological or adoptive parent) path`, () => {
    it(`Is eligible to claim the QC for Hoh and EITC`, ({ task }) => {
      task.meta.testedFactPaths = [
        `/familyAndHousehold/*/tpCanClaimSplitBenefitsHohEitcCdcc`,
        `/familyAndHousehold/*/eitcQualifyingChild`,
        `/familyAndHousehold/*/hohQualifyingPerson`,
      ];
      const { factGraph } = setupFactGraphDeprecated({
        ...nonChildButQcBaseData,
        ...qcData,
        ...applyingSpecialBenefitsSplitNonParentalBaseData,
        [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/monthsLivedWithTPInUS`]: createEnumWrapper(
          `seven`,
          `/monthsLivedWithTPInUSOptions`
        ),
      });
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/tpCanClaimSplitBenefitsHohEitcCdcc`, childId)).get
      ).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eitcQualifyingChild`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(true);
    });
    it(`Is not eligible to claim the QC as a dependent`, ({ task }) => {
      task.meta.testedFactPaths = [
        `/familyAndHousehold/*/tpCanClaimSplitBenefitsHohEitcCdcc`,
        `/familyAndHousehold/*/eligibleDependent`,
      ];
      const { factGraph } = setupFactGraphDeprecated({
        ...nonChildButQcBaseData,
        ...qcData,
        ...applyingSpecialBenefitsSplitNonParentalBaseData,
      });
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/tpCanClaimSplitBenefitsHohEitcCdcc`, childId)).get
      ).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(false);
    });
  });
});

describe(`Claimed dependents`, () => {
  it(`The dependent is a claimed dependent`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/isClaimedDependent`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isClaimedDependent`, childId)).get).toBe(true);
  });
  describe(`The dependent is not a claimed dependent`, () => {
    it(`The dependent is not eligible to be claimed`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/isClaimedDependent`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        [`/familyAndHousehold/#${childId}/grossIncomeTest`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/residencyDuration`]: createEnumWrapper(
          `lessThanSixMonths`,
          `/residencyDurationOptions`
        ),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isClaimedDependent`, childId)).get).toBe(false);
    });
    it(`The dependent has not been claimed`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/isClaimedDependent`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(false),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isClaimedDependent`, childId)).get).toBe(false);
    });
  });

  it(`The dependent is the reverse of a claimed dependent`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/isNotClaimedDependent`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isNotClaimedDependent`, childId)).get).toBe(true);
  });

  it(`The dependent is the reverse of a not claimed dependent`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/isNotClaimedDependent`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isNotClaimedDependent`, childId)).get).toBe(false);
  });

  it(`The number of claimed dependents is the expected count when there are no claimed dependents`, ({ task }) => {
    task.meta.testedFactPaths = [`/claimedDependentsCount`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...ctcData,
      [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/claimedDependentsCount`, childId)).get).toBe(0);
  });

  it(`The number of claimed dependents is the expected count when there is one claimed dependent`, ({ task }) => {
    task.meta.testedFactPaths = [`/claimedDependentsCount`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...ctcData,
    });
    expect(factGraph.get(Path.concretePath(`/claimedDependentsCount`, childId)).get).toBe(1);
  });

  it(`The number of claimed dependents is the expected count when there is more than one claimed dependent`, ({
    task,
  }) => {
    task.meta.testedFactPaths = [`/claimedDependentsCount`];
    const { factGraph } = setupFactGraphDeprecated({
      ...createChild(additionalChildId1, `NewChild`, `G`, `Childface`, true),
      ...createChild(additionalChildId2, `ThirdChild`, `F`, `Childface`, true),
      '/familyAndHousehold': createCollectionWrapper([additionalChildId1, additionalChildId2]),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isClaimedDependent`, additionalChildId1)).get).toBe(
      true
    );
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isClaimedDependent`, additionalChildId2)).get).toBe(
      true
    );
    expect(factGraph.get(Path.concretePath(`/claimedDependentsCount`, childId)).get).toBe(2);
  });
});

describe(`Qualifying child`, () => {
  it(`Someone who passes the relationship, age, support, residency, and joint return tests is a qualifying child`, ({
    task,
  }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/qualifyingChild`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qcRelationshipTest`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/ageTest`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qcSupportTest`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/residencyTest`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/jointReturnTest`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(true);
  });

  describe(`Age test`, () => {
    it(`A 25 year old full time student fails the age test if they are not disabled`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/ageTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        ...failingAgeTestData,
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/ageTest`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(false);
    });
    it(`A 19 year old full time student passes the age test`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/ageTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(
          `${Number.parseInt(CURRENT_TAX_YEAR) - 19}-01-02`
        ),
        [`/familyAndHousehold/#${childId}/fullTimeStudent`]: createBooleanWrapper(true),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/ageTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(true);
    });
    it(`A 19 year old who is not a student fails the age test if they are not disabled`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/ageTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(
          `${Number.parseInt(CURRENT_TAX_YEAR) - 19}-01-02`
        ),
        [`/familyAndHousehold/#${childId}/fullTimeStudent`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/permanentTotalDisability`]: createBooleanWrapper(false),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/ageTest`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(false);
    });
    it(`A 50 year old who is not a student passes the age test if they are disabled`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/ageTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(
          `${Number.parseInt(CURRENT_TAX_YEAR) - 50}-01-02`
        ),
        [`/familyAndHousehold/#${childId}/fullTimeStudent`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/permanentTotalDisability`]: createBooleanWrapper(true),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/ageTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(true);
    });
    it(`A 12 year old passes the age test with student status unknown`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/ageTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(
          `${Number.parseInt(CURRENT_TAX_YEAR) - 12}-01-02`
        ),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/ageTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(true);
    });
  });

  describe(`Disability Status`, () => {
    it(`Needs to ask disability status of someone younger than 18 if they are older than one of the filers`, ({
      task,
    }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/disabilityStatusMayAffectBenefits`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        [`/filers/#${primaryFilerId}/dateOfBirth`]: createDayWrapper(`${Number.parseInt(CURRENT_TAX_YEAR) - 16}-07-03`),
        [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(
          `${Number.parseInt(CURRENT_TAX_YEAR) - 17}-07-03`
        ),
      });
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/disabilityStatusMayAffectBenefits`, childId)).get
      ).toBe(true);
    });

    it(`Does not ask disability status of someone younger than 18 if they are younger than the filers`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/disabilityStatusMayAffectBenefits`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        [`/filers/#${primaryFilerId}/dateOfBirth`]: createDayWrapper(`${Number.parseInt(CURRENT_TAX_YEAR) - 20}-07-03`),
        [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(
          `${Number.parseInt(CURRENT_TAX_YEAR) - 17}-07-03`
        ),
      });
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/disabilityStatusMayAffectBenefits`, childId)).get
      ).toBe(false);
    });
  });

  describe(`Residency test`, () => {
    it(`Requires that the person have lived with the TP for more than six months`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/residencyTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/residencyDuration`]: createEnumWrapper(
          `lessThanSixMonths`,
          `/residencyDurationOptions`
        ),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/residencyTest`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(false);
    });
  });

  describe(`Support test`, () => {
    it(`Requires that the person did not provide more than half of their own support`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/qcSupportTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/ownSupport`]: createBooleanWrapper(true),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qcSupportTest`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(false);
    });
  });

  describe(`Joint return test`, () => {
    it(`Passes a person who is not married`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/jointReturnTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(false),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/jointReturnTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(true);
    });
    it(`Passes a person who is married but not required to file and not filing`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/jointReturnTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writableJointReturn`]: createBooleanWrapper(false),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/jointReturnTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(true);
    });
    it(`Fails a person who is filing a joint return and required to file`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/jointReturnTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writableJointReturn`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writableRequiredToFile`]: createBooleanWrapper(true),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/jointReturnTest`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(false);
    });
    it(`Passes a person who is married but not required to file but filing only for a refund of taxes`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/jointReturnTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writableJointReturn`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writableRequiredToFile`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writableFilingOnlyForRefund`]: createBooleanWrapper(true),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/jointReturnTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(true);
    });
    it(`Fails a person who is married, filing jointly for credits`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/jointReturnTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writableJointReturn`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writableRequiredToFile`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writableFilingOnlyForRefund`]: createBooleanWrapper(false),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/jointReturnTest`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(false);
    });
  });
});

describe(`Qualifying relative`, () => {
  describe(`Not qualifying child test`, () => {
    it(`Passes not QC test if they fail the age test`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/notQualifyingChildTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...qcData,
        ...failingAgeTestData,
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/notQualifyingChildTest`, childId)).get).toBe(true);
    });
    it(`Passes not QC test if they are not the QC of another`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/notQualifyingChildTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...unrelatedChildBaseData,
        ...qrData,
        [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(false),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/notQualifyingChildTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingRelative`, childId)).get).toBe(true);
    });
    it(`Passes not QC test if they are the QC of another but that person does not have a filing requirement`, ({
      task,
    }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/notQualifyingChildTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...unrelatedChildBaseData,
        ...qrData,
        [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerMustFile`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerDidFile`]: createBooleanWrapper(false),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/notQualifyingChildTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingRelative`, childId)).get).toBe(true);
    });
    it(`Passes not QC test if they are the QC of another but that person only filed for a refund`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/notQualifyingChildTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...unrelatedChildBaseData,
        ...qrData,
        [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerMustFile`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerDidFile`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerFiledOnlyForRefund`]: createBooleanWrapper(true),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/notQualifyingChildTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingRelative`, childId)).get).toBe(true);
    });
    it(`Fails the not QC test if they are the QC of another and that person has a filing requirement`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/notQualifyingChildTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...unrelatedChildBaseData,
        ...qrData,
        [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerMustFile`]: createBooleanWrapper(true),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/notQualifyingChildTest`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingRelative`, childId)).get).toBe(false);
    });
    it(`Fails the not QC test if they are the QC of another and that person is claiming them`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/notQualifyingChildTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...unrelatedChildBaseData,
        ...qrData,
        [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerMustFile`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerDidFile`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerFiledOnlyForRefund`]: createBooleanWrapper(false),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/notQualifyingChildTest`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingRelative`, childId)).get).toBe(false);
    });
  });

  describe(`Relationship Member of household test`, () => {
    it(`Passes the test for any of the qualifying relationship types, even if they didn't live with the TP`, ({
      task,
    }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/relationshipMemberOfHouseholdTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...unrelatedChildBaseData,
        ...qrData,
        [`/familyAndHousehold/#${childId}/relationshipCategory`]: createEnumWrapper(
          `parentOrAncestors`,
          `/relationshipCategoryOptions`
        ),
        [`/familyAndHousehold/#${childId}/parentalRelationship`]: createEnumWrapper(
          `parent`,
          `/parentalRelationshipOptions`
        ),
        [`/familyAndHousehold/#${childId}/residencyDuration`]: createEnumWrapper(
          `lessThanSixMonths`,
          `/residencyDurationOptions`
        ),
      });
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/relationshipMemberOfHouseholdTest`, childId)).get
      ).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingRelative`, childId)).get).toBe(true);
    });
    it(`For other relationship types, fails them if they didn't live with the TP all year`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/relationshipMemberOfHouseholdTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...unrelatedChildBaseData,
        ...qrData,
        [`/familyAndHousehold/#${childId}/relationshipCategory`]: createEnumWrapper(
          `notRelated`,
          `/relationshipCategoryOptions`
        ),
        [`/familyAndHousehold/#${childId}/residencyDuration`]: createEnumWrapper(
          `sixToElevenMonths`,
          `/residencyDurationOptions`
        ),
      });
      expect(
        factGraph.get(Path.concretePath(`/familyAndHousehold/*/relationshipMemberOfHouseholdTest`, childId)).get
      ).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingRelative`, childId)).get).toBe(false);
    });
  });

  describe(`QR Support test`, () => {
    it(`Fails the QR support test if they provided more than half of their own support (Failed QC support test)`, ({
      task,
    }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/qrSupportTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...unrelatedChildBaseData,
        ...qrData,
        [`/familyAndHousehold/#${childId}/ownSupport`]: createBooleanWrapper(true),
        // writableQrSupportTest can't be true, so it should be ignored
        [`/familyAndHousehold/#${childId}/writableQrSupportTest`]: createBooleanWrapper(true),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qrSupportTest`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingRelative`, childId)).get).toBe(false);
    });
    it(`If ownSupport is not filled out, falls back to the writableQrSupportTest / gross income test`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/qrSupportTest`];
      const { factGraph } = setupFactGraphDeprecated({
        ...unrelatedChildBaseData,
        ...qrData,
        [`/familyAndHousehold/#${childId}/writableQrSupportTest`]: createBooleanWrapper(false),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qrSupportTest`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingRelative`, childId)).get).toBe(false);
    });
  });
});

describe(`Eligible Dependent`, () => {
  it(`If the filers are being treated as dependents, this person is not an eligible dependent`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleDependent`];
    const { factGraph } = setupFactGraphDeprecated({
      ...childBaseData,
      [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(true),
      [`/filers/#${primaryFilerId}/potentialClaimerMustFile`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/treatFilersAsDependents`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(false);
  });
  it(`If the person is not a citizen or resident of US, Canada, or Mexico, the person is not an eligible dependent`, ({
    task,
  }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleDependent`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      [`/familyAndHousehold/#${childId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsResident`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsNational`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableCanadaMexicoResident`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/citizenOrResidentTest`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(false);
  });

  it(`If the person is not a citizen or resident of US, Canada, or Mexico,
    but they meet the adopted child exception, they are an eligible dependent`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleDependent`];
    const { factGraph } = setupFactGraphDeprecated({
      ...adoptedChildBaseData,
      ...qcData,
      [`/familyAndHousehold/#${childId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsResident`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsNational`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableCanadaMexicoResident`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
      [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/adoptedChildException`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/citizenOrResidentTest`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(true);
  });

  it(`If the person fails the joint return test, they are not an eligible dependent`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleDependent`];
    const { factGraph } = setupFactGraphDeprecated({
      ...childBaseData,
      [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/writableJointReturn`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/writableFilingOnlyForRefund`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/jointReturnTest`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(false);
  });

  it(`When dependent is a QR of this TP, and QC of another, will not be an eligible dependent`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleDependent`];

    const { factGraph } = setupFactGraphDeprecated({
      ...unrelatedChildBaseData,
      ...qcData,
      [`/familyAndHousehold/#${childId}/biologicalOrAdoptiveParentsLiving`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/writablePotentialClaimerMustFile`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/writableQrSupportTest`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/grossIncomeTest`]: createBooleanWrapper(true),
    });

    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/grossIncomeTest`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qrSupportTest`, childId)).get).toBe(true);

    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/notQualifyingChildTest`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingRelative`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(false);
  });

  it(`When dependent is a QC of this TP, and QC of another, will be an eligible dependent`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleDependent`];
    const { factGraph } = setupFactGraphDeprecated({
      ...nonChildButQcBaseData,
      ...qcData,
      [`/familyAndHousehold/#${childId}/biologicalOrAdoptiveParentsLiving`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/writablePotentialClaimerMustFile`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/couldntBeQCOfAnother`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isQualifyingChildOfAnother`, childId)).get).toBe(
      true
    );
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(true);
  });

  it(`When dependent has no TIN, will not be an eligible dependent `, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleDependent`];
    const { factGraph } = setupFactGraphDeprecated({
      ...nonChildButQcBaseData,
      ...qcData,
      [`/familyAndHousehold/#${childId}/biologicalOrAdoptiveParentsLiving`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/tinType`]: createEnumWrapper(`none`, `/tinTypeOptions`),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(false);
  });
});

describe(`Eligible for CTC`, () => {
  it(`A qualifying child dependent is eligible for CTC`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleCtc`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...ctcData,
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleCtc`, childId)).get).toBe(true);
  });

  it(`A qualifying relative dependent is not eligible for CTC`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleCtc`];
    const { factGraph } = setupFactGraphDeprecated({
      ...unrelatedChildBaseData,
      ...qrData,
      ...ctcData,
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingRelative`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleCtc`, childId)).get).toBe(false);
  });

  it(`The child must be claimed as a dependent to be eligible for CTC`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleCtc`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...ctcData,
      [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleCtc`, childId)).get).toBe(false);
  });

  it(`A 16 year old is eligible for CTC`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleCtc`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...ctcData,
      [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(
        `${Number.parseInt(CURRENT_TAX_YEAR) - 16}-01-01`
      ),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/age`, childId)).get).toBe(16);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleCtc`, childId)).get).toBe(true);
  });

  it(`A 17 year old is not eligible for CTC`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleCtc`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...ctcData,
      [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(
        `${Number.parseInt(CURRENT_TAX_YEAR) - 17}-12-31`
      ),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/age`, childId)).get).toBe(17);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleCtc`, childId)).get).toBe(false);
  });

  it(`The child must have an SSN that is valid for employment`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleCtc`];
    const { factGraph: noSsn } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...ctcData,
      [`/familyAndHousehold/#${childId}/tinType`]: createEnumWrapper(`itin`, `/tinTypeOptions`),
    });
    expect(noSsn.get(Path.concretePath(`/familyAndHousehold/*/eligibleCtc`, childId)).get).toBe(false);

    const { factGraph: invalidSsn } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...ctcData,
      [`/familyAndHousehold/#${childId}/ssnEmploymentValidity`]: createEnumWrapper(`neither`, `/notValid`),
    });
    expect(invalidSsn.get(Path.concretePath(`/familyAndHousehold/*/eligibleCtc`, childId)).get).toBe(false);
  });

  it(`A non-citizen child can be a U.S. resident`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleCtc`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...ctcData,
      [`/familyAndHousehold/#${childId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsResident`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleCtc`, childId)).get).toBe(true);
  });

  it(`A non-citizen child can be a U.S. national`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleCtc`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...ctcData,
      [`/familyAndHousehold/#${childId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsResident`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsNational`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleCtc`, childId)).get).toBe(true);
  });

  it(`A child who is not a U.S. citizen or national cannot live in Canada or Mexico`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleCtc`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...ctcData,
      [`/familyAndHousehold/#${childId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsResident`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsNational`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableCanadaMexicoResident`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleCtc`, childId)).get).toBe(false);
  });

  it.todo(`An adopted child qualifies even if they are not a U.S. citizen, national, or resident`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleCtc`];
  });
});

describe(`Eligible for ODC`, () => {
  it(`A qualifying child dependent is eligible for ODC`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleOdc`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...ctcData,
      [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(
        `${Number.parseInt(CURRENT_TAX_YEAR) - 17}-12-31`
      ),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleOdc`, childId)).get).toBe(true);
  });

  it(`A qualifying relative dependent is eligible for ODC`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleOdc`];
    const { factGraph } = setupFactGraphDeprecated({
      ...unrelatedChildBaseData,
      ...qrData,
      ...odcData,
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingRelative`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleOdc`, childId)).get).toBe(true);
  });

  it(`The dependent must be claimed as a dependent to be eligible for ODC`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleOdc`];
    const { factGraph } = setupFactGraphDeprecated({
      ...unrelatedChildBaseData,
      ...qrData,
      ...odcData,
      [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleOdc`, childId)).get).toBe(false);
  });

  it(`The dependent does not need an SSN to be eligible for ODC`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/eligibleOdc`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...ctcData,
      [`/familyAndHousehold/#${childId}/tinType`]: createEnumWrapper(`itin`, `/tinTypeOptions`),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleOdc`, childId)).get).toBe(true);
  });
});

describe(`QSS Qualifying Person`, () => {
  it(`Filer must have provided most of the home upkeep`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/qssQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...childBaseData,
      [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qssQualifyingPerson`, childId)).get).toBe(false);
  });
  it(`The QSS QP must be a citizen or resident or US, Mexico, or Canada`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/qssQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsResident`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsNational`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableCanadaMexicoResident`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qssQualifyingPerson`, childId)).get).toBe(false);
  });
  it(`If the person is not a citizen or resident of US, Canada, or Mexico,
    but they meet the adopted child exception, they are a QSS QP`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/qssQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...adoptedChildBaseData,
      ...qcData,
      [`/familyAndHousehold/#${childId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsResident`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsNational`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableCanadaMexicoResident`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
      [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/adoptedChildException`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/citizenOrResidentTest`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qssQualifyingPerson`, childId)).get).toBe(true);
  });
  it(`The QSS QP does not have to meet the joint return test`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/qssQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/writableJointReturn`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/writableFilingOnlyForRefund`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qssQualifyingPerson`, childId)).get).toBe(true);
  });
  it(`The QSS QP does not have to meet the gross income test`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/qssQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qrData,
      ...failingAgeTestData, // Ensure the QP is on the QR path
      [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/grossIncomeTest`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qssQualifyingPerson`, childId)).get).toBe(true);
  });
  it(`The QSS QP has to be claimed as a dependent if they are a QC`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/qssQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qssQualifyingPerson`, childId)).get).toBe(false);
  });

  it(`The QSS QP cannot be on the custodial side of a special benefit split`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/qssQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...applyingSpecialBenefitsSplitParentalBaseData,
      [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(false),
    });
    expect(
      factGraph.get(Path.concretePath(`/familyAndHousehold/*/tpCanClaimSplitBenefitsHohEitcCdcc`, childId)).get
    ).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qssQualifyingPerson`, childId)).get).toBe(false);
  });
});

describe(`Head of household qualifying person`, () => {
  it(`The base case describes an HoH qualifying person`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hohQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...hohQpData,
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(true);
  });

  it(`The person still qualifies as HOH even if they don't have a tin`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hohQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...hohQpData,
      [`/familyAndHousehold/#${childId}/tinType`]: createEnumWrapper(`none`, `/tinTypeOptions`),
      [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(true);
  });

  it(`When the person is married but lived apart for 6 months, applies a stricter set of QC relationships`, ({
    task,
  }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hohQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...hohQpData,
      [`/familyAndHousehold/#${childId}/biologicalOrAdoptiveParentsLiving`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/childRelationship`]: createEnumWrapper(
        `grandChildOrOtherDescendantOfChild`,
        `/childRelationshipOptions`
      ),
      '/maritalStatus': createEnumWrapper(`married`, `/maritalStatusOptions`),
      [`/filers/#${spouseId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
      [`/livedApartFromSpouse`]: createBooleanWrapper(true),
      [`/writableLivedApartLastSixMonths`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/marriedHohRelationshipTest`, childId)).get).toBe(
      false
    );
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(false);
    // For exhaustive tests, see dependentRelationships.test.ts
  });
  it(`When the person is married but the spouse is a NRA, does not apply a stricter set of QC relationships`, ({
    task,
  }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hohQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...hohQpData,
      [`/familyAndHousehold/#${childId}/biologicalOrAdoptiveParentsLiving`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/childRelationship`]: createEnumWrapper(
        `grandChildOrOtherDescendantOfChild`,
        `/childRelationshipOptions`
      ),
      '/maritalStatus': createEnumWrapper(`married`, `/maritalStatusOptions`),
      [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
      // The three facts below make the spouse treated as a nonresident alien
      [`/filers/#${spouseId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
      [`/filers/#${spouseId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
      [`/filers/#${spouseId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/eligibleForMFJ`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/marriedHohRelationshipTest`, childId)).get).toBe(
      false
    );
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(true);
  });

  it(`The TP must have paid half the cost of keeping up the house with the QC or QR`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hohQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...hohQpData,
      [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(false);
  });

  it(`If the QR is a parent, must have paid more than half the cost of keeping up their parents home`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hohQualifyingPerson`];

    const parentQpData = {
      ...childBaseData,
      ...hohQpData,
      ...failingAgeTestData,
      [`/familyAndHousehold/#${childId}/residencyDuration`]: createEnumWrapper(
        `lessThanSixMonths`,
        `/residencyDurationOptions`
      ),
      [`/familyAndHousehold/#${childId}/writableQrSupportTest`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/grossIncomeTest`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/relationshipCategory`]: createEnumWrapper(
        `parentOrAncestors`,
        `/relationshipCategoryOptions`
      ),
      [`/familyAndHousehold/#${childId}/parentalRelationship`]: createEnumWrapper(
        `parent`,
        `/parentalRelationshipOptions`
      ),
    };

    const { factGraph: trueGraph } = setupFactGraphDeprecated({
      ...parentQpData,
      [`/familyAndHousehold/#${childId}/tpPaidMostOfParentHomeUpkeep`]: createBooleanWrapper(true),
    });
    expect(trueGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(true);

    const { factGraph: falseGraph } = setupFactGraphDeprecated({
      ...parentQpData,
      [`/familyAndHousehold/#${childId}/tpPaidMostOfParentHomeUpkeep`]: createBooleanWrapper(false),
    });
    expect(falseGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(false);
  });

  it(`If the QR is a parent who lived with the TP, they still qualify for HOH`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hohQualifyingPerson`];

    const parentQpData = {
      ...childBaseData,
      ...hohQpData,
      ...failingAgeTestData,
      [`/familyAndHousehold/#${childId}/residencyDuration`]: createEnumWrapper(
        `sixToElevenMonths`,
        `/residencyDurationOptions`
      ),
      [`/familyAndHousehold/#${childId}/writableQrSupportTest`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/grossIncomeTest`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/relationshipCategory`]: createEnumWrapper(
        `parentOrAncestors`,
        `/relationshipCategoryOptions`
      ),
      [`/familyAndHousehold/#${childId}/parentalRelationship`]: createEnumWrapper(
        `parent`,
        `/parentalRelationshipOptions`
      ),
    };

    const { factGraph: trueGraph } = setupFactGraphDeprecated({
      ...parentQpData,
      [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
    });
    expect(trueGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(true);

    const { factGraph: falseGraph } = setupFactGraphDeprecated({
      ...parentQpData,
      [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(false),
    });
    expect(falseGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(false);
  });

  it(`If the QC is in a special benefits split, they do not have to be eligible to be claimed as the
      TP's dependent to be an HoH QP`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hohQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...hohQpData,
      ...applyingSpecialBenefitsSplitParentalBaseData,
      [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(false),
    });
    expect(
      factGraph.get(Path.concretePath(`/familyAndHousehold/*/tpCanClaimSplitBenefitsHohEitcCdcc`, childId)).get
    ).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(true);
  });

  it(`If the QC is in a special benefits split, they must be eligible to be claimed as the TP's dependent
  to be an HoH QP`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hohQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...hohQpData,
      ...applyingSpecialBenefitsSplitParentalBaseData,
      [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/writableJointReturn`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/grossIncomeTest`]: createBooleanWrapper(false), // easy way to foreclose QR path
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(false);
  });

  it(`If the QC is unmarried, they do not have to be eligible to be claimed as the TP's dependent to be an HoH QP`, ({
    task,
  }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hohQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...hohQpData,
      [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(false),
      // Use the residency data to disqualify the person as a dependent
      [`/familyAndHousehold/#${childId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsResident`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsNational`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableCanadaMexicoResident`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(true);
  });

  it(`If the QC is married, they have to be eligible to be claimed as the TP's dependent to be an HoH QP`, ({
    task,
  }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hohQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...hohQpData,
      [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(true),
      // Use the residency data to disqualify the person as a dependent
      [`/familyAndHousehold/#${childId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsResident`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsNational`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableCanadaMexicoResident`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(false);
  });

  it(`If the QC is married, they are still eligible to be claimed as the TP's dependent
      if the only reason they couldn't be a dependent is that the TP is a dependent`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hohQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      ...hohQpData,
      [`/familyAndHousehold/#${childId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/writableJointReturn`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
      [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(true),
      [`/filers/#${primaryFilerId}/potentialClaimerMustFile`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(true);
  });

  it(`A QR must be an eligible and claimeddependent in order to be an HoH QP`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hohQualifyingPerson`];

    const qpData = {
      ...biologicalChildBaseData,
      ...hohQpData,
      ...qrData,
      ...failingAgeTestData,
      [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true),
    };

    const { factGraph: trueGraph } = setupFactGraphDeprecated(qpData);
    expect(trueGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingRelative`, childId)).get).toBe(true);
    expect(trueGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(true);
    expect(trueGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(true);

    const { factGraph: falseGraph } = setupFactGraphDeprecated({
      ...qpData,
      [`/familyAndHousehold/#${childId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsResident`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableUsNational`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableCanadaMexicoResident`]: createBooleanWrapper(false),
    });
    expect(falseGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingRelative`, childId)).get).toBe(true);
    expect(falseGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(false);
    expect(falseGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(false);
  });

  it(`A nonparental QR must live with the TP more than half the year to be an HoH QP`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hohQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...hohQpData,
      [`/familyAndHousehold/#${childId}/residencyDuration`]: createEnumWrapper(
        `lessThanSixMonths`,
        `/residencyDurationOptions`
      ),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(false);
  });

  it(`A QR must be related to you in order to be an HoH QP -- they cant just be a friend`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hohQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...unrelatedChildBaseData,
      ...hohQpData,
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(false);
  });

  it(`When dependent is a QC of this TP, and QC of another, will only qualify for HoH when claimed`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hohQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...nonChildButQcBaseData,
      ...qcData,
      [`/familyAndHousehold/#${childId}/biologicalOrAdoptiveParentsLiving`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/writablePotentialClaimerMustFile`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isQualifyingChildOfAnother`, childId)).get).toBe(
      true
    );
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isClaimedDependent`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(true);
  });
  it(`When dependent is a QC of this TP, and QC of another, will not qualify for HoH when not claimed`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/hohQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...nonChildButQcBaseData,
      ...qcData,
      [`/familyAndHousehold/#${childId}/biologicalOrAdoptiveParentsLiving`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/writablePotentialClaimerMustFile`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/tpPaidMostOfHomeUpkeep`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(false),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isQualifyingChildOfAnother`, childId)).get).toBe(
      true
    );
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isClaimedDependent`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/hohQualifyingPerson`, childId)).get).toBe(false);
  });
});

describe(`CDCC Qualifying person`, () => {
  it(`A claimed child at or under age 13 is always qualified for CDCC`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/cdccQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(
        `${Number.parseInt(CURRENT_TAX_YEAR) - 12}-01-01`
      ),
      [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isClaimedDependent`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/age`, childId)).get).toBe(12);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/cdccQualifyingPerson`, childId)).get).toBe(true);
  });

  it(`A claimed child over age 13 who is capable of self care is not qualified for CDCC`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/cdccQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...biologicalChildBaseData,
      ...qcData,
      [`/familyAndHousehold/#${childId}/unableToCareForSelf`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(
        `${Number.parseInt(CURRENT_TAX_YEAR) - 16}-01-01`
      ),
      [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isClaimedDependent`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/age`, childId)).get).toBe(16);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/cdccQualifyingPerson`, childId)).get).toBe(false);
  });

  it(`A claimed QR who is incapable of self care but did not live with
    the taxpayer is not eligible for CDCC`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/cdccQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...unrelatedChildBaseData,
      ...qrData,
      ...odcData,
      [`/familyAndHousehold/#${childId}/relationshipCategory`]: createEnumWrapper(
        `siblingOrDescendants`,
        `/relationshipCategoryOptions`
      ),
      [`/familyAndHousehold/#${childId}/siblingRelationship`]: createEnumWrapper(
        `childOfSibling`,
        `/siblingRelationshipOptions`
      ),
      [`/familyAndHousehold/#${childId}/residencyDuration`]: createEnumWrapper(
        `lessThanSixMonths`,
        `/residencyDurationOptions`
      ),
      [`/familyAndHousehold/#${childId}/unableToCareForSelf`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isClaimedDependent`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingRelative`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/cdccQualifyingPerson`, childId)).get).toBe(false);
  });

  it(`A claimed QR who is incapable of self care and lived with the TP is eligible for CDCC`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/cdccQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      ...unrelatedChildBaseData,
      ...qrData,
      ...odcData,
      [`/familyAndHousehold/#${childId}/relationshipCategory`]: createEnumWrapper(
        `siblingOrDescendants`,
        `/relationshipCategoryOptions`
      ),
      [`/familyAndHousehold/#${childId}/siblingRelationship`]: createEnumWrapper(
        `childOfSibling`,
        `/siblingRelationshipOptions`
      ),
      [`/familyAndHousehold/#${childId}/residencyDuration`]: createEnumWrapper(`allYear`, `/residencyDurationOptions`),
      [`/familyAndHousehold/#${childId}/unableToCareForSelf`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isClaimedDependent`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingRelative`, childId)).get).toBe(true);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/cdccQualifyingPerson`, childId)).get).toBe(true);
  });

  it(`An unclaimed person incapable of self care is claimable for CDCC if the only reasons that they're not
    claimable is because of the joint return test`, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/cdccQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      // Would be a QC incapable of caring for self
      ...biologicalChildBaseData,
      ...qcData,
      [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/dateOfBirth`]: createDayWrapper(
        `${Number.parseInt(CURRENT_TAX_YEAR) - 16}-01-01`
      ),
      [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/unableToCareForSelf`]: createBooleanWrapper(true),

      // Fails joint return test
      [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/writableJointReturn`]: createBooleanWrapper(true),
      [`/familyAndHousehold/#${childId}/writableRequiredToFile`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isClaimedDependent`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/cdccQualifyingPerson`, childId)).get).toBe(true);
  });

  it(`An unclaimed person incapable of self care is claimable for CDCC if the only reasons that they're not
    claimable is because of the gross income test and the `, ({ task }) => {
    task.meta.testedFactPaths = [`/familyAndHousehold/*/cdccQualifyingPerson`];
    const { factGraph } = setupFactGraphDeprecated({
      // Create a QR and have them reside with the TP
      ...unrelatedChildBaseData,
      ...qrData,
      ...odcData,
      // overwrite the Gross Income Test to be false
      [`/familyAndHousehold/#${childId}/grossIncomeTest`]: createBooleanWrapper(false),
      [`/familyAndHousehold/#${childId}/unableToCareForSelf`]: createBooleanWrapper(true),
    });
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isClaimedDependent`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingRelative`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qualifyingChild`, childId)).get).toBe(false);
    expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/cdccQualifyingPerson`, childId)).get).toBe(true);
  });
});

describe(`EITC Qualifying Child`, () => {
  describe(`EITC QC must meet the QC age, residency, relationship, and joint return tests`, () => {
    it(`Passes if all four tests are met`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/eitcQualifyingChild`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...eitcQpData,
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qcRelationshipTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/ageTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/residencyTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/jointReturnTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eitcQualifyingChild`, childId)).get).toBe(true);
    });

    it(`If the QC is also a possible dependent, must be claimed to be an EITC QC`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/eitcQualifyingChild`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...eitcQpData,
        [`/familyAndHousehold/#${childId}/tinType`]: createEnumWrapper(`ssn`, `/tinTypeOptions`),
        [`/familyAndHousehold/#${childId}/ownSupport`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(false),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qcRelationshipTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/ageTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/residencyTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/jointReturnTest`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eitcQualifyingChild`, childId)).get).toBe(false);
    });

    it(`Is not an EITC QC if failing the relationship test`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/eitcQualifyingChild`];
      const { factGraph } = setupFactGraphDeprecated({
        ...unrelatedChildBaseData,
        ...eitcQpData,
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qcRelationshipTest`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eitcQualifyingChild`, childId)).get).toBe(false);
    });
    it(`Is not an EITC QC if failing the EITC residency test`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/eitcQualifyingChild`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...eitcQpData,
        [`/familyAndHousehold/#${childId}/residencyDuration`]: createEnumWrapper(
          `lessThanSixMonths`,
          `/residencyDurationOptions`
        ),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/residencyTest`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/livedWithTpInUsMostOfYear`, childId)).get).toBe(
        false
      );
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eitcQualifyingChild`, childId)).get).toBe(false);
    });
    it(`Is not an EITC QC if failing the age test`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/eitcQualifyingChild`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...eitcQpData,
        ...failingAgeTestData,
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/ageTest`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eitcQualifyingChild`, childId)).get).toBe(false);
    });
    it(`Is not an EITC QC if failing the joint return test`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/eitcQualifyingChild`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...eitcQpData,
        [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writableJointReturn`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writableRequiredToFile`]: createBooleanWrapper(true),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/jointReturnTest`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eitcQualifyingChild`, childId)).get).toBe(false);
    });
    it(`Must be claimed by the taxpayer if they are the QC of another`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/eitcQualifyingChild`];
      const { factGraph } = setupFactGraphDeprecated({
        ...nonChildButQcBaseData,
        ...eitcQpData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/biologicalOrAdoptiveParentsLiving`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerMustFile`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isQualifyingChildOfAnother`, childId)).get).toBe(
        true
      );
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isClaimedDependent`, childId)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eitcQualifyingChild`, childId)).get).toBe(true);
    });
    it(`Is not an EITC QP if unclaimed, and they are the QC of another`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/eitcQualifyingChild`];
      const { factGraph } = setupFactGraphDeprecated({
        ...nonChildButQcBaseData,
        ...eitcQpData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/biologicalOrAdoptiveParentsLiving`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/writableCouldBeQualifyingChildOfAnother`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writablePotentialClaimerMustFile`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(false),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/couldntBeQCOfAnother`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isQualifyingChildOfAnother`, childId)).get).toBe(
        true
      );
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eitcQualifyingChild`, childId)).get).toBe(false);
    });
    it(`Can fail the support test, not be an eligible dependent, and yet still be eligible for EITC`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/eitcQualifyingChild`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...eitcQpData,
        [`/familyAndHousehold/#${childId}/ownSupport`]: createBooleanWrapper(true),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/qcSupportTest`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eitcQualifyingChild`, childId)).get).toBe(true);
    });

    it(`If married, must be claimable as a dependent to qualify for EITC`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/eitcQualifyingChild`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...eitcQpData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/ownSupport`]: createBooleanWrapper(true),
      });
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(false);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/eitcQualifyingChild`, childId)).get).toBe(false);

      const { factGraph: factGraph2 } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...eitcQpData,
        ...qcData,
        [`/familyAndHousehold/#${childId}/hasOtherBiologicalOrAdoptiveParent`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/married`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/writableJointReturn`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/ownSupport`]: createBooleanWrapper(false),
        [`/familyAndHousehold/#${childId}/tpClaims`]: createBooleanWrapper(true),
      });
      expect(factGraph2.get(Path.concretePath(`/familyAndHousehold/*/eligibleDependent`, childId)).get).toBe(true);
      expect(factGraph2.get(Path.concretePath(`/familyAndHousehold/*/eitcQualifyingChild`, childId)).get).toBe(true);
    });
  });
  describe(`How EITC factors into the completion condition on dependents: isCompleted`, () => {
    it(`is true if we know the filer qualifies for EITC and we have the child's TIN and PIN info`, ({ task }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/isCompleted`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...eitcQpData,
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC - 1, primaryFilerId),
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/tin`]: createTinWrapper({ area: `555`, group: `55`, serial: `5555` }),
        [`/familyAndHousehold/#${childId}/hasIpPin`]: createBooleanWrapper(false),
        [`/eitcQcOfAnother`]: createBooleanWrapper(false),
        [`/eitcHadImproperClaims`]: createBooleanWrapper(false),
        [`/eitcImproperClaimsDueToQc`]: createBooleanWrapper(false),
        [`/wasK12Educators`]: createEnumWrapper(`neither`, `/k12EducatorOptions`),
      });
      expect(factGraph.get(Path.concretePath(`/eitcQualified`, null)).complete).toBe(true);
      expect(factGraph.get(Path.concretePath(`/eitcQualified`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isCompleted`, childId)).get).toBe(true);
    });
    it(`is false if we know the filer qualifies for EITC and we don't have the child's TIN and the child has a SSN`, ({
      task,
    }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/isCompleted`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...eitcQpData,
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC - 1, primaryFilerId),
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
        [`/eitcQcOfAnother`]: createBooleanWrapper(false),
        [`/eitcHadImproperClaims`]: createBooleanWrapper(false),
        [`/eitcImproperClaimsDueToQc`]: createBooleanWrapper(false),
        [`/wasK12Educators`]: createEnumWrapper(`neither`, `/k12EducatorOptions`),
      });
      expect(factGraph.get(Path.concretePath(`/eitcQualified`, null)).complete).toBe(true);
      expect(factGraph.get(Path.concretePath(`/eitcQualified`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isCompleted`, childId)).get).toBe(false);
    });
    it(`is false if we know the filer qualifies for EITC and we don't have the child's TIN and the child has a ATIN`, ({
      task,
    }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/isCompleted`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...eitcQpData,
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_0QC - 1, primaryFilerId),
        [`/familyAndHousehold/#${childId}/tinType`]: createEnumWrapper(`atin`, `/tinTypeOptions`),
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
        [`/eitcQcOfAnother`]: createBooleanWrapper(false),
        [`/eitcHadImproperClaims`]: createBooleanWrapper(false),
        [`/eitcImproperClaimsDueToQc`]: createBooleanWrapper(false),
        [`/wasK12Educators`]: createEnumWrapper(`neither`, `/k12EducatorOptions`),
      });
      expect(factGraph.get(Path.concretePath(`/eitcQualified`, null)).complete).toBe(true);
      expect(factGraph.get(Path.concretePath(`/eitcQualified`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isCompleted`, childId)).get).toBe(false);
    });
    it(`is true if we know the filer qualifies for EITC and we don't have the child's TIN and the child is TINless`, ({
      task,
    }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/isCompleted`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...eitcQpData,
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_0QC - 1, primaryFilerId),
        [`/familyAndHousehold/#${childId}/tinType`]: createEnumWrapper(`none`, `/tinTypeOptions`),
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
        [`/eitcQcOfAnother`]: createBooleanWrapper(false),
        [`/eitcHadImproperClaims`]: createBooleanWrapper(false),
        [`/eitcImproperClaimsDueToQc`]: createBooleanWrapper(false),
        [`/wasK12Educators`]: createEnumWrapper(`neither`, `/k12EducatorOptions`),
      });
      expect(factGraph.get(Path.concretePath(`/eitcQualified`, null)).complete).toBe(true);
      expect(factGraph.get(Path.concretePath(`/eitcQualified`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isCompleted`, childId)).get).toBe(true);
    });
    it(`is false if we know the filer qualifies for EITC and we don't know about the child's PIN status`, ({
      task,
    }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/isCompleted`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...eitcQpData,
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC - 1, primaryFilerId),
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/tin`]: createTinWrapper({ area: `555`, group: `55`, serial: `5555` }),
        [`/eitcQcOfAnother`]: createBooleanWrapper(false),
        [`/eitcHadImproperClaims`]: createBooleanWrapper(false),
        [`/eitcImproperClaimsDueToQc`]: createBooleanWrapper(false),
        [`/wasK12Educators`]: createEnumWrapper(`neither`, `/k12EducatorOptions`),
      });
      expect(factGraph.get(Path.concretePath(`/eitcQualified`, null)).complete).toBe(true);
      expect(factGraph.get(Path.concretePath(`/eitcQualified`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isCompleted`, childId)).get).toBe(false);
    });
    it(`is false if we know the filer qualifies for EITC and we know the child has a PIN but don't have it`, ({
      task,
    }) => {
      task.meta.testedFactPaths = [`/familyAndHousehold/*/isCompleted`];
      const { factGraph } = setupFactGraphDeprecated({
        ...biologicalChildBaseData,
        ...eitcQpData,
        ...makeW2Data(THRESHOLDS.INELIGIBLE_INCOME_EITC_1QC - 1, primaryFilerId),
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/tin`]: createTinWrapper({ area: `555`, group: `55`, serial: `5555` }),
        [`/familyAndHousehold/#${childId}/hasIpPin`]: createBooleanWrapper(true),
        [`/familyAndHousehold/#${childId}/flowIpPinReady`]: createBooleanWrapper(true),
        [`/eitcQcOfAnother`]: createBooleanWrapper(false),
        [`/eitcHadImproperClaims`]: createBooleanWrapper(false),
        [`/eitcImproperClaimsDueToQc`]: createBooleanWrapper(false),
        [`/wasK12Educators`]: createEnumWrapper(`neither`, `/k12EducatorOptions`),
      });
      expect(factGraph.get(Path.concretePath(`/eitcQualified`, null)).complete).toBe(true);
      expect(factGraph.get(Path.concretePath(`/eitcQualified`, null)).get).toBe(true);
      expect(factGraph.get(Path.concretePath(`/familyAndHousehold/*/isCompleted`, childId)).get).toBe(false);
    });
  });
});
