/* eslint-disable @typescript-eslint/no-namespace */
import { beforeEach, it, describe, expect } from 'vitest';
import { Provider } from 'react-redux';

import { Flow, Category, Subcategory, Screen, CollectionLoop, SubSubcategory } from '../../flow/flowDeclarations.js';
import {
  Heading,
  InfoDisplay,
  GenericString,
  SaveAndOrContinueButton,
  Dollar,
  CollectionItemManager,
} from '../../flow/ContentDeclarations.js';
import { AbsolutePath } from '../../fact-dictionary/Path.js';
import { FlowConfig, createFlowConfig } from '../../flow/flowConfig.js';
import { MutableRefObject } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { cleanup, render, screen, within } from '@testing-library/react';
import { FactGraphContextProvider } from '../../factgraph/FactGraphContext.js';
import en from '../../locales/en.yaml';

import { baseFilerData, primaryFilerId, makeInterestReportData } from '../../test/testData.js';
import CollectionHubDataView from './CollectionHubDataView.js';
import { initI18n } from '../../i18n.js';
import { setupStore } from '../../redux/store.js';
import { vi } from 'vitest';

const intReportId1 = `9d164507-0c5a-469d-8d36-49d2f7af0b7a`;
const intReportId2 = `24aa5dee-e381-4927-a0d9-07658287086c`;

const flow = (
  <Flow>
    <Category route='cat1'>
      {/* Normal collection hub */}
      <Subcategory route='interest' completeIf='/interestReportsIsDone' collectionContext='/interestReports'>
        <Screen route='int-income-loop-intro'>
          <Heading i18nKey='/heading/income/interest' />
          <InfoDisplay i18nKey='/info/income/interest/intro' />
          <CollectionItemManager
            path='/interestReports'
            loopName='/interestReports'
            donePath='/interestReportsIsDone'
          />
        </Screen>
        <CollectionLoop
          loopName='/interestReports'
          collection='/interestReports'
          iconName='AttachMoney'
          collectionItemCompletedCondition='/interestReports/*/isComplete'
          donePath='/interestReportsIsDone'
        >
          <SubSubcategory route='int-income-basic-info'>
            <Screen route='two'>
              <Heading i18nKey='/foo' />
              <GenericString path='/interestReports/*/payer' />
              <Dollar path='/interestReports/*/no1099Amount' />
              <SaveAndOrContinueButton />
            </Screen>
          </SubSubcategory>
        </CollectionLoop>
      </Subcategory>
    </Category>
  </Flow>
);

/* Translation mocks */
vi.mock(`../../hooks/useTranslationContextFromFacts`, () => ({
  default: () => () => ({
    [`/interestReports/*/filer/fullName`]: `John Doe`,
    [`/interestReports/*/payer`]: `Banky Bank`,
  }),
}));

const i18next = await initI18n();
i18next.addResourceBundle(`en`, `translation`, en);
i18next.changeLanguage(`en`);

/* Is return editable mock */
vi.mock(`../../hooks/useIsReturnEditable.js`, () => ({
  useIsReturnEditable: vi.fn().mockReturnValue({ isReturnEditable: true }),
}));

/**
 * Collection Hub Data View Test for normal hub
 */
