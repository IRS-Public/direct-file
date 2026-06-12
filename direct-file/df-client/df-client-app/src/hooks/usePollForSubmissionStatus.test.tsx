import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SubmissionStatusPollResult, usePollForSubmissionStatus } from './usePollForSubmissionStatus.js';
import { SubmissionStatusContext } from '../context/SubmissionStatusContext/SubmissionStatusContext.js';
import { TaxReturn, TaxReturnSubmissionStatus } from '../types/core.js';
import { v4 as uuidv4 } from 'uuid';
import { CURRENT_TAX_YEAR, FEDERAL_RETURN_STATUS } from '../constants/taxConstants.js';
import { ReactNode, useContext, useState } from 'react';
import { getCurrentTaxYearReturn, getLatestSubmission } from '../utils/taxReturnUtils.js';
import { TaxReturnsContext } from '../context/TaxReturnsContext.js';
import { store } from '../redux/store.js';
import { Provider } from 'react-redux';
import { vi } from 'vitest';

const mockFetchTaxReturnsApiRequest = vi.fn();
const mockFetchSubmissionStatusApiRequest = vi.fn();

const NOW = new Date();
const ONE_HOUR_AGO = new Date(new Date().setHours(NOW.getHours() - 1));
const FIFTY_MINUTES_AGO = new Date(new Date().setMinutes(NOW.getMinutes() - 50));
const TEN_MINUTES_AGO = new Date(new Date().setMinutes(NOW.getMinutes() - 10));
const FIVE_MINUTES_AGO = new Date(new Date().setMinutes(NOW.getMinutes() - 5));

const TEST_POLLING_INTERVAL_MS = 100;
const TEST_POLLING_MAXIMUM_ATTEMPTS = 10;

type SubmissionTestData = {
  taxReturn: TaxReturn;
  status?: TaxReturnSubmissionStatus;
};

const PRE_PENDING_SUBMISSION: SubmissionTestData = {
  taxReturn: {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    taxYear: parseInt(CURRENT_TAX_YEAR),
    facts: {},
    taxReturnSubmissions: [
      {
        // original, rejected submission
        id: uuidv4(),
        submitUserId: uuidv4(),
        createdAt: ONE_HOUR_AGO.toISOString(),
        submissionReceivedAt: FIFTY_MINUTES_AGO.toISOString(),
        receiptId: uuidv4(),
      },
      {
        // resubmission, not yet acknowledged by MeF
        id: uuidv4(),
        submitUserId: uuidv4(),
        createdAt: TEN_MINUTES_AGO.toISOString(),
        submissionReceivedAt: null,
        receiptId: null,
      },
    ],
    isEditable: false,
    surveyOptIn: null,
  },
  status: {
    // still the status of the original rejection
    status: FEDERAL_RETURN_STATUS.REJECTED,
    rejectionCodes: [
      {
        MeFErrorCode: `IND-181-01`,
        MeFDescription: `not used`,
        TranslationKey: `not used`,
      },
    ],
    createdAt: FIFTY_MINUTES_AGO.toISOString(),
  },
};

const PENDING_SUBMISSION: SubmissionTestData = {
  taxReturn: {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    taxYear: parseInt(CURRENT_TAX_YEAR),
    facts: {},
    taxReturnSubmissions: [
      {
        // original, rejected submission
        id: uuidv4(),
        submitUserId: uuidv4(),
        createdAt: ONE_HOUR_AGO.toISOString(),
        submissionReceivedAt: FIFTY_MINUTES_AGO.toISOString(),
        receiptId: uuidv4(),
      },
      {
        // resubmission, acknowledged by MeF
        id: uuidv4(),
        submitUserId: uuidv4(),
        createdAt: TEN_MINUTES_AGO.toISOString(),
        submissionReceivedAt: FIVE_MINUTES_AGO.toISOString(),
        receiptId: uuidv4(),
      },
    ],
    isEditable: false,
    surveyOptIn: null,
  },
  status: {
    // an actual pending status
    status: FEDERAL_RETURN_STATUS.PENDING,
    rejectionCodes: [],
    createdAt: FIVE_MINUTES_AGO.toISOString(),
  },
};

