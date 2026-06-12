import { Provider } from 'react-redux';
import { mockUseTranslation } from '../../test/mocks/mockFunctions.js';
import { render, screen } from '@testing-library/react';
import { CollectionLoopRenderer } from './CollectionLoopRenderer.js';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { FactGraphContextProvider } from '../../factgraph/FactGraphContext.js';
import { setupStore } from '../../redux/store.js';
import { createFlowConfig } from '../../flow/flowConfig.js';
import flowNodes from '../../flow/flow.js';
import en from '../../locales/en.yaml';
import {
  createBooleanWrapper,
  createCollectionWrapper,
  createEnumWrapper,
  createTinWrapper,
} from '../../test/persistenceWrappers.js';
import {
  dependentTestData,
  baseDependentId,
  baseDependentData,
  dependentWhoIsNotEligibleButMayQualifyForTaxBenefitsTestData,
  dependentWhoDoesNotQualifyForTaxBenefitsTestdata,
  filerWithW2NoDeductionsNoCreditsBaseData,
  makeW2Data,
  primaryFilerId,
} from '../../test/testData.js';
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

const subSubCategoryRefs = { current: new Map<string, React.MutableRefObject<HTMLHeadingElement>>() };
const headingRefs = { current: new Map<string, React.MutableRefObject<HTMLHeadingElement>>() };

