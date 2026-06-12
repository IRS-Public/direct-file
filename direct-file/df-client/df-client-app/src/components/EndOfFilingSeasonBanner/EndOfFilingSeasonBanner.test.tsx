import { TaxReturn, TaxReturnSubmissionStatus } from '../../types/core.js';
import { mockUseTranslation } from '../../test/mocks/mockFunctions.js';
import { getBannerI18nKeys } from './EndOfFilingSeasonBanner.js';
import {
  CURRENT_TAX_YEAR,
  FEDERAL_RETURN_STATUS,
  DAY_WHEN_UNABLE_TO_FILE_MA,
  DAY_WHEN_UNABLE_TO_FILE_FEDERAL,
} from '../../constants/taxConstants.js';
import { v4 as uuidv4 } from 'uuid';
import { expect } from 'vitest';
import { vi } from 'vitest';

// This mock allows for testing of any component that is rendered using the
// useTranslation hook from react-i18next.
vi.mock(`react-i18next`, () => {
  return {
    Trans: ({ i18nKey }: { i18nKey: string | string[] }) => mockUseTranslation().t(i18nKey),
    useTranslation: mockUseTranslation,
    initReactI18next: {
      type: `3rdParty`,
      init: () => {},
    },
  };
});

const taxReturn: TaxReturn = {
  id: uuidv4(),
  createdAt: new Date().toISOString(),
  taxYear: parseInt(CURRENT_TAX_YEAR),
  facts: {},
  taxReturnSubmissions: [],
  isEditable: true,
  surveyOptIn: null,
};

const submissionStatus: TaxReturnSubmissionStatus = {
  status: FEDERAL_RETURN_STATUS.REJECTED,
  rejectionCodes: [],
  createdAt: new Date().toISOString(), // just a placeholder value we don't use this
};

// These are not exhaustive and mainly sanity tests since all scenarios are not finalized
describe(`calculates content correctly for end of filing season banner`, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const testCases = [
    {
      name: `warning before deadline`,
      time: DAY_WHEN_UNABLE_TO_FILE_FEDERAL.getTime() - 1,
      taxReturn: taxReturn,
      submissionStatus: undefined,
      headingKey: `banner.endOfFilingSeason.headingBeforeStdDeadline`,
      bodyKey: `banner.endOfFilingSeason.contentBase`,
    },
    // {
    //   name: `shows Massachusetts exemption after standard deadline`,
    //   time: DAY_WHEN_UNABLE_TO_FILE_FEDERAL.getTime(),
    //   taxReturn: taxReturn,
    //   submissionStatus: undefined,
    //   headingKey: `banner.endOfFilingSeason.headingBeforeMaDeadline`,
    //   bodyKey: `banner.endOfFilingSeason.contentBase`,
    // },
    // {
    //   name: `continues to shows Massachusetts exemption after standard deadline`,
    //   time: DAY_WHEN_UNABLE_TO_FILE_MA.getTime() - 1,
    //   taxReturn: taxReturn,
    //   submissionStatus: undefined,
    //   headingKey: `banner.endOfFilingSeason.headingBeforeMaDeadline`,
    //   bodyKey: `banner.endOfFilingSeason.contentBase`,
    // },
    {
      name: `shows Direct File is closed after MA filing deadline`,
      time: DAY_WHEN_UNABLE_TO_FILE_MA.getTime(),
      taxReturn: taxReturn,
      submissionStatus: undefined,
      headingKey: `afterDeadlineBanner.heading`,
      bodyKey: `afterDeadlineBanner`,
    },
    {
      name: `is accepted`,
      time: DAY_WHEN_UNABLE_TO_FILE_MA.getTime(),
      taxReturn: taxReturn,
      submissionStatus: { ...submissionStatus, status: FEDERAL_RETURN_STATUS.ACCEPTED },
      headingKey: null,
      bodyKey: null,
    },
  ];

  for (const c of testCases) {
    it(c.name, () => {
      vi.setSystemTime(c.time);
      const { headingI18nKey, bodyI18nKey } = getBannerI18nKeys(c.taxReturn, c.submissionStatus);
      expect(headingI18nKey).toBe(c.headingKey);
      expect(bodyI18nKey).toBe(c.bodyKey);
    });
  }
});
