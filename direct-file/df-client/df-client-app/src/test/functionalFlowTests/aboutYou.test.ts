import { describe, it, expect, Mock } from 'vitest';
import { store } from '../../redux/store.js';
import { Path } from '../../flow/Path.js';
import flowNodes from '../../flow/flow.js';
import { createFlowConfig } from '../../flow/flowConfig.js';
import {
  createAddressWrapper,
  createBooleanWrapper,
  createCollectionWrapper,
  createDayWrapper,
  createEnumWrapper,
  createStringWrapper,
  createTinWrapper,
} from '../persistenceWrappers.js';
import { primaryFilerId, spouseId } from '../testData.js';
import makeGivenFacts from './functionalFlowUtils.js';
import { setupFactGraph } from '../setupFactGraph.js';
import * as pageConstants from '../../constants/pageConstants.js';
import { taxReturnFetch } from '../../redux/slices/tax-return/taxReturnFetch.js';
import { TaxReturn } from '../../types/core.js';
import { CURRENT_TAX_YEAR } from '../../constants/taxConstants.js';
import { v4 as uuidv4 } from 'uuid';
import { fetchTaxReturns } from '../../redux/slices/tax-return/taxReturnSlice.js';
import { fetchProfile } from '../../redux/slices/data-import/dataImportProfileSlice.js';
import { vi } from 'vitest';

vi.mock(`../../redux/slices/tax-return/taxReturnFetch.js`, () => ({
  taxReturnFetch: vi.fn(), // Mock the function
}));

const flow = createFlowConfig(flowNodes);
const givenFacts = makeGivenFacts(flow);

const baseFilerData = {
  [`/filers/#${primaryFilerId}/firstName`]: createStringWrapper(`Test`),
  [`/filers/#${primaryFilerId}/isPrimaryFiler`]: createBooleanWrapper(true),
  '/filers': createCollectionWrapper([primaryFilerId, spouseId]),
  '/address': createAddressWrapper(),
  '/todayOverride': createDayWrapper(`2024-02-01`),
};

const fakeTaxReturn: TaxReturn = {
  taxYear: parseInt(CURRENT_TAX_YEAR),
  createdAt: new Date().toISOString(),
  id: uuidv4(),
  taxReturnSubmissions: [],
  facts: {},
  isEditable: false,
  surveyOptIn: null,
};

// The user of vitest's timers is different from how vitest's docs would suggest. The
// system time in the fact graph doesn't reset if you call vi.useFakeTimers()/vi.useRealTimers()
// in beforeEach/afterEach, so I split the tests into suites based on the timer they use and manually
// call the timer functions at the start and end of the suite. I'm so sorry.

