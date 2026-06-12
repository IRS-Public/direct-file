import { Provider } from 'react-redux';
import ChecklistSubcategory from './ChecklistSubcategory.js';
import { i18n, renderWithAllProviders as render } from '../../../test/test-utils.js';
import { AlertConfig, getEmptyAlertConfigs, MefAlertConfig } from '../../../misc/aggregatedAlertHelpers.js';
import { screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { FactGraphContextProvider } from '../../../factgraph/FactGraphContext.js';
import { setupStore } from '../../../redux/store.js';
import { vi } from 'vitest';

const sharedProps = {
  isNext: true,
  isComplete: false,
  isStartedButNotComplete: false,
  subcategoryRoute: `/test/subcategory/`,
  navigationUrl: `http://localhost/test/url`,
  alertConfigs: getEmptyAlertConfigs(),
  mefAlertConfigs: getEmptyAlertConfigs<MefAlertConfig>(),
  hasIncompletedCollectionItem: false,
  ref: null,
} as React.ComponentProps<typeof ChecklistSubcategory>;

const translationNs = {
  button: {
    start: `Start`,
  },
  checklist: {
    '/test/subcategory/': {
      heading: `Test subcategory heading`,
      body: `Test subcategory body`,
      dataItems: {
        thirdPartyDesignee: `There is a third party designee`,
      },
    },
    start: `Checklist start`,
  },
};
const testNs = {
  checklist: {
    '/test/subcategory/': {
      heading: `Test subcategory heading`,
      dataItems: {
        thirdPartyDesignee: `There is a third party designee`,
      },
    },
    start: `Checklist start`,
    alerts: {
      checklistSubcategory: {
        incompletion: `Incomplete SubSection warning`,
      },
    },
  },
  dataviews: {
    incompleteSubSection: `Incomplete SubSection warning`,
  },
  warnings: {
    test1: `Test warning 1`,
    test2: `Test warning 2`,
  },
  errors: {
    test1: `Test error 1`,
    test2: `Test error 2`,
  },
};

const warnings: AlertConfig[] = [
  {
    type: `warning`,
    route: `/test/route1`,
    subcategoryRoute: `/test/route1/subcategory1/`,
    isActive: true,
    collectionId: null,
    i18nKey: `warnings.test1`,
  },
  {
    type: `warning`,
    route: `/test/route2`,
    subcategoryRoute: `/test/route2/subcategory2/`,
    isActive: true,
    collectionId: null,
    i18nKey: `warnings.test2`,
  },
];

const errors: AlertConfig[] = [
  {
    type: `error`,
    route: `/test/route1`,
    subcategoryRoute: `/test/route1/subcategory1/`,
    isActive: true,
    collectionId: null,
    i18nKey: `errors.test1`,
  },
  {
    type: `error`,
    route: `/test/route2`,
    subcategoryRoute: `/test/route2/subcategory2/`,
    isActive: true,
    collectionId: null,
    i18nKey: `errors.test2`,
  },
];

describe(`ChecklistSubcategory`, () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`2024-02-15`));
  });
  afterAll(() => {
    // restoring date after each test run
    vi.useRealTimers();
  });
  beforeEach(() => {
    i18n.addResourceBundle(`en`, `translation`, translationNs, true, true);
    i18n.addResourceBundle(`en`, `test`, testNs, true, true);
  });

  function renderWrappedChecklistSubcategory(
    overrides: Partial<React.ComponentProps<typeof ChecklistSubcategory>> = {}
  ) {
    return render(
      <Provider store={setupStore()}>
        <HelmetProvider context={{}}>
          <FactGraphContextProvider>
            <ul>
              <ChecklistSubcategory {...{ ...sharedProps, ...overrides }} />
            </ul>
          </FactGraphContextProvider>
        </HelmetProvider>
      </Provider>
    );
  }

  it(`renders without errors`, () => {
    const { getByRole, getByTestId } = renderWrappedChecklistSubcategory();

    const heading = getByRole(`heading`);
    expect(heading.innerText).toContain(translationNs.checklist[`/test/subcategory/`].heading);
    expect(heading.innerText).toContain(translationNs.checklist.start);
    expect(heading.innerText).toContain(translationNs.button.start);

    const link = getByTestId(`heading-text-link`);
    expect(link).not.toHaveAttribute(`aria-describedby`);
    expect(link.innerText).toContain(translationNs.checklist[`/test/subcategory/`].heading);
    expect(link.innerText).toContain(translationNs.checklist.start);

    const button = getByTestId(`heading-button-link`);
    expect(button.innerText).toContain(translationNs.button.start);
  });

  it(`with incomplete section; link has aria-describedby with ID of alert`, () => {
    const { getByTestId } = renderWrappedChecklistSubcategory({
      hasIncompletedCollectionItem: true,
      isStartedButNotComplete: true,
    });

    const alert = getByTestId(`warning-incomplete`);
    expect(alert.innerText).toContain(testNs.dataviews.incompleteSubSection);

    const link = getByTestId(`heading-text-link`);
    expect(link).toHaveAttribute(`aria-describedby`, alert.id);
  });

  it(`with warnings; link has aria-describedby with ID of warning count`, () => {
    renderWrappedChecklistSubcategory({
      alertConfigs: { ...sharedProps.alertConfigs, warnings },
    });

    const warningCount = screen.getByTestId(`${sharedProps.subcategoryRoute}-warning-count-alert`);
    expect(warningCount.innerText).toContain(`checklist.alerts.checklistSubcategory.warning`);

    const link = screen.getByTestId(`heading-text-link`);
    expect(link).toHaveAttribute(`aria-describedby`, expect.stringContaining(warningCount.id));
  });

  it(`with incomplete section and warnings; link has aria-describedby with ID of alert and warnings`, () => {
    renderWrappedChecklistSubcategory({
      alertConfigs: { ...sharedProps.alertConfigs, warnings },
      hasIncompletedCollectionItem: true,
      isStartedButNotComplete: true,
    });

    const alert = screen.getByTestId(`warning-incomplete`);
    expect(alert.innerText).toContain(testNs.dataviews.incompleteSubSection);

    const warningCount = screen.getByTestId(`${sharedProps.subcategoryRoute}-warning-count-alert`);
    expect(warningCount.innerText).toContain(`checklist.alerts.checklistSubcategory.warning`);

    const link = screen.getByTestId(`heading-text-link`);
    expect(link).toHaveAttribute(`aria-describedby`, expect.stringContaining(alert.id));
  });

  it(`renders with errors counts above warnings`, () => {
    renderWrappedChecklistSubcategory({
      alertConfigs: { ...sharedProps.alertConfigs, warnings, errors },
    });

    const warningCount = screen.getByTestId(`${sharedProps.subcategoryRoute}-warning-count-alert`);
    expect(warningCount.innerText).toContain(`checklist.alerts.checklistSubcategory.warning`);

    const errorCount = screen.getByTestId(`${sharedProps.subcategoryRoute}-error-count-alert`);
    expect(errorCount.innerText).toContain(`checklist.alerts.checklistSubcategory.error`);

    // Verify that errors display above warnings
    // https://developer.mozilla.org/en-US/docs/Web/API/Node/compareDocumentPosition#return_value
    expect(errorCount.compareDocumentPosition(warningCount)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it(`does not render incomplete section alerts when the section has not been started`, () => {
    renderWrappedChecklistSubcategory({
      alertConfigs: { ...sharedProps.alertConfigs, warnings },
      hasIncompletedCollectionItem: true,
      isStartedButNotComplete: false,
      isComplete: false,
    });

    const alertCount = screen.queryByTestId(`${sharedProps.subcategoryRoute}-error-count-alert`);
    expect(alertCount).not.toBeInTheDocument();
  });

  it(`renders data reveal if complete`, () => {
    renderWrappedChecklistSubcategory({
      isComplete: true,
      dataItems: [
        {
          itemKey: `thirdPartyDesignee`,
        },
      ],
    });

    const dataReveal = screen.getByTestId(`checklist-data-reveal`);
    expect(dataReveal.innerText).toContain(`third party designee`);
  });

  afterEach(() => {
    i18n.removeResourceBundle(`en`, `test`);
    i18n.removeResourceBundle(`en`, `translation`);
  });
});
