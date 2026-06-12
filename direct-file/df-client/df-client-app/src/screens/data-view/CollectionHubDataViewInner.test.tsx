import { beforeEach, it, describe, expect } from 'vitest';
import { Provider } from 'react-redux';

import { Flow, Category, Subcategory, Screen, CollectionLoop, SubSubcategory } from '../../flow/flowDeclarations.js';
import {
  Heading,
  InfoDisplay,
  GenericString,
  SaveAndOrContinueButton,
  CollectionItemManager,
} from '../../flow/ContentDeclarations.js';
import { FlowConfig, createFlowConfig } from '../../flow/flowConfig.js';
import { MutableRefObject } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { cleanup, render, screen, within } from '@testing-library/react';
import { FactGraphContextProvider } from '../../factgraph/FactGraphContext.js';
import { setupStore } from '../../redux/store.js';
import en from '../../locales/en.yaml';

import { baseFilerData, primaryFilerId, makeSocialSecurityReport } from '../../test/testData.js';
import CollectionHubDataView from './CollectionHubDataView.js';
import { initI18n } from '../../i18n.js';
import { vi } from 'vitest';

const ssReportId1 = `423bef54-e524-463c-829f-0948df47a4bd`;
const ssReportId2 = `08eea4dd-c0ee-4128-9afc-2b74dca27101`;

const flow = (
  <Flow>
    <Category route='income'>
      <Subcategory route='parent1' completeIf='/creditsSectionComplete'>
        {/* Inner Collection Hub Location 1 */}
        <SubSubcategory
          route='social-security'
          completeIf='/socialSecurityReportsIsDone'
          collectionContext='/socialSecurityReports'
        >
          <Screen route='social-security-loop-intro'>
            <Heading i18nKey='/foo' />
            <InfoDisplay i18nKey='/info/income/social-security/intro' />
            <CollectionItemManager
              path='/socialSecurityReports'
              loopName='loc1-social-security'
              donePath='/socialSecurityReportsIsDone'
            />
          </Screen>
          <CollectionLoop
            loopName='loc1-social-security'
            collection='/socialSecurityReports'
            collectionItemCompletedCondition='/socialSecurityReports/*/isComplete'
            isInner={true}
            donePath='/socialSecurityReportsIsDone'
          >
            <SubSubcategory route='benefit-income-basic-info'>
              <Screen route='ssa-whose'>
                <Heading i18nKey='/heading/income/other-income/social-security/add-whose-ss' />
                <InfoDisplay i18nKey='/info/credits-and-deductions/care-providers/provider-bus-or-indiv' />
                <GenericString path='/socialSecurityReports/*/filer/fullName' displayOnlyOn='data-view' />
                <SaveAndOrContinueButton />
              </Screen>
            </SubSubcategory>
          </CollectionLoop>
        </SubSubcategory>
      </Subcategory>
      <Subcategory route='parent2' completeIf='/creditsSectionComplete'>
        {/* Inner Collection Hub Location 2 */}
        <SubSubcategory
          route='social-security'
          completeIf='/socialSecurityReportsIsDone'
          collectionContext='/socialSecurityReports'
        >
          <Screen route='social-security-loop-intro'>
            <Heading i18nKey='/foo' />
            <InfoDisplay i18nKey='/info/income/social-security/intro' />
            <CollectionItemManager
              path='/socialSecurityReports'
              loopName='loc1-social-security'
              donePath='/socialSecurityReportsIsDone'
            />
          </Screen>
          <CollectionLoop
            loopName='loc2-social-security'
            collection='/socialSecurityReports'
            collectionItemCompletedCondition='/socialSecurityReports/*/isComplete'
            isInner={true}
            donePath='/socialSecurityReportsIsDone'
          >
            <SubSubcategory route='benefit-income-basic-info'>
              <Screen route='ssa-whose'>
                <Heading i18nKey='/heading/income/other-income/social-security/add-whose-ss' />
                <InfoDisplay i18nKey='/info/credits-and-deductions/care-providers/provider-bus-or-indiv' />
                <GenericString path='/socialSecurityReports/*/filer/fullName' displayOnlyOn='data-view' />
                <SaveAndOrContinueButton />
              </Screen>
            </SubSubcategory>
          </CollectionLoop>
        </SubSubcategory>
      </Subcategory>
    </Category>
  </Flow>
);