describe(`Normal collection hub, full variant`, () => {
  interface LocalTestContext {
    flowConfig: FlowConfig;
    facts: object;
  }

  const subSubCategoryRefs = { current: new Map<string, MutableRefObject<HTMLHeadingElement>>() };
  const headingRefs = { current: new Map<string, MutableRefObject<HTMLHeadingElement>>() };

  describe(`in edit mode`, () => {
    beforeEach<LocalTestContext>((context) => {
      // Make an interest report collection with two items
      context.facts = {
        ...baseFilerData,
        ...makeInterestReportData(1000, intReportId1, primaryFilerId),
        ...makeInterestReportData(1000, intReportId2, primaryFilerId),
        [`/interestReports`]: {
          $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
          item: { items: [intReportId1, intReportId2] },
        },
      };
      context.flowConfig = createFlowConfig(flow);
    });

    afterEach(() => {
      cleanup();
    });

    it<LocalTestContext>(`should render all the cards`, ({ flowConfig, facts }) => {
      const collectionLoop = flowConfig.collectionLoopsByName.get(`/interestReports`);
      if (!collectionLoop) {
        throw new Error(`No collection loop found`);
      }
      // Render full variant of hub
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

      // Expect two cards
      const listItems = screen.getAllByTestId(`Card`);
      expect(listItems).toHaveLength(2);

      // Check first card details
      const card = listItems[0];
      const heading = within(card).getByRole(`heading`);
      expect(heading).toHaveTextContent(/.*Banky Bank/i);

      // Expect card link to go to the collection item
      const link = within(card).getByRole(`link`);
      expect(link).toHaveAttribute(`href`, `/data-view/loop/%2FinterestReports/${intReportId1}/?reviewMode=true`);
    });

    it<LocalTestContext>(`should render 2 buttons - add and done`, ({ flowConfig, facts }) => {
      const collectionLoop = flowConfig.collectionLoopsByName.get(`/interestReports`);
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

      // Expect 2 buttons - add and done
      const buttons = screen.getAllByRole(`button`);
      expect(buttons).toHaveLength(2);

      expect(buttons[0]).toHaveTextContent(`Add interest income`);
      expect(buttons[1]).toHaveTextContent(`I’m done adding interest income`);
    });

    it<LocalTestContext>(`shouldn't render done button`, ({ flowConfig, facts }) => {
      const collectionLoop = flowConfig.collectionLoopsByName.get(`/interestReports`);
      if (!collectionLoop) {
        throw new Error(`No collection loop found`);
      }
      const datum = {
        ...facts,
        [`/interestReports`]: {
          $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
          item: { items: [] },
        },
      };
      const collectionLoopWithToggle = {
        ...collectionLoop,
        shouldSeeHubCompletionBtnsPath: `/hasInterestReports` as AbsolutePath,
      };
      render(
        <Provider store={setupStore()}>
          <BrowserRouter>
            <FactGraphContextProvider forceNewInstance existingFacts={datum}>
              <CollectionHubDataView
                collectionLoop={collectionLoopWithToggle}
                variant='full'
                subSubCategoryRefs={subSubCategoryRefs}
                headingRefs={headingRefs}
                flow={flowConfig}
              />
            </FactGraphContextProvider>
          </BrowserRouter>
        </Provider>
      );

      // Expect 1 button - add
      const buttons = screen.getAllByRole(`button`);
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveTextContent(`Add interest income`);
    });
  });

  describe(`in review mode`, () => {
    beforeEach<LocalTestContext>((context) => {
      context.flowConfig = createFlowConfig(flow);
    });
    afterEach(() => {
      cleanup();
    });

    it<LocalTestContext>(`should render 3 buttons - add, checklist, and review`, ({ flowConfig }) => {
      const collectionLoop = flowConfig.collectionLoopsByName.get(`/interestReports`);
      if (!collectionLoop) {
        throw new Error(`No collection loop for /filers`);
      }

      const facts = {
        ...baseFilerData,
        ...makeInterestReportData(1000, intReportId1, primaryFilerId),
        ...makeInterestReportData(1000, intReportId2, primaryFilerId),
        [`/interestReports`]: {
          $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
          item: { items: [intReportId1, intReportId2] },
        },
        [`/hasSeenReviewScreen`]: {
          $type: `gov.irs.factgraph.persisters.BooleanWrapper`,
          item: true,
        },
        '/interestReportsIsDone': {
          $type: `gov.irs.factgraph.persisters.BooleanWrapper`,
          item: true,
        },
      };
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
      expect(buttons).toHaveLength(3);

      expect(buttons[0]).toHaveTextContent(`Add interest income`);
      expect(buttons[1]).toHaveTextContent(`Go to checklist`);
      expect(buttons[2]).toHaveTextContent(`Go to review and confirm`);
    });

    it<LocalTestContext>(`shouldn't render checklist and review`, ({ flowConfig }) => {
      const collectionLoop = flowConfig.collectionLoopsByName.get(`/interestReports`);
      if (!collectionLoop) {
        throw new Error(`No collection loop found`);
      }
      const facts = {
        ...baseFilerData,
        [`/interestReports`]: {
          $type: `gov.irs.factgraph.persisters.CollectionWrapper`,
          item: { items: [] },
        },
        [`/hasSeenReviewScreen`]: {
          $type: `gov.irs.factgraph.persisters.BooleanWrapper`,
          item: true,
        },
      };
      const collectionLoopWithToggle = {
        ...collectionLoop,
        shouldSeeHubCompletionBtnsPath: `/hasInterestReports` as AbsolutePath,
      };
      render(
        <Provider store={setupStore()}>
          <BrowserRouter>
            <FactGraphContextProvider forceNewInstance existingFacts={facts}>
              <CollectionHubDataView
                collectionLoop={collectionLoopWithToggle}
                variant='full'
                subSubCategoryRefs={subSubCategoryRefs}
                headingRefs={headingRefs}
                flow={flowConfig}
              />
            </FactGraphContextProvider>
          </BrowserRouter>
        </Provider>
      );

      // Expect 1 button - add
      const buttons = screen.getAllByRole(`button`);
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveTextContent(`Add interest income`);
    });
  });
});
