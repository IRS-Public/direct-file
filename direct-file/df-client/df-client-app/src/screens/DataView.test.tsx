import '@testing-library/jest-dom/extend-expect';
import { Provider } from 'react-redux';
import DataView from './DataView.js';
import { initI18n } from '../i18n.js';
import {
  baseFilerData,
  hsaDistributionId,
  incompleteHsaDistributionId1,
  incompleteInterestIncome,
  mfjFilerData,
  mfjPrimaryOnlyWithQualifiedHsaDeductions,
  mfjSecondaryOnlyWithQualifiedHsaDeductions,
  primaryFilerId,
  someIncompleteHsaDistributions,
  spouseId,
  uuid,
} from '../test/testData.js';
import { BrowserRouter } from 'react-router-dom';
import { FactGraphContextProvider } from '../factgraph/FactGraphContext.js';
import { HelmetProvider } from 'react-helmet-async';
import { cleanup, render, screen } from '@testing-library/react';
import en from '../locales/en.yaml';
import flowNodes from '../flow/flow.js';
import { createFlowConfig } from '../flow/flowConfig.js';
import { setupStore } from '../redux/store.js';
import {
  createBooleanWrapper,
  createEnumWrapper,
  createIpPinWrapper,
  createStringWrapper,
} from '../test/persistenceWrappers.js';
import { ReactNode } from 'react';
import { getEmptySystemAlertsMap, SystemAlertContext } from '../context/SystemAlertContext/SystemAlertContext.js';
import * as pageConstants from '../constants/pageConstants.js';
import CollectionItemDataView from './data-view/CollectionItemDataView.js';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    useParams: vi.fn(),
    useNavigate: vi.fn(),
  };
});

vi.mock(`react-router-dom`, async () => {
  const actual = (await vi.importActual(`react-router-dom`)) as object;
  return {
    ...actual,
    useParams: mocks.useParams,
    useNavigate: mocks.useNavigate,
  };
});

vi.spyOn(pageConstants, `getDataImportMode`).mockReturnValue(`clientside-intercept`);

// Some data view components depend on content from the translation file.
// Here I am adding a translation to test these.
// Why Romanian you ask? Well, I needed an actual locale due to our logic
// inside SubSubCategory that calls Intl.DateTimeFormat
const i18next = await initI18n();

i18next.addResourceBundle(`ro`, `translation`, {
  dataviews: {
    anchorLink: `<AnchorLink>(show more)</AnchorLink>`,
    '/flow/you-and-your-family/about-you': {
      '/phone': {
        text: `Phone`,
        externalLink: {
          text: `(edit in <ExternalLink>ID.me</ExternalLink> profile)`,
          url: `https://www.id.me`,
        },
        anchorLink: {
          url: `#to-another-heading`,
        },
      },
    },
  },
});