const REJECTED_SUBMISSION: SubmissionTestData = {
  taxReturn: PENDING_SUBMISSION.taxReturn,
  status: {
    // an actual rejected status
    status: FEDERAL_RETURN_STATUS.REJECTED,
    rejectionCodes: [],
    createdAt: NOW.toISOString(),
  },
};

type WrapperProps = {
  children: ReactNode;
  initialTaxReturn: TaxReturn;
  initialStatus?: TaxReturnSubmissionStatus;
};
const Wrapper = ({ children, initialTaxReturn, initialStatus }: WrapperProps) => {
  const [taxReturns, setTaxReturns] = useState([initialTaxReturn]);
  const [submissionStatus, setSubmissionStatus] = useState<TaxReturnSubmissionStatus | undefined>(initialStatus);

  const fetchTaxReturns = () => {
    const fetchedReturns = mockFetchTaxReturnsApiRequest();
    setTaxReturns(fetchedReturns);
  };

  const fetchSubmissionStatus = () => {
    const fetchedStatus = mockFetchSubmissionStatusApiRequest();
    setSubmissionStatus(fetchedStatus);
  };

  return (
    <Provider store={store}>
      <TaxReturnsContext.Provider
        value={{
          taxReturns: taxReturns,
          currentTaxReturnId: initialTaxReturn.id,
          fetchTaxReturns: fetchTaxReturns,
          isFetching: false,
          fetchSuccess: false,
        }}
      >
        <SubmissionStatusContext.Provider
          value={{
            submissionStatus: submissionStatus,
            setSubmissionStatus: setSubmissionStatus,
            fetchSubmissionStatus: fetchSubmissionStatus,
            isFetching: false,
            fetchSuccess: false,
            fetchError: false,
            lastFetchAttempt: new Date(),
          }}
        >
          {children}
        </SubmissionStatusContext.Provider>
      </TaxReturnsContext.Provider>
    </Provider>
  );
};

const HookRenderer = (): SubmissionTestData & SubmissionStatusPollResult => {
  const { taxReturns } = useContext(TaxReturnsContext);
  const { submissionStatus } = useContext(SubmissionStatusContext);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const currentTaxReturn = getCurrentTaxYearReturn(taxReturns)!;

  const { hasFinishedPolling, numPollsAttempted } = usePollForSubmissionStatus(
    currentTaxReturn,
    TEST_POLLING_INTERVAL_MS,
    TEST_POLLING_MAXIMUM_ATTEMPTS
  );

  return {
    hasFinishedPolling,
    numPollsAttempted,
    taxReturn: currentTaxReturn,
    status: submissionStatus,
  };
};

