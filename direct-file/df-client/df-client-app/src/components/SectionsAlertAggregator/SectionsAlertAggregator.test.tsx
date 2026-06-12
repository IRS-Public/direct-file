/* eslint-disable @typescript-eslint/no-non-null-assertion */
import SectionsAlertAggregator, { SectionsAlertAggregatorProps } from './SectionsAlertAggregator.js';
import { render, screen } from '@testing-library/react';
import { MutableRefObject } from 'react';
import {
  SubmissionStatusContext,
  SubmissionStatusContextType,
} from '../../context/SubmissionStatusContext/SubmissionStatusContext.js';
import { v4 as uuidv4 } from 'uuid';
import { TaxReturn } from '../../types/core.js';
import { FEDERAL_RETURN_STATUS } from '../../constants/taxConstants.js';
import { BrowserRouter } from 'react-router-dom';
import {
  getEmptySystemAlertsMap,
  SystemAlertContext,
  SystemAlertContextType,
  SystemAlertKey,
} from '../../context/SystemAlertContext/SystemAlertContext.js';
import { TaxReturnsContext, TaxReturnsContextType } from '../../context/TaxReturnsContext.js';
import { vi } from 'vitest';

const { useFact, getIsKnockedOut } = vi.hoisted(() => {
  return {
    useFact: vi.fn(() => [false]),
    getIsKnockedOut: vi.fn(() => false),
  };
});
vi.mock(`../../hooks/useFact`, () => ({
  default: useFact,
}));

vi.mock(`../../hooks/useKnockoutCheck`, () => ({
  useKnockoutCheck: vi.fn(() => ({ getIsKnockedOut })),
}));

const { mockT, mockI18n } = vi.hoisted(() => {
  return {
    mockT: (key: string) => key,
    mockI18n: { language: `en`, exists: vi.fn((_key: string) => true) },
  };
});
vi.mock(`react-i18next`, async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: mockT,
      i18n: mockI18n,
    }),
    Trans: ({ i18nKey }: { i18nKey: string }) => mockT(i18nKey),
  };
});

const DEFAULT_PROPS: SectionsAlertAggregatorProps = {
  showStatusAlert: false,
  summaryErrorSections: [],
  summaryWarningSections: [],
  refs: { current: new Map<string, MutableRefObject<HTMLAnchorElement>>() },
};

