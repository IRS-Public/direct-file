import { mockUseTranslation } from '../../test/mocks/mockFunctions.js';
import { cleanup, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { FactGraphContextProvider } from '../../factgraph/FactGraphContext.js';
import en from '../../locales/en.yaml';
import { createBooleanWrapper, createEnumWrapper, createTinWrapper } from '../../test/persistenceWrappers.js';
import {
  dependentTestData,
  baseDependentId,
  baseDependentData,
  dependentWhoIsNotEligibleButMayQualifyForTaxBenefitsTestData,
  dependentWhoDoesNotQualifyForTaxBenefitsTestdata,
  filerWithW2NoDeductionsNoCreditsBaseData,
  makeW2Data,
  primaryFilerId,
  incompleteInterestId,
  mfjFilerData,
  incompleteInterestIncome,
  baseFilerData,
} from '../../test/testData.js';
import CollectionItemDataView from './CollectionItemDataView.js';
import { SystemAlertContext, getEmptySystemAlertsMap } from '../../context/SystemAlertContext/SystemAlertContext.js';
import { setupStore } from '../../redux/store.js';
import { ReactNode } from 'react';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    useParams: vi.fn(),
  };
});

// This mock allows for testing of any component that is rendered using the
// useTranslation hook from react-i18next.
vi.mock(`react-i18next`, () => {
  return {
    Trans: ({ i18nKey }: { i18nKey: string | string[] }) => mockUseTranslation().t(i18nKey),
    i18n: { exists: () => true },
    useTranslation: mockUseTranslation,
    initReactI18next: {
      type: `3rdParty`,
      init: () => {},
    },
  };
});

vi.mock(`../../hooks/useTranslateWithFacts`, async () => {
  return {
    default: () => {
      return {
        t: vi.fn().mockReturnValue(`fact data`),
        contextHasData: vi.fn(),
      };
    },
  };
});

vi.mock(`react-router-dom`, async () => {
  const actual = (await vi.importActual(`react-router-dom`)) as object;
  return {
    ...actual,
    useParams: mocks.useParams,
  };
});