/* Translation mocks */
vi.mock(`../../hooks/useTranslationContextFromFacts`, () => ({
  default: () => () => ({
    [`/socialSecurityReports/*/formTypeLong`]: `Social Security Benefit`,
  }),
}));

const i18next = await initI18n();
i18next.addResourceBundle(`en`, `translation`, en);
i18next.changeLanguage(`en`);

/* End of translation mocks */

vi.mock(`../../hooks/useIsReturnEditable.js`, () => ({
  useIsReturnEditable: vi.fn().mockReturnValue({ isReturnEditable: true }),
}));

describe(`Inner Collection Hub`, () => {
  interface LocalTestContext {
    flowConfig: FlowConfig;
    facts: object;
  }

  const subSubCategoryRefs = { current: new Map<string, MutableRefObject<HTMLHeadingElement>>() };
  const headingRefs = { current: new Map<string, MutableRefObject<HTMLHeadingElement>>() };

  describe(`in edit mode`, () => {
    beforeEach<LocalTestContext>((context) => {
      // Create a social security report collection with two items
      context.facts = {
        ...baseFilerData,
        ...makeSocialSecurityReport(1000, ssReportId1, primaryFilerId),
        ...makeSocialSecurityReport(1000, ssReportId2, primaryFilerId),
        [`/socialSecurityReports`]: {
          $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
          item: { items: [ssReportId1, ssReportId2] },
        },
        '/socialSecurityReportsIsDone': {
          $type: `gov.irs.factgraph.persisters.BooleanWrapper`,
          item: true,
        },
      };
      context.flowConfig = createFlowConfig(flow);
    });
    afterEach(() => {
      cleanup();
    });

    // Test same collection in 2 locations
    [1, 2].forEach((loopInstance) => {
      const loopName = `loc${loopInstance}-social-security`;
      it<LocalTestContext>(`location ${loopInstance} full variant should render all the cards`, ({
        flowConfig,
        facts,
      }) => {
        const collectionLoop = flowConfig.collectionLoopsByName.get(loopName);
        if (!collectionLoop) {
          throw new Error(`No collection loop found`);
        }
        render(
          <Provider store={setupStore()}>
            <BrowserRouter>
              <FactGraphContextProvider forceNewInstance existingFacts={facts}>
                <CollectionHubDataView
                  collectionLoop={collectionLoop}
                  variant='full'
                  subSubCategoryRefs={subSubCategoryRefs}
                  headingRefs={headingRefs}
                  flow={flowConfig}
                />
              </FactGraphContextProvider>
            </BrowserRouter>
          </Provider>
        );
        const listItems = screen.getAllByTestId(`Card`);
        expect(listItems).toHaveLength(2);

        // Check first card details
        const card = listItems[0];
        const heading = within(card).getByRole(`heading`);
        expect(heading).toHaveTextContent(/.*Social Security Benefit/i);

        // Expect card link to go to the collection item
        const link = within(card).getByRole(`link`);
        expect(link).toHaveAttribute(`href`, `/data-view/loop/${loopName}/${ssReportId1}/?reviewMode=true`);
      });

      it<LocalTestContext>(`location ${loopInstance} full variant should render 2 buttons add and done buttons`, ({
        flowConfig,
        facts,
      }) => {
        const collectionLoop = flowConfig.collectionLoopsByName.get(loopName);
        if (!collectionLoop) {
          throw new Error(`No collection loop found`);
        }
        render(
          <Provider store={setupStore()}>
            <BrowserRouter>
              <FactGraphContextProvider forceNewInstance existingFacts={facts}>
                <CollectionHubDataView
                  collectionLoop={collectionLoop}
                  variant='full'
                  subSubCategoryRefs={subSubCategoryRefs}
                  headingRefs={headingRefs}
                  flow={flowConfig}
                />
              </FactGraphContextProvider>
            </BrowserRouter>
          </Provider>
        );

        const buttons = screen.getAllByRole(`button`);
        expect(buttons).toHaveLength(3);

        // Should have 3 buttons
        expect(buttons[0]).toHaveTextContent(`Add Social Security income`);
        expect(buttons[1]).toHaveTextContent(`Go to checklist./flow/income/parent${loopInstance}.heading`);
        expect(buttons[2]).toHaveTextContent(`Go to checklist`);
      });

      it<LocalTestContext>(`location ${loopInstance} nested variant should only render linked heading`, ({
        flowConfig,
        facts,
      }) => {
        const collectionLoop = flowConfig.collectionLoopsByName.get(loopName);
        if (!collectionLoop) {
          throw new Error(`No collection loop found`);
        }
        render(
          <Provider store={setupStore()}>
            <BrowserRouter>
              <FactGraphContextProvider forceNewInstance existingFacts={facts}>
                <CollectionHubDataView
                  collectionLoop={collectionLoop}
                  variant='nested'
                  subSubCategoryRefs={subSubCategoryRefs}
                  headingRefs={headingRefs}
                  flow={flowConfig}
                />
              </FactGraphContextProvider>
            </BrowserRouter>
          </Provider>
        );
        const buttons = screen.queryAllByRole(`button`);
        expect(buttons).toHaveLength(0);

        const heading = screen.getByRole(`heading`);
        expect(heading).toHaveTextContent(`dataviews./flow/income/parent${loopInstance}/social-security.heading`);

        // Expect link to go to collection hub
        const link = screen.getByRole(`link`);
        expect(link).toHaveAttribute(`href`, `/data-view/flow/income/parent${loopInstance}/social-security`);
      });
    });
  });

  describe(`in review mode`, () => {
    beforeEach<LocalTestContext>((context) => {
      // Create a social security report collection with two items
      context.facts = {
        ...baseFilerData,
        ...makeSocialSecurityReport(1000, ssReportId1, primaryFilerId),
        ...makeSocialSecurityReport(1000, ssReportId2, primaryFilerId),
        [`/socialSecurityReports`]: {
          $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
          item: { items: [ssReportId1, ssReportId2] },
        },
        '/socialSecurityReportsIsDone': {
          $type: `gov.irs.factgraph.persisters.BooleanWrapper`,
          item: true,
        },
        [`/hasSeenReviewScreen`]: {
          $type: `gov.irs.factgraph.persisters.BooleanWrapper`,
          item: true,
        },
      };
      context.flowConfig = createFlowConfig(flow);
    });
    afterEach(() => {
      cleanup();
    });

    // Test same collection in 2 locations, loc1-social-security and loc2-social-security
    [1, 2].forEach((loopInstance) => {
      it<LocalTestContext>(`location ${loopInstance} should render 4 buttons - add, parent, checklist, and review`, ({
        flowConfig,
        facts,
      }) => {
        const loopName = `loc${loopInstance}-social-security`;
        const collectionLoop = flowConfig.collectionLoopsByName.get(loopName);
        if (!collectionLoop) {
          throw new Error(`No collection loop found`);
        }

        render(
          <Provider store={setupStore()}>
            <BrowserRouter>
              <FactGraphContextProvider forceNewInstance existingFacts={facts}>
                <CollectionHubDataView
                  collectionLoop={collectionLoop}
                  variant='full'
                  subSubCategoryRefs={subSubCategoryRefs}
                  headingRefs={headingRefs}
                  flow={flowConfig}
                />
              </FactGraphContextProvider>
            </BrowserRouter>
          </Provider>
        );

        // Expect 3 buttons - add, checklist, and review
        const buttons = screen.getAllByRole(`button`);
        expect(buttons).toHaveLength(4);

        expect(buttons[0]).toHaveTextContent(`Add Social Security income`);
        expect(buttons[1]).toHaveTextContent(`Go to checklist./flow/income/parent${loopInstance}.heading`);
        expect(buttons[2]).toHaveTextContent(`Go to checklist`);
        expect(buttons[3]).toHaveTextContent(`Go to review and confirm`);
      });
    });
  });
});