describe(`Data View`, async () => {
  const flow = createFlowConfig(flowNodes);

  const Wrapper = ({ children }: { children: ReactNode }) => (
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
  );

  for (const [route, subcategory] of flow.subcategoriesByRoute.entries()) {
    // TODO: Enable tests once all content is in place.
    if (subcategory.hasDataView && route === `/flow/you-and-your-family/about-you`) {
      const r = route.replace(/^\/+/g, ``);
      mocks.useParams.mockImplementation(() => ({
        '*': r,
      }));
      it(`renders for ${route} without errors`, () => {
        render(
          <Wrapper>
            <Provider store={setupStore()}>
              <FactGraphContextProvider
                existingFacts={{
                  ...baseFilerData,
                  [`/primaryFilerW2And1099IntInScopedState`]: createEnumWrapper(`ca`, `/scopedStateOptions`),
                  '/filerResidenceAndIncomeState': createEnumWrapper(`ca`, `/scopedStateOptions`),
                  [`/filers/#${primaryFilerId}/hasIpPin`]: createBooleanWrapper(true),
                  [`/filers/#${primaryFilerId}/identityPin`]: createIpPinWrapper(`123456`),
                  [`/filers/#${primaryFilerId}/canBeClaimed`]: createBooleanWrapper(false),
                  [`/receivedAlaskaPfd`]: createBooleanWrapper(false),
                }}
              >
                <DataView />
              </FactGraphContextProvider>
            </Provider>
          </Wrapper>
        );

        const heading = screen.getByRole(`heading`, {
          name: `Review: ` + en.checklist[route].heading,
        });
        expect(heading).toBeInTheDocument();
        subcategory.subSubcategories.forEach((ssc) => {
          const name = en.subsubcategories[ssc.subcategoryRoute][ssc.routeSuffix];
          const sscHeading = screen.getByRole(`heading`, { name });
          expect(sscHeading).toBeInTheDocument();
        });
      });
    }
  }

  describe(`For the alert system on collection hubs`, () => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
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
    );
    it(`renders the alert aggregation when there is a screen with an incomplete`, async () => {
      mocks.useParams.mockImplementation(() => ({
        '*': `flow/you-and-your-family/dependents`,
      }));
      i18next.changeLanguage(`en`);

      const testDependentId = `a02124f4-e942-4b16-856b-b3fc1af26cb4`;
      const baseFactsForTestDependent = {
        [`/filers/#${primaryFilerId}/firstName`]: createStringWrapper(`Test`),
        [`/filers/#${primaryFilerId}/writableMiddleInitial`]: createStringWrapper(`T`),
        [`/filers/#${primaryFilerId}/lastName`]: createStringWrapper(`Testofferson`),
        [`/filers/#${primaryFilerId}/isPrimaryFiler`]: createBooleanWrapper(true),
        '/filers': {
          $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
          item: { items: [primaryFilerId] },
        },
        [`/familyAndHousehold`]: {
          $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
          item: { items: [testDependentId] },
        },
      };

      render(
        <Wrapper>
          <Provider store={setupStore()}>
            <FactGraphContextProvider existingFacts={{ ...baseFactsForTestDependent }} forceNewInstance={true}>
              <DataView />
            </FactGraphContextProvider>
          </Provider>
        </Wrapper>
      );

      const alertHeading = screen.getByRole(`heading`, {
        name: en.aggregateSummaryAlert.incomplete.heading,
      });
      expect(alertHeading).toBeInTheDocument();
      const errorLink = screen.getByRole(`link`, {
        name: en.dataviews[`/flow/you-and-your-family/dependents`].incomplete,
      });
      expect(errorLink).toBeInTheDocument();
    });

    it(`renders an alert for the filers incomplete collection item on the hub`, async () => {
      mocks.useParams.mockImplementation(() => ({
        '*': `flow/income/interest`,
      }));
      i18next.changeLanguage(`en`);

      const facts = {
        ...mfjFilerData,
        ...incompleteInterestIncome,
      };

      render(
        <Wrapper>
          <Provider store={setupStore()}>
            <FactGraphContextProvider existingFacts={facts} forceNewInstance={true}>
              <DataView />
            </FactGraphContextProvider>
          </Provider>
        </Wrapper>
      );
      const alertHeading = screen.getByRole(`heading`, {
        name: en.aggregateSummaryAlert.incomplete.heading,
      });
      expect(alertHeading).toBeInTheDocument();
      const errorLink = screen.getByRole(`link`, {
        name: en.dataviews[`/flow/income/interest`].primaryFiler,
      });
      expect(errorLink).toBeInTheDocument();
    });

    describe(`for inner collection hubs`, () => {
      it(`renders an alert on the subcategory data view for incomplete collection items`, async () => {
        mocks.useParams.mockImplementation(() => ({
          '*': `flow/income/hsa`,
        }));
        i18next.changeLanguage(`en`);

        const facts = {
          ...baseFilerData,
          ...mfjFilerData,
          '/formW2s': {
            $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
            item: { items: [] },
          },
          ...someIncompleteHsaDistributions,
        };
        render(
          <Wrapper>
            <Provider store={setupStore()}>
              <FactGraphContextProvider existingFacts={facts} forceNewInstance={true}>
                <DataView />
              </FactGraphContextProvider>
            </Provider>
          </Wrapper>
        );

        // Has a completeness alert at the top of the page
        const alertHeading = screen.getByRole(`heading`, {
          name: en.aggregateSummaryAlert.incomplete.heading,
        });
        expect(alertHeading).toBeInTheDocument();

        // Links to the distribution section of the HSA subcategory
        const distributionsSectionLink = screen.queryAllByRole(`link`, {
          name: en.subsubcategories[`/flow/income/hsa`].distributions,
        })[0];
        expect(distributionsSectionLink).toBeInTheDocument();
        expect(distributionsSectionLink).toHaveAttribute(`data-path`, `distributions`);

        // Resume link goes to the correct location
        const resumeLink = screen.getByRole(`link`, {
          name: en.dataviews.resume,
        });

        // eslint-disable-next-line max-len
        const correctResumeLocation = `/flow/income/hsa/hsa-distributions-rollovers?%2FhsaDistributions=${incompleteHsaDistributionId1}`;
        expect(resumeLink).toBeInTheDocument();
        expect(resumeLink).toHaveAttribute(`href`, correctResumeLocation);
      });

      it(`does not resume to skipped optional screens`, async () => {
        mocks.useParams.mockImplementation(() => ({
          '*': `flow/income/hsa`,
        }));
        i18next.changeLanguage(`en`);

        const facts = {
          ...baseFilerData,
          ...mfjFilerData,
          '/formW2s': {
            $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
            item: { items: [] },
          },
          ...someIncompleteHsaDistributions,
        };
        render(
          <Wrapper>
            <Provider store={setupStore()}>
              <FactGraphContextProvider existingFacts={facts} forceNewInstance={true}>
                <DataView />
              </FactGraphContextProvider>
            </Provider>
          </Wrapper>
        );
        // Resume link goes to the correct location
        const resumeLink = screen.getByRole(`link`, {
          name: en.dataviews.resume,
        });

        // eslint-disable-next-line max-len
        const firstBlankOptionalScreenForFirstCollectionItem = `/flow/income/hsa/hsa-distributions-add-box2?%2FhsaDistributions=${hsaDistributionId}`;
        expect(resumeLink).toBeInTheDocument();
        expect(resumeLink).not.toHaveAttribute(`href`, firstBlankOptionalScreenForFirstCollectionItem);
      });

      it(`resumes to the same location as the collection item data view`, () => {
        const facts = {
          ...baseFilerData,
          ...mfjFilerData,
          '/formW2s': {
            $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
            item: { items: [] },
          },
          ...someIncompleteHsaDistributions,
        };

        mocks.useParams.mockImplementation(() => ({
          '*': `flow/income/hsa`,
        }));
        i18next.changeLanguage(`en`);
        render(
          <Wrapper>
            <Provider store={setupStore()}>
              <FactGraphContextProvider existingFacts={facts} forceNewInstance={true}>
                <DataView />
              </FactGraphContextProvider>
            </Provider>
          </Wrapper>
        );
        const resumeLink = screen.getByRole(`link`, {
          name: en.dataviews.resume,
        });

        // eslint-disable-next-line max-len
        const dataViewResumeLocation = `/flow/income/hsa/hsa-distributions-rollovers?%2FhsaDistributions=${incompleteHsaDistributionId1}`;
        expect(resumeLink).toBeInTheDocument();
        expect(resumeLink).toHaveAttribute(`href`, dataViewResumeLocation);

        cleanup();

        mocks.useParams.mockImplementation(() => ({
          loopName: `/hsaDistributions`,
          collectionId: incompleteHsaDistributionId1,
        }));
        render(
          <Wrapper>
            <Provider store={setupStore()}>
              <FactGraphContextProvider forceNewInstance existingFacts={facts}>
                <CollectionItemDataView />
              </FactGraphContextProvider>
            </Provider>
          </Wrapper>
        );
        const collectionItemResumeLink = screen.getByRole(`link`, {
          name: en.dataviews.resume,
        });
        expect(collectionItemResumeLink).toBeInTheDocument();
        expect(collectionItemResumeLink).toHaveAttribute(`href`, dataViewResumeLocation);
      });
    });
    describe(`for autoiterating collection hubs`, () => {
      it(`renders a heading level alert for the incomplete collection item`, async () => {
        // HSA coverage and contributions is an autoiterating collection
        mocks.useParams.mockImplementation(() => ({
          '*': `flow/income/hsa`,
        }));
        i18next.changeLanguage(`en`);

        // One of the HSA contributions is incomplete
        const facts = {
          ...mfjPrimaryOnlyWithQualifiedHsaDeductions,
          [`/writableSecondaryFilerHadNonW2HsaActivity`]: createBooleanWrapper(true),
        };
        render(
          <Wrapper>
            <Provider store={setupStore()}>
              <FactGraphContextProvider existingFacts={facts} forceNewInstance={true}>
                <DataView />
              </FactGraphContextProvider>
            </Provider>
          </Wrapper>
        );

        const alertHeading = screen.getByRole(`heading`, {
          name: en.aggregateSummaryAlert.incomplete.heading,
        });
        expect(alertHeading).toBeInTheDocument();
      });
      it(`renders a resume link to the first incomplete collection item`, async () => {
        // HSA coverage and contributions is an autoiterating collection
        mocks.useParams.mockImplementation(() => ({
          '*': `flow/income/hsa`,
        }));
        i18next.changeLanguage(`en`);

        // One of the HSA contributions is incomplete (the second one in the loop)
        const facts = {
          ...mfjSecondaryOnlyWithQualifiedHsaDeductions,
          [`/writablePrimaryFilerHadNonW2HsaActivity`]: createBooleanWrapper(true),
        };
        render(
          <Wrapper>
            <Provider store={setupStore()}>
              <FactGraphContextProvider existingFacts={facts} forceNewInstance={true}>
                <DataView />
              </FactGraphContextProvider>
            </Provider>
          </Wrapper>
        );
        const resumeLink = screen.getByRole(`link`, {
          name: en.dataviews.resume,
        });
        expect(resumeLink).toBeInTheDocument();
        expect(resumeLink).toHaveAttribute(
          `href`,
          `/flow/income/hsa/hsa-contributions-additional-y-n-primary?%2FfilersWithHsa=${uuid}`
        );
      });

      it(`does not resume to optional skipped screens from the previous collection item`, async () => {
        // HSA coverage and contributions is an autoiterating collection
        mocks.useParams.mockImplementation(() => ({
          '*': `flow/income/hsa`,
        }));
        i18next.changeLanguage(`en`);

        // The second of the autoiterating collection items is incomplete and the first
        // is complete but has skipped optional facts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const facts: Record<string, any> = {
          ...mfjPrimaryOnlyWithQualifiedHsaDeductions,
          [`/writableSecondaryFilerHadNonW2HsaActivity`]: createBooleanWrapper(true),
        };
        delete facts[`/filers/#${primaryFilerId}/writableHsaNonemployerContributionsTaxYearPlusOne`];

        render(
          <Wrapper>
            <Provider store={setupStore()}>
              <FactGraphContextProvider existingFacts={facts} forceNewInstance={true}>
                <DataView />
              </FactGraphContextProvider>
            </Provider>
          </Wrapper>
        );

        const resumeLink = screen.getByRole(`link`, {
          name: en.dataviews.resume,
        });

        // Resume link goes to the first incomplete collection item not the skipped optional screen
        expect(resumeLink).toBeInTheDocument();
        expect(resumeLink).toHaveAttribute(
          `href`,
          `/flow/income/hsa/hsa-contributions-additional-y-n-secondary?%2FfilersWithHsa=${spouseId}`
        );
      });
    });
  });
});