describe(`Collection item data view for dependents`, () => {
  mocks.useParams.mockImplementation(() => ({
    loopName: `/familyAndHousehold`,
    collectionId: baseDependentId,
  }));

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`2024-02-15`));
  });

  afterAll(() => {
    // restoring date after each test run
    vi.useRealTimers();
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={setupStore()}>
      <BrowserRouter>
        <HelmetProvider context={{}}>
          <SystemAlertContext.Provider
            value={{
              systemAlerts: getEmptySystemAlertsMap(),
              setSystemAlert: vi.fn(),
              deleteSystemAlert: vi.fn(),
            }}
          >
            {children}
          </SystemAlertContext.Provider>
        </HelmetProvider>
      </BrowserRouter>
    </Provider>
  );

  describe(`Displays the item's data view assertion for a person who may qualify...`, () => {
    it(`...and is a successfully claimed dependent but the filer has not completed filing or credits`, () => {
      render(
        <Wrapper>
          <FactGraphContextProvider
            existingFacts={{
              ...dependentTestData,
              [`/familyAndHousehold/#${baseDependentId}/tpClaims`]: createBooleanWrapper(true),
              [`/familyAndHousehold/#${baseDependentId}/writableCouldBeQualifyingChildOfAnother`]:
                createBooleanWrapper(false),
            }}
          >
            <CollectionItemDataView />
          </FactGraphContextProvider>
        </Wrapper>
      );

      const resultText = screen.getByText(en.dataviews[`/flow/you-and-your-family/dependents`].results.success.brief);
      expect(resultText).toBeInTheDocument();
      const assertionText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].assertions[`success-incomplete-filing-and-credits`].full
      );
      expect(assertionText).toBeInTheDocument();
      const fullResultText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].results.success.full
      );
      expect(fullResultText).toBeInTheDocument();
    });

    it(`...and is a successfully claimed dependent but the filer has not completed credits`, () => {
      render(
        <Wrapper>
          <FactGraphContextProvider
            forceNewInstance
            existingFacts={{
              ...dependentTestData,
              [`/familyAndHousehold/#${baseDependentId}/tpClaims`]: createBooleanWrapper(true),
              [`/filingStatus`]: createEnumWrapper(`headOfHousehold`, `/filingStatusOptions`),
              [`/familyAndHousehold/#${baseDependentId}/writableCouldBeQualifyingChildOfAnother`]:
                createBooleanWrapper(false),
            }}
          >
            <CollectionItemDataView />
          </FactGraphContextProvider>
        </Wrapper>
      );

      const resultText = screen.getByText(en.dataviews[`/flow/you-and-your-family/dependents`].results.success.brief);
      expect(resultText).toBeInTheDocument();
      const assertionText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].assertions[`base-with-status`].full
      );
      expect(assertionText).toBeInTheDocument();
      const fullResultText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].results.success.full
      );
      expect(fullResultText).toBeInTheDocument();
    });

    it(`...and is a successfully claimed dependent and the filer has completed filing status and credits`, () => {
      render(
        <Wrapper>
          <FactGraphContextProvider
            forceNewInstance
            existingFacts={{
              ...dependentTestData,
              [`/filers/#${primaryFilerId}/isStudent`]: createBooleanWrapper(true),
              [`/familyAndHousehold/#${baseDependentId}/tpClaims`]: createBooleanWrapper(true),
              [`/filingStatus`]: createEnumWrapper(`headOfHousehold`, `/filingStatusOptions`),
              [`/flowHasSeenCreditsIntroNoCredits`]: createBooleanWrapper(true),
              ...makeW2Data(160000),
              [`/familyAndHousehold/#${baseDependentId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
              [`/familyAndHousehold/#${baseDependentId}/ssnEmploymentValidity`]: createEnumWrapper(
                `neither`,
                `/familyAndHouseholdSsnEmploymentValidityOptions`
              ),
              [`/receivedImproperClaims`]: createBooleanWrapper(false),
              [`/writableCdccHasQualifyingExpenses`]: createBooleanWrapper(false),
              [`/familyAndHousehold/#${baseDependentId}/writableCouldBeQualifyingChildOfAnother`]:
                createBooleanWrapper(false),
              '/form1099Rs': { $type: `gov.irs.factgraph.persisters.CollectionWrapper`, item: { items: [] } },
              [`/writableHasPtcQualifyingPlan`]: createBooleanWrapper(false),
            }}
          >
            <CollectionItemDataView />
          </FactGraphContextProvider>
        </Wrapper>
      );

      const resultText = screen.getByText(en.dataviews[`/flow/you-and-your-family/dependents`].results.success.brief);
      expect(resultText).toBeInTheDocument();
      const assertionText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].assertions[`base-with-status-and-credits`].full
      );
      expect(assertionText).toBeInTheDocument();
      const fullResultText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].results.success.full
      );
      expect(fullResultText).toBeInTheDocument();
    });
  });

  describe(`Displays the data view assertion for an incomplete dependent`, () => {
    it(`renders successfully`, () => {
      render(
        <Wrapper>
          <FactGraphContextProvider
            forceNewInstance
            existingFacts={{
              ...baseDependentData,
              ...filerWithW2NoDeductionsNoCreditsBaseData,
              '/familyAndHousehold': {
                $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
                item: {
                  items: [baseDependentId],
                },
              },
            }}
          >
            <CollectionItemDataView />
          </FactGraphContextProvider>
        </Wrapper>
      );

      const assertionText = screen.getByText(en.dataviews.incomplete);
      expect(assertionText).toBeInTheDocument();
    });
  });

  describe(`Displays the data view assertion for a non eligible dependent...`, () => {
    it(`...but qualified person`, () => {
      render(
        <Wrapper>
          <FactGraphContextProvider
            forceNewInstance
            existingFacts={dependentWhoIsNotEligibleButMayQualifyForTaxBenefitsTestData}
          >
            <CollectionItemDataView />
          </FactGraphContextProvider>
        </Wrapper>
      );

      const resultText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].results.failure[`brief-may-qualify`]
      );
      expect(resultText).toBeInTheDocument();
      const assertionText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].assertions[`info-eligible-non-dependent`].full
      );
      expect(assertionText).toBeInTheDocument();
      const outcomeHeading = screen.getByRole(`heading`, { name: en.dataviews.result });
      expect(outcomeHeading).toBeInTheDocument();
      const outcomeText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].results.failure[`full-may-qualify`]
      );
      expect(outcomeText).toBeInTheDocument();
    });

    it(`...but qualified person with filing status`, () => {
      render(
        <Wrapper>
          <FactGraphContextProvider
            forceNewInstance
            existingFacts={{
              ...dependentWhoIsNotEligibleButMayQualifyForTaxBenefitsTestData,
              '/filingStatus': createEnumWrapper(`qualifiedSurvivingSpouse`, `/filingStatusOptions`),
            }}
          >
            <CollectionItemDataView />
          </FactGraphContextProvider>
        </Wrapper>
      );
      const resultText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].results.failure[`brief-may-qualify`]
      );
      expect(resultText).toBeInTheDocument();
      const assertionText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].assertions[`info-eligible-non-dependent-base-with-status`]
          .full
      );
      expect(assertionText).toBeInTheDocument();
      const outcomeHeading = screen.getByRole(`heading`, { name: en.dataviews.result });
      expect(outcomeHeading).toBeInTheDocument();
      const outcomeText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].results.failure[`full-may-qualify`]
      );
      expect(outcomeText).toBeInTheDocument();
    });

    it(`...but qualified person with filing status and tax credits`, () => {
      render(
        <Wrapper>
          <FactGraphContextProvider
            forceNewInstance
            existingFacts={{
              ...dependentWhoIsNotEligibleButMayQualifyForTaxBenefitsTestData,
              ...makeW2Data(20000),
              '/filingStatus': createEnumWrapper(`qualifiedSurvivingSpouse`, `/filingStatusOptions`),
              [`/filers/#${primaryFilerId}/isStudent`]: createBooleanWrapper(true),
              [`/familyAndHousehold/#${baseDependentId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
              [`/familyAndHousehold/#${baseDependentId}/tin`]: createTinWrapper({
                area: `555`,
                group: `00`,
                serial: `5556`,
              }),
              [`/familyAndHousehold/#${baseDependentId}/hasIpPin`]: createBooleanWrapper(false),
              [`/familyAndHousehold/#${baseDependentId}/ssnEmploymentValidity`]: createEnumWrapper(
                `neither`,
                `/familyAndHouseholdSsnEmploymentValidityOptions`
              ),
              [`/receivedImproperClaims`]: createBooleanWrapper(false),
              '/eitcQcOfAnother': createBooleanWrapper(false),
              '/writableCdccHasQualifyingExpenses': createBooleanWrapper(false),
              '/eitcHadImproperClaims': createBooleanWrapper(false),
              '/wasK12Educators': createEnumWrapper(`neither`, `/k12EducatorOptions`),
              '/hadStudentLoanInterestPayments': createBooleanWrapper(false),
              '/interestReports': { $type: `gov.irs.factgraph.persisters.CollectionWrapper`, item: { items: [] } },
              '/socialSecurityReports': {
                $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
                item: { items: [] },
              },
              '/form1099Gs': { $type: `gov.irs.factgraph.persisters.CollectionWrapper`, item: { items: [] } },
              '/form1099Rs': { $type: `gov.irs.factgraph.persisters.CollectionWrapper`, item: { items: [] } },
              [`/hasForeignAccounts`]: createBooleanWrapper(false),
              [`/isForeignTrustsGrantor`]: createBooleanWrapper(false),
              [`/hasForeignTrustsTransactions`]: createBooleanWrapper(false),
              [`/writableHasPtcQualifyingPlan`]: createBooleanWrapper(false),
            }}
          >
            <CollectionItemDataView />
          </FactGraphContextProvider>
        </Wrapper>
      );
      const resultText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].results.failure[`brief-may-qualify`]
      );
      expect(resultText).toBeInTheDocument();
      const assertionText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].assertions[
          `info-eligible-non-dependent-base-with-status-and-credits`
        ].full
      );
      expect(assertionText).toBeInTheDocument();
      const outcomeHeading = screen.getByRole(`heading`, { name: en.dataviews.result });
      expect(outcomeHeading).toBeInTheDocument();
      const outcomeText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].results.failure[`full-may-qualify`]
      );
      expect(outcomeText).toBeInTheDocument();
    });
  });

  describe(`Displays the data view assertion for a non dependent...`, () => {
    it(`...who does not qualify for benefits`, () => {
      render(
        <Wrapper>
          <FactGraphContextProvider forceNewInstance existingFacts={dependentWhoDoesNotQualifyForTaxBenefitsTestdata}>
            <CollectionItemDataView />
          </FactGraphContextProvider>
        </Wrapper>
      );
      const resultText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].results.failure[`brief-no-benefits`]
      );
      expect(resultText).toBeInTheDocument();
      const assertionText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].assertions[`inactive-does-not-qualify`].full
      );
      expect(assertionText).toBeInTheDocument();
      const outcomeHeading = screen.getByRole(`heading`, { name: en.dataviews.result });
      expect(outcomeHeading).toBeInTheDocument();
      const outcomeText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].results.failure[`full-no-benefits`]
      );
      expect(outcomeText).toBeInTheDocument();
    });
  });

  describe(`For the alert system`, () => {
    it(`renders the alert aggregation when there is a screen with an incomplete`, async () => {
      render(
        <Wrapper>
          <FactGraphContextProvider forceNewInstance existingFacts={dependentTestData}>
            <CollectionItemDataView />
          </FactGraphContextProvider>
        </Wrapper>
      );

      const alertHeading = screen.queryAllByRole(`heading`, {
        name: en.summaryAlert.incomplete.heading,
        level: 2,
      })[0];
      expect(alertHeading).toBeInTheDocument();
      const errorLinkWithPrimaryKey = screen.getByRole(`link`, {
        name: `{{/familyAndHousehold/*/firstName}}’s basic information`,
      });
      expect(errorLinkWithPrimaryKey).toBeInTheDocument();
    });
  });
});