describe(SectionsAlertAggregator.name, () => {
  const renderSectionsAlertAggregator = (
    props: SectionsAlertAggregatorProps,
    options?: {
      systemAlertContext: Partial<SystemAlertContextType>;
    }
  ) => {
    const currentTaxReturnId = uuidv4();
    render(
      <BrowserRouter>
        <SystemAlertContext.Provider
          value={{
            systemAlerts: getEmptySystemAlertsMap(),
            setSystemAlert: vi.fn(),
            deleteSystemAlert: vi.fn(),
            ...options?.systemAlertContext,
          }}
        >
          <TaxReturnsContext.Provider
            value={
              {
                currentTaxReturnId,
                taxReturns: [{ id: currentTaxReturnId, taxReturnSubmissions: [{ id: uuidv4() }] } as TaxReturn],
              } as TaxReturnsContextType
            }
          >
            <SubmissionStatusContext.Provider
              value={
                {
                  submissionStatus: {
                    status: FEDERAL_RETURN_STATUS.REJECTED,
                    rejectionCodes: [
                      {
                        MeFErrorCode: `IND-181-01`,
                      },
                    ],
                  },
                } as SubmissionStatusContextType
              }
            >
              <SectionsAlertAggregator {...props} />
            </SubmissionStatusContext.Provider>
          </TaxReturnsContext.Provider>
        </SystemAlertContext.Provider>
      </BrowserRouter>
    );

    const alertAggregator = screen.queryByTestId(`sections-alert-aggregator`);

    const systemAlerts = screen.queryAllByTestId(`system-alert`);
    const federalReturnStatusAlert = screen.queryByTestId(`federal-return-status-alert`);
    const paperPathStatusAlert = screen.queryByTestId(`paper-path-status-alert`);
    const errorSummaryAlert = screen.queryByTestId(`error-summary-alert`);
    const warningSummaryAlert = screen.queryByTestId(`warning-summary-alert`);
    const aggregateSummaryAlert = screen.queryByTestId(`aggregate-summary-alert`);

    return {
      alertAggregator,
      systemAlerts,
      federalReturnStatusAlert,
      paperPathStatusAlert,
      errorSummaryAlert,
      warningSummaryAlert,
      aggregateSummaryAlert,
    };
  };

  beforeEach(() => {
    useFact.mockRestore();
  });

  it(`Renders nothing if no render conditions are met`, () => {
    const { alertAggregator } = renderSectionsAlertAggregator(DEFAULT_PROPS);

    expect(alertAggregator).not.toBeInTheDocument();
  });

  it(`Renders all elements in the correct order with aggregated summaries`, () => {
    useFact.mockReturnValue([true]);

    const {
      alertAggregator,
      systemAlerts,
      federalReturnStatusAlert,
      paperPathStatusAlert,
      errorSummaryAlert,
      warningSummaryAlert,
      aggregateSummaryAlert,
    } = renderSectionsAlertAggregator(
      {
        ...DEFAULT_PROPS,
        showStatusAlert: true,
        summaryErrorSections: [
          { i18nKey: `errors.summaryErrors.someKey`, path: `path/to/screen/with/error`, isIncomplete: false },
        ],
        summaryWarningSections: [{ i18nKey: `errors.summaryWarnings.someKey`, path: `path/to/screen/with/warning` }],
      },
      {
        systemAlertContext: {
          systemAlerts: {
            [SystemAlertKey.SUBMIT]: {
              alertConfig: {
                type: `error`,
                i18nKey: `errors.systemErrors.someKey`,
              },
              timestamp: 0,
            },
          },
        },
      }
    );

    // This test makes use of the following to assert render order:
    // https://developer.mozilla.org/en-US/docs/Web/API/Node/compareDocumentPosition#return_value

    expect(alertAggregator).toBeInTheDocument();

    expect(systemAlerts).not.toBeNull();
    expect(systemAlerts!.length).toEqual(1);
    const systemErrorAlert = systemAlerts![0];
    expect(systemErrorAlert).toBeInTheDocument();

    expect(federalReturnStatusAlert).toBeInTheDocument();
    expect(systemErrorAlert!.compareDocumentPosition(federalReturnStatusAlert!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    expect(paperPathStatusAlert).toBeInTheDocument();
    expect(federalReturnStatusAlert!.compareDocumentPosition(paperPathStatusAlert!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );

    expect(aggregateSummaryAlert).toBeInTheDocument();
    expect(paperPathStatusAlert!.compareDocumentPosition(aggregateSummaryAlert!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );

    expect(errorSummaryAlert).not.toBeInTheDocument();
    expect(warningSummaryAlert).not.toBeInTheDocument();
  });

  it(`Renders all elements in the correct order with separated summaries`, () => {
    useFact.mockReturnValue([true]);

    const {
      alertAggregator,
      systemAlerts,
      federalReturnStatusAlert,
      paperPathStatusAlert,
      errorSummaryAlert,
      warningSummaryAlert,
      aggregateSummaryAlert,
    } = renderSectionsAlertAggregator(
      {
        ...DEFAULT_PROPS,
        showStatusAlert: true,
        summaryErrorSections: [
          { i18nKey: `errors.summaryErrors.someKey`, path: `path/to/screen/with/error`, isIncomplete: false },
        ],
        summaryWarningSections: [{ i18nKey: `errors.summaryWarnings.someKey`, path: `path/to/screen/with/warning` }],
        separateAlertSummariesByType: true,
      },
      {
        systemAlertContext: {
          systemAlerts: {
            [SystemAlertKey.SUBMIT]: {
              alertConfig: {
                type: `error`,
                i18nKey: `errors.systemErrors.someKey`,
              },
              timestamp: 0,
            },
          },
        },
      }
    );

    // This test makes use of the following to assert render order:
    // https://developer.mozilla.org/en-US/docs/Web/API/Node/compareDocumentPosition#return_value

    expect(alertAggregator).toBeInTheDocument();

    expect(systemAlerts).not.toBeNull();
    expect(systemAlerts!.length).toEqual(1);
    const systemErrorAlert = systemAlerts![0];
    expect(systemErrorAlert).toBeInTheDocument();

    expect(federalReturnStatusAlert).toBeInTheDocument();
    expect(systemErrorAlert!.compareDocumentPosition(federalReturnStatusAlert!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    expect(paperPathStatusAlert).toBeInTheDocument();
    expect(federalReturnStatusAlert!.compareDocumentPosition(paperPathStatusAlert!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );

    expect(errorSummaryAlert).toBeInTheDocument();
    expect(paperPathStatusAlert!.compareDocumentPosition(errorSummaryAlert!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    expect(warningSummaryAlert).toBeInTheDocument();
    expect(errorSummaryAlert!.compareDocumentPosition(warningSummaryAlert!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    expect(aggregateSummaryAlert).not.toBeInTheDocument();
  });
});