describe(`Collection loop renderer`, () => {
  const flow = createFlowConfig(flowNodes);
  mocks.useParams.mockImplementation(() => ({
    '*': `data-view/flow/you-and-your-family/dependents`,
  }));

  vi.useFakeTimers();
  vi.setSystemTime(new Date(`2024-02-15`));

  afterAll(() => {
    // restoring date after each test run
    vi.useRealTimers();
  });

  const loop = flow.collectionLoopsByName.get(`/familyAndHousehold`);
  expect(loop).toBeDefined();

  if (loop) {
    describe(`Displays the data view assertion for a person who may qualify...`, () => {
      it(`...and is a successfully claimed dependent but the filer has not completed filing or credits`, () => {
        render(
          <Provider store={setupStore()}>
            <BrowserRouter>
              <HelmetProvider context={{}}>
                <FactGraphContextProvider
                  existingFacts={{
                    ...dependentTestData,
                    [`/familyAndHousehold/#${baseDependentId}/tpClaims`]: createBooleanWrapper(true),
                  }}
                >
                  <CollectionLoopRenderer
                    loop={loop}
                    saveAndPersist={vi.fn()}
                    allCollectionItems={[]}
                    subSubCategoryRefs={subSubCategoryRefs}
                    sectionIsComplete={false}
                    headingRefs={headingRefs}
                    collectionItemsWithAlerts={{
                      errors: [],
                      warnings: [],
                    }}
                    postContent={[]}
                  />
                </FactGraphContextProvider>
              </HelmetProvider>
            </BrowserRouter>
          </Provider>
        );

        const assertionText = screen.getByText(
          en.dataviews[`/flow/you-and-your-family/dependents`].assertions[`success-incomplete-filing-and-credits`].brief
        );
        expect(assertionText).toBeInTheDocument();
      });
    });

    it(`...and is a successfully claimed dependent but the filer has not completed credits`, () => {
      render(
        <Provider store={setupStore()}>
          <BrowserRouter>
            <HelmetProvider context={{}}>
              <FactGraphContextProvider
                forceNewInstance
                existingFacts={{
                  ...dependentTestData,
                  [`/familyAndHousehold/#${baseDependentId}/tpClaims`]: createBooleanWrapper(true),
                  [`/filingStatus`]: createEnumWrapper(`headOfHousehold`, `/filingStatusOptions`),
                }}
              >
                <CollectionLoopRenderer
                  loop={loop}
                  saveAndPersist={vi.fn()}
                  subSubCategoryRefs={subSubCategoryRefs}
                  headingRefs={headingRefs}
                  allCollectionItems={[]}
                  sectionIsComplete={false}
                  collectionItemsWithAlerts={{
                    errors: [],
                    warnings: [],
                  }}
                  postContent={[]}
                />
              </FactGraphContextProvider>
            </HelmetProvider>
          </BrowserRouter>
        </Provider>
      );
      const assertionText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].assertions[`base-with-status`].brief
      );
      expect(assertionText).toBeInTheDocument();
    });

    it(`...and is a successfully claimed depedent and the filer has completed filing status and credits`, () => {
      render(
        <Provider store={setupStore()}>
          <BrowserRouter>
            <HelmetProvider context={{}}>
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
                  [`/writableHasPtcQualifyingPlan`]: createBooleanWrapper(false),
                  [`/form1099Rs`]: createCollectionWrapper([]),
                }}
              >
                <CollectionLoopRenderer
                  loop={loop}
                  saveAndPersist={vi.fn()}
                  subSubCategoryRefs={subSubCategoryRefs}
                  allCollectionItems={[]}
                  sectionIsComplete={false}
                  headingRefs={headingRefs}
                  collectionItemsWithAlerts={{
                    errors: [],
                    warnings: [],
                  }}
                  postContent={[]}
                />
              </FactGraphContextProvider>
            </HelmetProvider>
          </BrowserRouter>
        </Provider>
      );

      const assertionText = screen.getByText(
        en.dataviews[`/flow/you-and-your-family/dependents`].assertions[`base-with-status-and-credits`].brief
      );
      expect(assertionText).toBeInTheDocument();
    });

    describe(`Displays the data view assertion for an incomplete dependent`, () => {
      it(`renders successfully`, () => {
        render(
          <Provider store={setupStore()}>
            <BrowserRouter>
              <HelmetProvider context={{}}>
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
                  <CollectionLoopRenderer
                    loop={loop}
                    saveAndPersist={vi.fn()}
                    subSubCategoryRefs={subSubCategoryRefs}
                    allCollectionItems={[]}
                    sectionIsComplete={false}
                    headingRefs={headingRefs}
                    collectionItemsWithAlerts={{
                      errors: [],
                      warnings: [],
                    }}
                    postContent={[]}
                  />
                </FactGraphContextProvider>
              </HelmetProvider>
            </BrowserRouter>
          </Provider>
        );

        const assertionText = screen.getByText(en.dataviews.incompleteSection);
        expect(assertionText).toBeInTheDocument();
      });
    });

    describe(`Displays the data view assertion for a non eligible dependent...`, () => {
      it(`...but qualified person`, () => {
        render(
          <Provider store={setupStore()}>
            <BrowserRouter>
              <HelmetProvider context={{}}>
                <FactGraphContextProvider
                  forceNewInstance
                  existingFacts={dependentWhoIsNotEligibleButMayQualifyForTaxBenefitsTestData}
                >
                  <CollectionLoopRenderer
                    loop={loop}
                    saveAndPersist={vi.fn()}
                    subSubCategoryRefs={subSubCategoryRefs}
                    allCollectionItems={[]}
                    sectionIsComplete={false}
                    headingRefs={headingRefs}
                    collectionItemsWithAlerts={{
                      errors: [],
                      warnings: [],
                    }}
                    postContent={[]}
                  />
                </FactGraphContextProvider>
              </HelmetProvider>
            </BrowserRouter>
          </Provider>
        );
        const assertionText = screen.getByText(
          en.dataviews[`/flow/you-and-your-family/dependents`].assertions[`info-eligible-non-dependent`].brief
        );
        expect(assertionText).toBeInTheDocument();
      });
      it(`...but qualified person with filing status`, () => {
        render(
          <Provider store={setupStore()}>
            <BrowserRouter>
              <HelmetProvider context={{}}>
                <FactGraphContextProvider
                  forceNewInstance
                  existingFacts={{
                    ...dependentWhoIsNotEligibleButMayQualifyForTaxBenefitsTestData,
                    '/filingStatus': createEnumWrapper(`qualifiedSurvivingSpouse`, `/filingStatusOptions`),
                  }}
                >
                  <CollectionLoopRenderer
                    loop={loop}
                    saveAndPersist={vi.fn()}
                    subSubCategoryRefs={subSubCategoryRefs}
                    allCollectionItems={[]}
                    sectionIsComplete={false}
                    headingRefs={headingRefs}
                    collectionItemsWithAlerts={{
                      errors: [],
                      warnings: [],
                    }}
                    postContent={[]}
                  />
                </FactGraphContextProvider>
              </HelmetProvider>
            </BrowserRouter>
          </Provider>
        );

        const assertionText = screen.getByText(
          en.dataviews[`/flow/you-and-your-family/dependents`].assertions[
            `info-eligible-non-dependent-base-with-status`
          ].brief
        );
        expect(assertionText).toBeInTheDocument();
      });

      it(`...but qualified person with filing status and tax credits`, () => {
        render(
          <Provider store={setupStore()}>
            <BrowserRouter>
              <HelmetProvider context={{}}>
                <FactGraphContextProvider
                  forceNewInstance
                  existingFacts={{
                    ...dependentWhoIsNotEligibleButMayQualifyForTaxBenefitsTestData,
                    ...makeW2Data(20000),
                    [`/filers/#${primaryFilerId}/isStudent`]: createBooleanWrapper(true),
                    '/filingStatus': createEnumWrapper(`qualifiedSurvivingSpouse`, `/filingStatusOptions`),
                    [`/familyAndHousehold/#${baseDependentId}/isUsCitizenFullYear`]: createBooleanWrapper(true),
                    [`/familyAndHousehold/#${baseDependentId}/ssnEmploymentValidity`]: createEnumWrapper(
                      `neither`,
                      `/familyAndHouseholdSsnEmploymentValidityOptions`
                    ),
                    [`/familyAndHousehold/#${baseDependentId}/tin`]: createTinWrapper({
                      area: `555`,
                      group: `00`,
                      serial: `5556`,
                    }),
                    [`/familyAndHousehold/#${baseDependentId}/hasIpPin`]: createBooleanWrapper(false),
                    [`/receivedImproperClaims`]: createBooleanWrapper(false),
                    '/eitcQcOfAnother': createBooleanWrapper(false),
                    '/eitcHadImproperClaims': createBooleanWrapper(false),
                    '/wasK12Educators': createEnumWrapper(`neither`, `/k12EducatorOptions`),
                    '/hadStudentLoanInterestPayments': createBooleanWrapper(false),
                    '/interestReports': {
                      $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
                      item: { items: [] },
                    },
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
                  <CollectionLoopRenderer
                    loop={loop}
                    saveAndPersist={vi.fn()}
                    subSubCategoryRefs={subSubCategoryRefs}
                    allCollectionItems={[]}
                    sectionIsComplete={false}
                    headingRefs={headingRefs}
                    collectionItemsWithAlerts={{
                      errors: [],
                      warnings: [],
                    }}
                    postContent={[]}
                  />
                </FactGraphContextProvider>
              </HelmetProvider>
            </BrowserRouter>
          </Provider>
        );
        const assertionText = screen.getByText(
          en.dataviews[`/flow/you-and-your-family/dependents`].assertions[
            `info-eligible-non-dependent-base-with-status-and-credits`
          ].brief
        );
        expect(assertionText).toBeInTheDocument();
      });
    });

    describe(`Displays the data view assertion for a non dependent...`, () => {
      it(`...who does not qualify for benefits`, () => {
        render(
          <Provider store={setupStore()}>
            <BrowserRouter>
              <HelmetProvider context={{}}>
                <FactGraphContextProvider
                  forceNewInstance
                  existingFacts={dependentWhoDoesNotQualifyForTaxBenefitsTestdata}
                >
                  <CollectionLoopRenderer
                    loop={loop}
                    saveAndPersist={vi.fn()}
                    subSubCategoryRefs={subSubCategoryRefs}
                    allCollectionItems={[]}
                    sectionIsComplete={false}
                    headingRefs={headingRefs}
                    collectionItemsWithAlerts={{
                      errors: [],
                      warnings: [],
                    }}
                    postContent={[]}
                  />
                </FactGraphContextProvider>
              </HelmetProvider>
            </BrowserRouter>
          </Provider>
        );

        const assertionText = screen.getByText(
          en.dataviews[`/flow/you-and-your-family/dependents`].assertions[`inactive-does-not-qualify`].brief
        );
        expect(assertionText).toBeInTheDocument();
      });
    });
    describe(`Displays collection card`, () => {
      it(`with label2`, () => {
        render(
          <Provider store={setupStore()}>
            <BrowserRouter>
              <HelmetProvider context={{}}>
                <FactGraphContextProvider
                  forceNewInstance
                  existingFacts={dependentWhoIsNotEligibleButMayQualifyForTaxBenefitsTestData}
                >
                  <CollectionLoopRenderer
                    loop={loop}
                    saveAndPersist={vi.fn()}
                    subSubCategoryRefs={subSubCategoryRefs}
                    allCollectionItems={[]}
                    sectionIsComplete={false}
                    headingRefs={headingRefs}
                    collectionItemsWithAlerts={{
                      errors: [],
                      warnings: [],
                    }}
                    postContent={[]}
                  />
                </FactGraphContextProvider>
              </HelmetProvider>
            </BrowserRouter>
          </Provider>
        );

        const label2 = screen.getByTestId(`cardLabel2`);
        expect(label2).toBeInTheDocument();
      });
      it(`removes label2 when condition 'hideCardLabel2Condition' is set to true`, () => {
        loop.hideCardLabel2Condition = `/familyAndHousehold/*/isUsCitizenFullYear`; // evaluates to true
        render(
          <Provider store={setupStore()}>
            <BrowserRouter>
              <HelmetProvider context={{}}>
                <FactGraphContextProvider
                  forceNewInstance
                  existingFacts={dependentWhoIsNotEligibleButMayQualifyForTaxBenefitsTestData}
                >
                  <CollectionLoopRenderer
                    loop={loop}
                    saveAndPersist={vi.fn()}
                    subSubCategoryRefs={subSubCategoryRefs}
                    allCollectionItems={[]}
                    sectionIsComplete={false}
                    headingRefs={headingRefs}
                    collectionItemsWithAlerts={{
                      errors: [],
                      warnings: [],
                    }}
                    postContent={[]}
                  />
                </FactGraphContextProvider>
              </HelmetProvider>
            </BrowserRouter>
          </Provider>
        );

        const label2 = screen.queryByTestId(`cardLabel2`);
        expect(label2).not.toBeInTheDocument();
      });
      it(`displays label2 when condition 'hideCardLabel2Condition' is set to false`, () => {
        loop.hideCardLabel2Condition = `/familyAndHousehold/*/married`; // evaluates to false
        render(
          <Provider store={setupStore()}>
            <BrowserRouter>
              <HelmetProvider context={{}}>
                <FactGraphContextProvider
                  forceNewInstance
                  existingFacts={dependentWhoIsNotEligibleButMayQualifyForTaxBenefitsTestData}
                >
                  <CollectionLoopRenderer
                    loop={loop}
                    saveAndPersist={vi.fn()}
                    subSubCategoryRefs={subSubCategoryRefs}
                    allCollectionItems={[]}
                    sectionIsComplete={false}
                    headingRefs={headingRefs}
                    collectionItemsWithAlerts={{
                      errors: [],
                      warnings: [],
                    }}
                    postContent={[]}
                  />
                </FactGraphContextProvider>
              </HelmetProvider>
            </BrowserRouter>
          </Provider>
        );

        const label2 = screen.getByTestId(`cardLabel2`);
        expect(label2).toBeInTheDocument();
      });
    });
  }
});