// TODO (owenc): Re-enable this test
// https://git.irslabs.org/irslabs-prototypes/direct-file/-/issues/12414
describe.skip(`usePollForSubmissionStatus`, () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it(`Given up-to-date tax returns and submission status, does not poll`, { retry: 1 }, async () => {
    mockFetchTaxReturnsApiRequest.mockReturnValue([REJECTED_SUBMISSION.taxReturn]);
    mockFetchSubmissionStatusApiRequest.mockReturnValue(REJECTED_SUBMISSION.status);

    const { result } = renderHook(HookRenderer, {
      wrapper: ({ children }) => (
        <Wrapper initialTaxReturn={REJECTED_SUBMISSION.taxReturn} initialStatus={REJECTED_SUBMISSION.status}>
          {children}
        </Wrapper>
      ),
    });

    await waitFor(
      () => {
        expect(result.current.hasFinishedPolling).toBeTruthy();
      },
      { timeout: 5000 }
    );

    expect(mockFetchTaxReturnsApiRequest).toHaveBeenCalledTimes(0);
    expect(mockFetchSubmissionStatusApiRequest).toHaveBeenCalledTimes(0);
  });

  it(
    `Given a pre-pending submission and backend data ready to be refetched,
stops polling as soon as actual status is returned`,
    { retry: 1 },
    async () => {
      mockFetchTaxReturnsApiRequest
        .mockReturnValueOnce([PENDING_SUBMISSION.taxReturn])
        .mockReturnValue([REJECTED_SUBMISSION.taxReturn]);
      mockFetchSubmissionStatusApiRequest.mockReturnValue(REJECTED_SUBMISSION.status);

      const { result } = renderHook(HookRenderer, {
        wrapper: ({ children }) => (
          <Wrapper initialTaxReturn={PRE_PENDING_SUBMISSION.taxReturn} initialStatus={PRE_PENDING_SUBMISSION.status}>
            {children}
          </Wrapper>
        ),
      });

      await waitFor(
        () => {
          expect(result.current.hasFinishedPolling).toBeTruthy();
        },
        { timeout: 5000 }
      );

      // Exact number of invocations via .toHaveBeenCalledTimes() worked locally every time, but were flaky in CI.
      // Making this a little looser to avoid flaky tests
      expect(mockFetchTaxReturnsApiRequest.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockFetchSubmissionStatusApiRequest.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockFetchTaxReturnsApiRequest.mock.calls.length).toBeLessThan(3);
      expect(mockFetchSubmissionStatusApiRequest.mock.calls.length).toBeLessThan(3);

      const { taxReturn, status } = result.current;

      const latestSubmission = getLatestSubmission(taxReturn);
      const expectedLatestSubmission = getLatestSubmission(REJECTED_SUBMISSION.taxReturn);

      expect(latestSubmission).not.toBeUndefined();
      expect(latestSubmission).toEqual(expectedLatestSubmission);
      expect(status).toEqual(REJECTED_SUBMISSION.status);
    }
  );

  it(
    `Given a pre-pending submission and backend data not available for several polls,
stops polling as soon as actual status is returned`,
    { retry: 1 },
    async () => {
      mockFetchTaxReturnsApiRequest
        // returns the pre-pending tax return information on the first 2 polls
        .mockReturnValueOnce([PRE_PENDING_SUBMISSION.taxReturn])
        .mockReturnValueOnce([PRE_PENDING_SUBMISSION.taxReturn])
        // then returns the tax return with an updated submission
        .mockReturnValueOnce([PENDING_SUBMISSION.taxReturn])
        .mockReturnValue([REJECTED_SUBMISSION.taxReturn]);

      mockFetchSubmissionStatusApiRequest
        // begins returning a PENDING status
        .mockReturnValueOnce(PENDING_SUBMISSION.status)
        .mockReturnValueOnce(PENDING_SUBMISSION.status)
        // finally, returns a status with an MeF determination
        .mockReturnValue(REJECTED_SUBMISSION.status);

      const { result } = renderHook(HookRenderer, {
        wrapper: ({ children }) => (
          <Wrapper initialTaxReturn={PRE_PENDING_SUBMISSION.taxReturn} initialStatus={PRE_PENDING_SUBMISSION.status}>
            {children}
          </Wrapper>
        ),
      });

      await waitFor(
        () => {
          expect(result.current.hasFinishedPolling).toBeTruthy();
        },
        { timeout: 5000 }
      );

      // Exact number of invocations via .toHaveBeenCalledTimes() worked locally every time, but were flaky in CI.
      // Making this a little looser to avoid flaky tests
      expect(mockFetchTaxReturnsApiRequest.mock.calls.length).toBeGreaterThanOrEqual(3);
      expect(mockFetchSubmissionStatusApiRequest.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(mockFetchTaxReturnsApiRequest.mock.calls.length).toBeLessThan(5);
      expect(mockFetchSubmissionStatusApiRequest.mock.calls.length).toBeLessThan(4);

      const { taxReturn, status } = result.current;

      const latestSubmission = getLatestSubmission(taxReturn);
      const expectedLatestSubmission = getLatestSubmission(REJECTED_SUBMISSION.taxReturn);

      expect(latestSubmission).not.toBeUndefined();
      expect(latestSubmission).toEqual(expectedLatestSubmission);
      expect(status).toEqual(REJECTED_SUBMISSION.status);
    }
  );

  it(
    `Given a pre-pending submission and backend data ready to refetch a rejected return,
stops polling as soon as actual status is returned`,
    { retry: 1 },
    async () => {
      mockFetchTaxReturnsApiRequest.mockReturnValue([REJECTED_SUBMISSION.taxReturn]);
      mockFetchSubmissionStatusApiRequest.mockReturnValue(REJECTED_SUBMISSION.status);

      const { result } = renderHook(HookRenderer, {
        wrapper: ({ children }) => (
          <Wrapper initialTaxReturn={PRE_PENDING_SUBMISSION.taxReturn} initialStatus={PRE_PENDING_SUBMISSION.status}>
            {children}
          </Wrapper>
        ),
      });

      await waitFor(
        () => {
          expect(result.current.hasFinishedPolling).toBeTruthy();
        },
        { timeout: 5000 }
      );

      // Exact number of invocations via .toHaveBeenCalledTimes() worked locally every time, but were flaky in CI.
      // Making this a little looser to avoid flaky tests
      expect(mockFetchTaxReturnsApiRequest.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockFetchSubmissionStatusApiRequest.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockFetchTaxReturnsApiRequest.mock.calls.length).toBeLessThan(3);
      expect(mockFetchSubmissionStatusApiRequest.mock.calls.length).toBeLessThan(3);

      const { taxReturn, status } = result.current;

      const latestSubmission = getLatestSubmission(taxReturn);
      const expectedLatestSubmission = getLatestSubmission(REJECTED_SUBMISSION.taxReturn);

      expect(latestSubmission).not.toBeUndefined();
      expect(latestSubmission).toEqual(expectedLatestSubmission);
      expect(status).toEqual(REJECTED_SUBMISSION.status);
    }
  );

  it(
    `Given a submission status that is likely out of date based on the tax returns submissions information,
refetches the updated status, but does not need to refetch tax returns`,
    { retry: 1 },
    async () => {
      mockFetchTaxReturnsApiRequest.mockReturnValue([REJECTED_SUBMISSION.taxReturn]);
      mockFetchSubmissionStatusApiRequest.mockReturnValue(REJECTED_SUBMISSION.status);

      const { result } = renderHook(HookRenderer, {
        wrapper: ({ children }) => (
          <Wrapper initialTaxReturn={REJECTED_SUBMISSION.taxReturn} initialStatus={PRE_PENDING_SUBMISSION.status}>
            {children}
          </Wrapper>
        ),
      });

      await waitFor(
        () => {
          expect(result.current.hasFinishedPolling).toBeTruthy();
        },
        { timeout: 5000 }
      );

      // Exact number of invocations via .toHaveBeenCalledTimes() worked locally every time, but were flaky in CI.
      // Making this a little looser to avoid flaky tests
      expect(mockFetchTaxReturnsApiRequest.mock.calls.length).toBeGreaterThanOrEqual(0);
      expect(mockFetchSubmissionStatusApiRequest.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockFetchTaxReturnsApiRequest.mock.calls.length).toBeLessThan(2);
      expect(mockFetchSubmissionStatusApiRequest.mock.calls.length).toBeLessThan(3);

      const { taxReturn, status } = result.current;

      const latestSubmission = getLatestSubmission(taxReturn);
      const expectedLatestSubmission = getLatestSubmission(REJECTED_SUBMISSION.taxReturn);

      expect(latestSubmission).not.toBeUndefined();
      expect(latestSubmission).toEqual(expectedLatestSubmission);
      expect(status).toEqual(REJECTED_SUBMISSION.status);
    }
  );

  const INITIAL_SUBMISSION: SubmissionTestData = {
    taxReturn: {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      taxYear: parseInt(CURRENT_TAX_YEAR),
      facts: {},
      taxReturnSubmissions: [
        {
          // Only one submission, not yet received
          id: uuidv4(),
          submitUserId: uuidv4(),
          createdAt: `2024-02-06T00:18:26.719+00:00`,
          submissionReceivedAt: null,
          receiptId: null,
        },
      ],
      isEditable: false,
      surveyOptIn: null,
    },
    status: {
      // Pending status immediately available, for some reason, despite submission NOT being received moments before
      status: FEDERAL_RETURN_STATUS.PENDING,
      rejectionCodes: [],
      createdAt: `2024-02-06T00:18:28.134+00:00`,
    },
  };

  const INITIAL_SUBMISSION_RECEIVED: SubmissionTestData = {
    taxReturn: {
      ...INITIAL_SUBMISSION.taxReturn,
      taxReturnSubmissions: [
        {
          ...INITIAL_SUBMISSION.taxReturn.taxReturnSubmissions[0],
          submissionReceivedAt: `2024-02-06T00:18:40.000+00:00`,
          receiptId: uuidv4(),
        },
      ],
    },
    status: INITIAL_SUBMISSION.status,
  };

  const INITIAL_SUBMISSION_ACCEPTED: SubmissionTestData = {
    taxReturn: INITIAL_SUBMISSION_RECEIVED.taxReturn,
    status: {
      // the accepted status, createdAt later than the submissionReceivedAt
      status: FEDERAL_RETURN_STATUS.ACCEPTED,
      rejectionCodes: [],
      createdAt: `2024-02-06T00:18:42.000+00:00`,
    },
  };

  it(
    `On initial submission, given an immediately accurate Pending status, poll until up-to-date status is found`,
    { retry: 1 },
    async () => {
      mockFetchTaxReturnsApiRequest
        .mockReturnValueOnce([INITIAL_SUBMISSION.taxReturn])
        .mockReturnValueOnce([INITIAL_SUBMISSION_RECEIVED.taxReturn])
        .mockReturnValue([INITIAL_SUBMISSION_ACCEPTED.taxReturn]);
      mockFetchSubmissionStatusApiRequest.mockReturnValue(INITIAL_SUBMISSION_ACCEPTED.status);

      const { result } = renderHook(HookRenderer, {
        wrapper: ({ children }) => (
          <Wrapper initialTaxReturn={INITIAL_SUBMISSION.taxReturn} initialStatus={INITIAL_SUBMISSION.status}>
            {children}
          </Wrapper>
        ),
      });

      await waitFor(
        () => {
          expect(result.current.hasFinishedPolling).toBeTruthy();
        },
        { timeout: 5000 }
      );

      // Exact number of invocations via .toHaveBeenCalledTimes() worked locally every time, but were flaky in CI.
      // Making this a little looser to avoid flaky tests
      expect(mockFetchTaxReturnsApiRequest.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(mockFetchSubmissionStatusApiRequest.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockFetchTaxReturnsApiRequest.mock.calls.length).toBeLessThan(4);
      expect(mockFetchSubmissionStatusApiRequest.mock.calls.length).toBeLessThan(3);

      const { taxReturn, status } = result.current;

      const latestSubmission = getLatestSubmission(taxReturn);
      const expectedLatestSubmission = getLatestSubmission(INITIAL_SUBMISSION_ACCEPTED.taxReturn);

      expect(latestSubmission).not.toBeUndefined();
      expect(latestSubmission).toEqual(expectedLatestSubmission);
      expect(status).toEqual(INITIAL_SUBMISSION_ACCEPTED.status);
    }
  );

  const INITIAL_SUBMISSION_ERROR: SubmissionTestData = {
    taxReturn: {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      taxYear: parseInt(CURRENT_TAX_YEAR),
      facts: {},
      taxReturnSubmissions: [
        {
          // Only one submission, not yet received, and never will due to Error
          id: uuidv4(),
          submitUserId: uuidv4(),
          createdAt: `2024-02-06T00:18:26.719+00:00`,
          submissionReceivedAt: null,
          receiptId: null,
        },
      ],
      isEditable: false,
      surveyOptIn: null,
    },
    status: {
      // Submission errored, did not submit to MeF, but showed success due to OK status from backend on submit
      status: FEDERAL_RETURN_STATUS.ERROR,
      rejectionCodes: [],
      createdAt: `2024-02-06T00:18:28.134+00:00`,
    },
  };

  const ERROR_RESUBMISSION: SubmissionTestData = {
    taxReturn: {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      taxYear: parseInt(CURRENT_TAX_YEAR),
      facts: {},
      taxReturnSubmissions: [
        // The initial submission, will never be received
        INITIAL_SUBMISSION_ERROR.taxReturn.taxReturnSubmissions[0],
        {
          // The resubmission, pending, not yet received
          id: uuidv4(),
          submitUserId: uuidv4(),
          createdAt: `2024-02-06T00:19:26.719+00:00`,
          submissionReceivedAt: null,
          receiptId: null,
        },
      ],
      isEditable: false,
      surveyOptIn: null,
    },
    // still returning the old Error status, because the Pending hasn't been acknowledged yet
    status: INITIAL_SUBMISSION_ERROR.status,
  };

  const ERROR_RESUBMISSION_PENDING: SubmissionTestData = {
    taxReturn: {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      taxYear: parseInt(CURRENT_TAX_YEAR),
      facts: {},
      taxReturnSubmissions: [
        // The initial submission, will never be received
        INITIAL_SUBMISSION_ERROR.taxReturn.taxReturnSubmissions[0],
        {
          // The resubmission, pending, now received
          ...ERROR_RESUBMISSION.taxReturn.taxReturnSubmissions[1],
          submissionReceivedAt: `2024-02-06T00:19:40.000+00:00`,
          receiptId: uuidv4(),
        },
      ],
      isEditable: false,
      surveyOptIn: null,
    },
    status: {
      status: FEDERAL_RETURN_STATUS.PENDING,
      rejectionCodes: [],
      createdAt: `2024-02-06T00:19:42.000+00:00`,
    },
  };

  const ERROR_RESUBMISSION_ACCEPTED: SubmissionTestData = {
    taxReturn: ERROR_RESUBMISSION_PENDING.taxReturn,
    status: {
      status: FEDERAL_RETURN_STATUS.ACCEPTED,
      rejectionCodes: [],
      createdAt: `2024-02-06T00:19:45.000+00:00`,
    },
  };

  it(
    `On initial submit, the return reaches a status of Error,
    should continue to poll until a resubmit with acknowledged status is found`,
    { retry: 1 },
    async () => {
      mockFetchTaxReturnsApiRequest
        .mockReturnValueOnce([INITIAL_SUBMISSION_ERROR.taxReturn])
        .mockReturnValueOnce([ERROR_RESUBMISSION.taxReturn])
        .mockReturnValueOnce([ERROR_RESUBMISSION_PENDING.taxReturn])
        .mockReturnValue([ERROR_RESUBMISSION_ACCEPTED.taxReturn]);
      mockFetchSubmissionStatusApiRequest
        .mockReturnValueOnce(ERROR_RESUBMISSION_PENDING.status)
        .mockReturnValue(ERROR_RESUBMISSION_ACCEPTED.status);

      const { result } = renderHook(HookRenderer, {
        wrapper: ({ children }) => (
          <Wrapper initialTaxReturn={INITIAL_SUBMISSION.taxReturn} initialStatus={INITIAL_SUBMISSION.status}>
            {children}
          </Wrapper>
        ),
      });

      await waitFor(
        () => {
          expect(result.current.hasFinishedPolling).toBeTruthy();
        },
        { timeout: 5000 }
      );

      // Exact number of invocations via .toHaveBeenCalledTimes() worked locally every time, but were flaky in CI.
      // Making this a little looser to avoid flaky tests
      expect(mockFetchTaxReturnsApiRequest.mock.calls.length).toBeGreaterThanOrEqual(3);
      expect(mockFetchSubmissionStatusApiRequest.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(mockFetchTaxReturnsApiRequest.mock.calls.length).toBeLessThan(5);
      expect(mockFetchSubmissionStatusApiRequest.mock.calls.length).toBeLessThan(4);

      const { taxReturn, status } = result.current;

      const latestSubmission = getLatestSubmission(taxReturn);
      const expectedLatestSubmission = getLatestSubmission(ERROR_RESUBMISSION_ACCEPTED.taxReturn);

      expect(latestSubmission).not.toBeUndefined();
      expect(latestSubmission).toEqual(expectedLatestSubmission);
      expect(status).toEqual(ERROR_RESUBMISSION_ACCEPTED.status);
    }
  );

  it(`Polls a maximum of 10 times when the return never leaves pre-pending status`, { retry: 1 }, async () => {
    mockFetchTaxReturnsApiRequest.mockReturnValue([PRE_PENDING_SUBMISSION.taxReturn]);

    const { result } = renderHook(HookRenderer, {
      wrapper: ({ children }) => (
        <Wrapper initialTaxReturn={PRE_PENDING_SUBMISSION.taxReturn} initialStatus={PRE_PENDING_SUBMISSION.status}>
          {children}
        </Wrapper>
      ),
    });

    await waitFor(
      () => {
        expect(result.current.hasFinishedPolling).toBeTruthy();
        expect(result.current.numPollsAttempted).toEqual(TEST_POLLING_MAXIMUM_ATTEMPTS);
      },
      { timeout: 5000 }
    );

    expect(mockFetchTaxReturnsApiRequest.mock.calls.length).toEqual(TEST_POLLING_MAXIMUM_ATTEMPTS);
    expect(mockFetchSubmissionStatusApiRequest.mock.calls.length).toEqual(0);

    const { taxReturn, status } = result.current;

    const latestSubmission = getLatestSubmission(taxReturn);
    const expectedLatestSubmission = getLatestSubmission(PRE_PENDING_SUBMISSION.taxReturn);

    expect(latestSubmission).not.toBeUndefined();
    expect(latestSubmission).toEqual(expectedLatestSubmission);
    expect(status).toEqual(PRE_PENDING_SUBMISSION.status);
  });

  it(`Polls a maximum of 10 times when the actual status never leaves pending status`, { retry: 1 }, async () => {
    mockFetchTaxReturnsApiRequest.mockReturnValue([PENDING_SUBMISSION.taxReturn]);
    mockFetchSubmissionStatusApiRequest.mockReturnValue(PENDING_SUBMISSION.status);

    const { result } = renderHook(HookRenderer, {
      wrapper: ({ children }) => (
        <Wrapper initialTaxReturn={PRE_PENDING_SUBMISSION.taxReturn} initialStatus={PRE_PENDING_SUBMISSION.status}>
          {children}
        </Wrapper>
      ),
    });

    await waitFor(
      () => {
        expect(result.current.hasFinishedPolling).toBeTruthy();
        expect(result.current.numPollsAttempted).toEqual(TEST_POLLING_MAXIMUM_ATTEMPTS);
      },
      { timeout: 5000 }
    );

    expect(mockFetchTaxReturnsApiRequest.mock.calls.length).toEqual(1);
    expect(mockFetchSubmissionStatusApiRequest.mock.calls.length).toEqual(TEST_POLLING_MAXIMUM_ATTEMPTS - 1);

    const { taxReturn, status } = result.current;

    const latestSubmission = getLatestSubmission(taxReturn);
    const expectedLatestSubmission = getLatestSubmission(PENDING_SUBMISSION.taxReturn);

    expect(latestSubmission).not.toBeUndefined();
    expect(latestSubmission).toEqual(expectedLatestSubmission);
    expect(status).toEqual(PENDING_SUBMISSION.status);
  });
});
