import FederalReturnStatusAlert, { FederalReturnStatusAlertProps } from './FederalReturnStatusAlert.js';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { setupStore } from '../../redux/store.js';
import { CURRENT_TAX_YEAR, FEDERAL_RETURN_STATUS } from '../../constants/taxConstants.js';
import { TaxReturn, TaxReturnSubmission, TaxReturnSubmissionStatus } from '../../types/core.js';
import { v4 as uuidv4 } from 'uuid';
import { beforeAll, afterAll } from 'vitest';
import { MEF_REJECTION_ERROR_CODES } from '../../constants/rejectionConstants.js';
import { FactGraphContextProvider } from '../../factgraph/FactGraphContext.js';
import { vi } from 'vitest';

const { t } = vi.hoisted(() => {
  return {
    t: vi.fn((key: string) => key),
  };
});
vi.mock(`react-i18next`, () => ({
  useTranslation: () => {
    return {
      t: t,
      i18n: {
        language: `en`,
      },
    };
  },
  initReactI18next: {
    type: `3rdParty`,
  },
  Trans: ({ i18nKey }: { i18nKey: string }) => t(i18nKey),
}));

describe(`FederalReturnStatusAlert`, () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`2024-02-15`));
  });

  afterAll(() => {
    // restoring date after each test run
    vi.useRealTimers();
  });

  const submission: TaxReturnSubmission = {
    id: uuidv4(),
    receiptId: uuidv4(),
    submitUserId: `me`,
    createdAt: new Date().toISOString(),
    submissionReceivedAt: new Date().toISOString(),
  };

  const defaultTaxReturn: TaxReturn = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    facts: {},
    taxYear: parseInt(CURRENT_TAX_YEAR),
    taxReturnSubmissions: [submission],
    isEditable: true,
    surveyOptIn: null,
  };

  const defaultSubmissionStatus: TaxReturnSubmissionStatus = {
    status: FEDERAL_RETURN_STATUS.PENDING,
    rejectionCodes: [],
    createdAt: new Date().toISOString(),
  };

  const defaultProps: FederalReturnStatusAlertProps = {
    taxReturn: defaultTaxReturn,
    submissionStatus: defaultSubmissionStatus,
  };
  const renderFederalReturnStatusAlert = (props: FederalReturnStatusAlertProps) => {
    render(
      <Provider store={setupStore()}>
        <FactGraphContextProvider>
          <FederalReturnStatusAlert {...props} />
        </FactGraphContextProvider>
      </Provider>
    );

    const alert = screen.getByTestId(`alert`);

    return {
      alert,
    };
  };

  describe(`status = ${FEDERAL_RETURN_STATUS.PENDING}`, () => {
    it(`renders correctly`, () => {
      const { alert } = renderFederalReturnStatusAlert(defaultProps);

      expect(alert).toHaveClass(`usa-alert--info`);
      expect(alert).toHaveTextContent(`federalReturnStatusAlert.pending.heading`);
      expect(alert).toHaveTextContent(`federalReturnStatusAlert.pending.body`);
    });

    it(`renders correctly for resubmission (multiple submissions)`, () => {
      const { alert } = renderFederalReturnStatusAlert({
        taxReturn: {
          ...defaultTaxReturn,
          taxReturnSubmissions: [submission, submission],
        },
        submissionStatus: defaultSubmissionStatus,
      });

      expect(alert).toHaveClass(`usa-alert--info`);
      expect(alert).toHaveTextContent(`federalReturnStatusAlert.pending.resubmitted.heading`);
      expect(alert).toHaveTextContent(`federalReturnStatusAlert.pending.resubmitted.body`);
    });
  });

  describe(`status = ${FEDERAL_RETURN_STATUS.ACCEPTED}`, () => {
    it(`renders correctly`, () => {
      const { alert } = renderFederalReturnStatusAlert({
        ...defaultProps,
        submissionStatus: { ...defaultSubmissionStatus, status: FEDERAL_RETURN_STATUS.ACCEPTED },
      });

      expect(alert).toHaveClass(`usa-alert--success`);
      expect(alert).toHaveTextContent(`federalReturnStatusAlert.accepted.heading`);
      expect(alert).not.toHaveTextContent(`federalReturnStatusAlert.accepted.body`);
    });
  });

  describe(`status = ${FEDERAL_RETURN_STATUS.REJECTED}`, () => {
    it(`renders correctly if 1 error fixable in DF`, () => {
      const { alert } = renderFederalReturnStatusAlert({
        ...defaultProps,
        submissionStatus: {
          ...defaultSubmissionStatus,
          status: FEDERAL_RETURN_STATUS.REJECTED,
          rejectionCodes: [{ MeFErrorCode: `IND-181-01`, MeFDescription: `not used`, TranslationKey: `not used` }],
        },
      });

      expect(alert).toBeInTheDocument();
      expect(alert).toHaveClass(`usa-alert--error`);
      expect(alert).toHaveTextContent(`federalReturnStatusAlert.rejected.heading`);
      expect(alert).toHaveTextContent(`federalReturnStatusAlert.rejected.canFixInDirectFile.body`);
    });

    it(`renders correctly if multiple errors fixable in DF`, () => {
      const { alert } = renderFederalReturnStatusAlert({
        ...defaultProps,
        submissionStatus: {
          ...defaultSubmissionStatus,
          status: FEDERAL_RETURN_STATUS.REJECTED,
          rejectionCodes: [
            { MeFErrorCode: `IND-181-01`, MeFDescription: `not used`, TranslationKey: `not used` },
            { MeFErrorCode: `also-fixable`, MeFDescription: `not used`, TranslationKey: `not used` },
          ],
        },
      });

      expect(alert).toHaveClass(`usa-alert--error`);
      expect(alert).toHaveTextContent(`federalReturnStatusAlert.rejected.heading`);
      expect(alert).toHaveTextContent(`federalReturnStatusAlert.rejected.canFixInDirectFile.body`);
    });

    it(`renders correctly if 1 or more error unfixable in DF`, () => {
      const { alert } = renderFederalReturnStatusAlert({
        ...defaultProps,
        submissionStatus: {
          ...defaultSubmissionStatus,
          status: FEDERAL_RETURN_STATUS.REJECTED,
          rejectionCodes: [
            { MeFErrorCode: `IND-181-01`, MeFDescription: `not used`, TranslationKey: `not used` },
            {
              MeFErrorCode: MEF_REJECTION_ERROR_CODES.UNFIXABLE_BY_DF[0],
              MeFDescription: `not used`,
              TranslationKey: `not used`,
            },
          ],
        },
      });

      expect(alert).toHaveClass(`usa-alert--error`);
      expect(alert).toHaveTextContent(`federalReturnStatusAlert.rejected.heading`);
      expect(alert).toHaveTextContent(`federalReturnStatusAlert.rejected.cannotFixInDirectFile.body`);
    });
  });

  describe(`status = ${FEDERAL_RETURN_STATUS.ERROR}`, () => {
    it(`renders correctly`, () => {
      const { alert } = renderFederalReturnStatusAlert({
        ...defaultProps,
        submissionStatus: {
          ...defaultSubmissionStatus,
          status: FEDERAL_RETURN_STATUS.ERROR,
        },
      });

      expect(alert).toHaveClass(`usa-alert--error`);
      expect(alert).toHaveTextContent(`federalReturnStatusAlert.error.heading`);
      expect(alert).toHaveTextContent(`federalReturnStatusAlert.error.body`);
    });
  });
});