describe(`For the alert system`, () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`2024-02-15`));
  });

  afterAll(() => {
    // restoring date after each test run
    vi.useRealTimers();
    cleanup();
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={setupStore()}>
      <BrowserRouter>
        <HelmetProvider context={{}}>
          <SystemAlertContext.Provider
            value={{
              systemAlerts: getEmptySystemAlertsMap(),
              setSystemAlert: vi.fn(),
              deleteSystemAlert: vi.fn(),
            }}
          >
            {children}
          </SystemAlertContext.Provider>
        </HelmetProvider>
      </BrowserRouter>
    </Provider>
  );
  it(`renders an alert for the first screen that hasn't been seen even if the 
    screen has an optional field`, async () => {
    mocks.useParams.mockImplementation(() => ({
      loopName: `/interestReports`,
      collectionId: incompleteInterestId,
    }));
    const facts = {
      ...baseFilerData,
      ...mfjFilerData,
      ...incompleteInterestIncome,
    };

    render(
      <Wrapper>
        <FactGraphContextProvider forceNewInstance existingFacts={facts}>
          <CollectionItemDataView />
        </FactGraphContextProvider>
      </Wrapper>
    );

    // Has the top banner alert
    const alertHeading = screen.queryAllByRole(`heading`, {
      name: en.aggregateSummaryAlert.incomplete.heading,
    })[0];
    expect(alertHeading).toBeInTheDocument();

    // Has a link to resume the flow
    const errorLink = screen.getByRole(`link`, {
      name: en.dataviews.resume,
    });
    expect(errorLink).toBeInTheDocument();

    // The resume link should route the user to the first screen the user hasn't seen (even if it is an optional field)
    const firstIncompleteScreen = `/flow/income/interest/1099-int-add-box-1`;
    expect(errorLink).toHaveAttribute(`href`, `${firstIncompleteScreen}?%2FinterestReports=${incompleteInterestId}`);
  });
});