describe(`The about you section`, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`2024-02-01T00:00:01.000-05:00`));
    vi.spyOn(pageConstants, `getDataImportMode`).mockReturnValue(`clientside-intercept`);
    store.dispatch(fetchProfile({ currentTaxReturn: fakeTaxReturn }));
    vi.advanceTimersToNextTimer();
  });

  afterEach(() => vi.useRealTimers());

  describe(`basic info imported flow`, () => {
    it(`intro leads to data preview screen`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-intro`, primaryFilerId, task)
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-data-import`);
    });

    it(`data preview screens lead to breather`, ({ task }) => {
      vi.spyOn(pageConstants, `getDataImportMode`).mockReturnValue(`clientside-intercept`);
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/aboutYouDataWasSaved`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-contact-info-imported`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-breather`);
    });

    it(`breather leads to occupation screen`, ({ task }) => {
      vi.spyOn(pageConstants, `getDataImportMode`).mockReturnValue(`clientside-intercept`);
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/aboutYouDataWasSaved`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-breather`, primaryFilerId, task)
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-occupation`);
    });
  });

  it(`intro leads to data preview screen`, ({ task }) => {
    const { factGraph } = setupFactGraph({
      ...baseFilerData,
    });
    expect(
      givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-intro`, primaryFilerId, task)
    ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-data-import`);
  });

  it(`basic info screen goes to age ko if age is < 16`, ({ task }) => {
    const { factGraph } = setupFactGraph({
      ...baseFilerData,
      [`/filers/#${primaryFilerId}/dateOfBirth`]: createDayWrapper(`2023-10-27`),
      [`/aboutYouDataWasSaved`]: createBooleanWrapper(true),
    });
    expect(
      givenFacts(factGraph).atPath(
        `/flow/you-and-your-family/about-you/about-you-basic-info-imported`,
        primaryFilerId,
        task
      )
    ).toRouteNextTo(`/flow/you-and-your-family/about-you/age-ko`);
  });

  it(`contact into leads you to the occupation screen`, ({ task }) => {
    const { factGraph } = setupFactGraph({
      ...baseFilerData,
    });
    expect(
      givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-breather`, primaryFilerId, task)
    ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-occupation`);
  });

  describe(`citizen flow`, () => {
    it(`can get back to citizenship even after setting it`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-occupation`, primaryFilerId, task)
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-citizenship`);
    });

    it(`if not citizen goes to citizen at end of year`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-citizenship`, primaryFilerId, task)
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-citizen-by-end-ty`);
    });

    it(`if not citizen and citizen at end of year goes to state residency scope`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
        [`/filers/#${primaryFilerId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-citizen-by-end-ty`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-state-residency-scope`);
    });

    it(`if not citizen and not citizen at end of year goes to resident full year`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
        [`/filers/#${primaryFilerId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-citizen-by-end-ty`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-residency`);
    });

    it(`if you are a non citizen and a resident for the entire year, goes to national question`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
        [`/filers/#${primaryFilerId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
        [`/filers/#${primaryFilerId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-residency`, primaryFilerId, task)
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-national`);
    });

    it(`ko'd if not a citizen and not a resident for the entire tax year`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
        [`/filers/#${primaryFilerId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
        [`/filers/#${primaryFilerId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-residency`, primaryFilerId, task)
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-citizen-resident-ko`);
    });

    it(`not ko'd out if citizen and not a resident for the entire tax year`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
        [`/filers/#${primaryFilerId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
        [`/filers/#${primaryFilerId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-citizenship`, primaryFilerId, task)
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-state-residency-scope`);
    });

    it(`not ko'd out if not citizen and not a resident for the entire tax year, but other conditions not met`, ({
      task,
    }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
        [`/filers/#${primaryFilerId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(true),
        [`/filers/#${primaryFilerId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-residency`, primaryFilerId, task)
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-state-residency-scope`);
    });

    it(`from national screen goes to state residency scope regardless of answer choice`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
        [`/filers/#${primaryFilerId}/writableCitizenAtEndOfTaxYear`]: createBooleanWrapper(false),
        [`/filers/#${primaryFilerId}/writableIsNoncitizenResidentFullYear`]: createBooleanWrapper(true),
        [`/filers/#${primaryFilerId}/writableIsNational`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-national`, primaryFilerId, task)
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-state-residency-scope`);

      factGraph.set(Path.concretePath(`/primaryFiler/writableIsNational`, null), false);
      factGraph.save();
      expect(
        givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-national`, primaryFilerId, task)
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-state-residency-scope`);
    });
  });

  describe(`state residency flow`, () => {
    it(`from state residency goes to state income if valid state is chosen`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filerResidenceAndIncomeState`]: createEnumWrapper(`ca`, `/scopedStateOptions`),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-state-residency-scope`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-state-income-form`);
    });

    it(`from state residency goes to ko if more than one is chosen`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filerResidenceAndIncomeState`]: createEnumWrapper(`moreThanOne`, `/scopedStateOptions`),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-state-residency-scope`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-state-income-scope-ko`);
    });

    it(`from state residency goes to ko if none of these is chosen`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filerResidenceAndIncomeState`]: createEnumWrapper(`noneOfThese`, `/scopedStateOptions`),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-state-residency-scope`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-state-income-scope-ko`);
    });

    it(`all inputs on state income form go to APF`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filerResidenceAndIncomeState`]: createEnumWrapper(`ca`, `/scopedStateOptions`),
        [`/primaryFilerW2And1099IntInScopedState`]: createEnumWrapper(
          `onlySame`,
          `/primaryFilerW2And1099IntStateOptions`
        ),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-state-income-form`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-state-income-1099-misc-pfd`);
    });

    it(`goes from APF to knockout if there is W2 or 1099-INT income for another state`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filerResidenceAndIncomeState`]: createEnumWrapper(`ca`, `/scopedStateOptions`),
        [`/primaryFilerW2And1099IntInScopedState`]: createEnumWrapper(
          `anotherState`,
          `/primaryFilerW2And1099IntStateOptions`
        ),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-state-income-1099-misc-pfd`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-state-income-scope-ko`);
    });

    it(`goes from APF to breather if you have APF and are from Alaska`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filerResidenceAndIncomeState`]: createEnumWrapper(`ak`, `/scopedStateOptions`),
        [`/primaryFilerW2And1099IntInScopedState`]: createEnumWrapper(`onlySame`, `/incomeStateOptions`),
        [`/receivedAlaskaPfd`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-state-income-1099-misc-pfd`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-breather-1099-misc-pfd`);
    });

    it(`goes from APF to breather if you have no APF and are from Alaska`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filerResidenceAndIncomeState`]: createEnumWrapper(`ak`, `/scopedStateOptions`),
        [`/primaryFilerW2And1099IntInScopedState`]: createEnumWrapper(
          `onlySame`,
          `/primaryFilerW2And1099IntStateOptions`
        ),
        [`/receivedAlaskaPfd`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-state-income-1099-misc-pfd`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-breather-1099-misc-pfd`);
    });

    it(`goes from APF to knockout if you have APF but are not from Alaska`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filerResidenceAndIncomeState`]: createEnumWrapper(`ca`, `/scopedStateOptions`),
        [`/primaryFilerW2And1099IntInScopedState`]: createEnumWrapper(`onlySame`, `/incomeStateOptions`),
        [`/receivedAlaskaPfd`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-state-income-1099-misc-pfd`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-state-income-scope-ko`);
    });

    it(`moves to the TIN from the state income form`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-state-income-form`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-tin`);
    });

    it(`moves to the SSN validation question from the TIN`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
        [`/filers/#${primaryFilerId}/tin`]: createTinWrapper({ area: `555`, group: `55`, serial: `5555` }),
      });
      givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-tin`, primaryFilerId, task);
      expect(
        givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-tin`, primaryFilerId, task)
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-ssn-valid-for-work`);
    });

    it(`moves to the IP PIN choice question from the TIN`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
      });
      expect(
        givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-tin`, primaryFilerId, task)
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-ip-pin-input-review`);
    });

    it(`moves to IP PIN choice from valid SSN for work`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/isUsCitizenFullYear`]: createBooleanWrapper(false),
        [`/filers/#${primaryFilerId}/tin`]: createTinWrapper({ area: `222`, group: `12`, serial: `1234` }),
        [`/primaryFilerSsnEmploymentValidity`]: createEnumWrapper(`neither`, `/ssnEmploymentValidityOptions`),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-ssn-valid-for-work`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-ip-pin-input-review`);
    });

    it(`moves to IP PIN readonly input if data import has an IP PIN value`, async ({ task }) => {
      vi.spyOn(pageConstants, `isTelemetryEnabled`).mockReturnValue(false);
      (taxReturnFetch as Mock).mockReturnValue(Promise.resolve([fakeTaxReturn]));
      store.dispatch(fetchTaxReturns());
      await vi.runAllTimersAsync();

      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/hasIpPin`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-ssn-valid-for-work`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-ip-pin-input-review`);
    });
  });

  it(`goes from blind question to self care question`, ({ task }) => {
    const { factGraph } = setupFactGraph({
      ...baseFilerData,
    });
    expect(
      givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-blind`, primaryFilerId, task)
    ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-self-care`);
  });

  it(`goes from self care question to student question`, ({ task }) => {
    const { factGraph } = setupFactGraph({
      ...baseFilerData,
    });
    expect(
      givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-self-care`, primaryFilerId, task)
    ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-student`);
  });

  it(`goes from student question to can you be claimed question`, ({ task }) => {
    const { factGraph } = setupFactGraph({
      ...baseFilerData,
    });
    expect(
      givenFacts(factGraph).atPath(`/flow/you-and-your-family/about-you/about-you-student`, primaryFilerId, task)
    ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-could-be-claimed`);
  });

  describe(`dependent flow`, () => {
    it(`goes from could be claimed to checklist if the answer is no`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-could-be-claimed`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/data-view/flow/you-and-your-family/about-you`);
    });

    it(`goes from could be claimed to if they are required to claim question if the answer is yes`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(true),
      });
      const startPath = `/flow/you-and-your-family/about-you/about-you-could-be-claimed`;
      expect(givenFacts(factGraph).atPath(startPath, primaryFilerId, task)).toRouteNextTo(
        `/flow/you-and-your-family/about-you/about-you-claimer-filing-requirement`
      );
    });

    it(`goes from required to claim question to will be claimed question if the answer is yes`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(true),
        [`/filers/#${primaryFilerId}/potentialClaimerMustFile`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-claimer-filing-requirement`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-will-be-claimed`);
    });

    it(`goes from required to claim question to are they filing question if the answer is no`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(true),
        [`/filers/#${primaryFilerId}/potentialClaimerMustFile`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-claimer-filing-requirement`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-claimer-filing`);
    });

    it(`goes from are they filing question to checklist if the answer is no`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(true),
        [`/filers/#${primaryFilerId}/potentialClaimerMustFile`]: createBooleanWrapper(false),
        [`/filers/#${primaryFilerId}/potentialClaimerDidFile`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-claimer-filing`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/data-view/flow/you-and-your-family/about-you`);
    });

    it(`goes from are they filing question to returns questions if the answer is yes`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(true),
        [`/filers/#${primaryFilerId}/potentialClaimerMustFile`]: createBooleanWrapper(false),
        [`/filers/#${primaryFilerId}/potentialClaimerDidFile`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-claimer-filing`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-claimers-return`);
    });

    it(`goes from returns question to checklist if the answer is yes`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(true),
        [`/filers/#${primaryFilerId}/potentialClaimerMustFile`]: createBooleanWrapper(false),
        [`/filers/#${primaryFilerId}/potentialClaimerDidFile`]: createBooleanWrapper(true),
        [`/primaryFilerPotentialClaimerFiledOnlyForRefund`]: createBooleanWrapper(true),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-claimers-return`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/data-view/flow/you-and-your-family/about-you`);
    });

    it(`goes from returns question to will be claimed if the answer is no`, ({ task }) => {
      const { factGraph } = setupFactGraph({
        ...baseFilerData,
        [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(true),
        [`/filers/#${primaryFilerId}/potentialClaimerMustFile`]: createBooleanWrapper(false),
        [`/filers/#${primaryFilerId}/potentialClaimerDidFile`]: createBooleanWrapper(true),
        [`/primaryFilerPotentialClaimerFiledOnlyForRefund`]: createBooleanWrapper(false),
      });
      expect(
        givenFacts(factGraph).atPath(
          `/flow/you-and-your-family/about-you/about-you-claimers-return`,
          primaryFilerId,
          task
        )
      ).toRouteNextTo(`/flow/you-and-your-family/about-you/about-you-will-be-claimed`);
    });
  });
});
